import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { connect as walletConnect, restore as walletRestore, disconnect as walletDisconnect } from "./lib/wallet";
import { ensureFunded } from "./lib/friendbot";
import { makeClients } from "./lib/clients";
import { TYPES, PACK_SIZE } from "./lib/catalog";

type Clients = ReturnType<typeof makeClients>;

/** An open escrow offer, flattened for the UI. */
export interface Offer {
  id: string;
  maker: string;
  give: number;
  want: number;
}

/** One revealed sticker. `isNew` = its type isn't pasted in the album yet. */
export interface RevealCard {
  type: number;
  isNew: boolean;
}

/** The result of opening one or more packs, for the cinematic reveal. */
export interface RevealState {
  /** Cards grouped by pack, in draw order (each inner array is one pack). */
  packs: RevealCard[][];
}

/** Best-effort human message from any thrown value. Wallets often reject with a
 *  plain object (not an Error), so `String(e)` would give "[object Object]";
 *  dig for a message field and fall back to JSON before giving up. */
function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    if (typeof o.message === "string" && o.message) return o.message;
    if (typeof o.error === "string" && o.error) return o.error;
    const inner = o.error as Record<string, unknown> | undefined;
    if (inner && typeof inner.message === "string" && inner.message) return inner.message;
    try {
      const j = JSON.stringify(e);
      if (j && j !== "{}") return j;
    } catch {
      /* circular / non-serializable — fall through */
    }
  }
  return String(e);
}

/** Turn a raw wallet/chain exception into plain language for the UI. The
 *  technical detail still goes to the console for debugging. */
function friendlyError(e: unknown): string {
  console.error(e); // eslint-disable-line no-console -- full object aids debugging
  const raw = messageOf(e);
  // Scan the human message *and* a deep dump: the giveaway keyword (e.g.
  // "declined") is sometimes only in a nested field of the thrown object.
  let dump = "";
  try {
    dump = JSON.stringify(e);
  } catch {
    /* ignore */
  }
  const m = `${raw} ${dump}`.toLowerCase();
  if (/(declin|reject|denied|cancel|user.*close)/.test(m)) return "You cancelled the request in your wallet.";
  if (/(no wallet|not found|no module|not installed|install)/.test(m)) return "No Stellar wallet found. Install Freighter (or another) to continue.";
  if (/(not enough|insufficient|balance)/.test(m)) return "You don't have enough for that.";
  if (/(timeout|timed out|abort)/.test(m)) return "Wallet took too long — please try again.";
  if (/(fetch|network|connection|econnrefused|econnreset|enotfound)/.test(m)) return "Network issue — retrying…";
  if (/(rpc|horizon|status 5\d\d)/.test(m)) return "Stellar node is busy — retrying…";
  if (/(revert|status=|failed|trap|panic)/.test(m)) return "That transaction didn't go through. Please try again.";
  // Never surface "[object Object]" or an empty blob to the user.
  return raw && raw !== "[object Object]" && raw !== "{}" ? raw : "Something went wrong. Please try again.";
}

async function readCollection(c: Clients, owner: string): Promise<number[]> {
  return Promise.all(
    TYPES.map((t) => c.sticker.balance({ owner, sticker_type: t }).then((r) => Number(r.result))),
  );
}

async function readOffers(c: Clients): Promise<Offer[]> {
  const r = await c.escrow.offers();
  return r.result.map((o) => ({ id: String(o.id), maker: o.maker, give: o.give_type, want: o.want_type }));
}

export interface Store {
  address?: string;
  coin: number;
  packs: number;
  collection: number[];
  pasted: boolean[];
  offers: Offer[];
  hasAlbum: boolean;
  claimAt: number;
  busy?: string;
  error?: string;
  reveal?: RevealState;
  /** True while an open() is in flight, before the reveal data lands. */
  opening: boolean;
  packBought: boolean;
  retryFn?: () => void;
  connect(): Promise<void>;
  disconnect(): void;
  clearError(): void;
  claim(): Promise<void>;
  buy(): Promise<void>;
  open(): Promise<void>;
  dismissReveal(): void;
  dismissPackBought(): void;
  openAlbum(): Promise<void>;
  paste(t: number): Promise<boolean>;
  createOffer(give: number, want: number): Promise<string | undefined>;
  acceptOffer(id: string): Promise<void>;
  cancelOffer(id: string): Promise<void>;
  reloadOffers(): Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used within StoreProvider");
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string>();
  const [clients, setClients] = useState<Clients>();
  const [coin, setCoin] = useState(0);
  const [packs, setPacks] = useState(0);
  const [collection, setCollection] = useState<number[]>([]);
  const [pasted, setPasted] = useState<boolean[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [hasAlbum, setHasAlbum] = useState(false);
  const [claimAt, setClaimAt] = useState(0);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [reveal, setReveal] = useState<RevealState>();
  const [opening, setOpening] = useState(false);
  const [packBought, setPackBought] = useState(false);
  const [retryFn, setRetryFn] = useState<(() => Promise<void>) | undefined>();

  async function refresh(c: Clients, addr: string): Promise<number[]> {
    const [coinR, packR, lastR, cdR, hasAlbumR] = await Promise.all([
      c.coin.balance({ account: addr }),
      c.pack.balance({ owner: addr }),
      c.faucet.last_claim({ claimer: addr }),
      c.faucet.cooldown(),
      c.album.has_album({ owner: addr }),
    ]);
    setCoin(Number(coinR.result));
    setPacks(Number(packR.result));
    setClaimAt(Number(lastR.result) === 0 ? 0 : Number(lastR.result) + Number(cdR.result));
    setHasAlbum(Boolean(hasAlbumR.result));
    const [coll, past, offs] = await Promise.all([
      readCollection(c, addr),
      Promise.all(TYPES.map((t) => c.album.is_pasted({ owner: addr, sticker_type: t }).then((r) => Boolean(r.result)))),
      readOffers(c),
    ]);
    setCollection(coll);
    setPasted(past);
    setOffers(offs);
    return coll;
  }

  async function run<T>(label: string, fn: (c: Clients, addr: string) => Promise<T>): Promise<T | undefined> {
    if (!clients || !address) return undefined;
    setBusy(label);
    setError(undefined);
    setRetryFn(undefined);
    try {
      const result = await fn(clients, address);
      setRetryFn(undefined);
      return result;
    } catch (e) {
      setError(friendlyError(e));
      // Store a retry callback so the Toast can offer a manual retry.
      // Manual retry is safe — the user explicitly chose to re-attempt.
      const capturedFn = fn;
      setRetryFn(() => () => run(label, capturedFn).then(() => undefined));
      return undefined;
    } finally {
      setBusy(undefined);
    }
  }

  const connect = async () => {
    setBusy("Connecting");
    setError(undefined);
    setRetryFn(undefined);
    try {
      const addr = await walletConnect();
      await ensureFunded(addr);
      const c = makeClients(addr);
      setAddress(addr);
      setClients(c);
      await refresh(c, addr);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(undefined);
    }
  };

  const disconnect = () => {
    walletDisconnect();
    setAddress(undefined);
    setClients(undefined);
    setCoin(0);
    setPacks(0);
    setCollection([]);
    setPasted([]);
    setOffers([]);
    setHasAlbum(false);
    setClaimAt(0);
    setError(undefined);
    setReveal(undefined);
    setOpening(false);
    setRetryFn(undefined);
  };

  // On load, silently re-establish a previously-connected wallet session so a
  // page refresh doesn't force the user to reconnect. No-op if there's no saved
  // session (or it can't be restored), in which case the connect screen shows.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const addr = await walletRestore();
      if (!addr || cancelled) return;
      setBusy("Reconnecting");
      try {
        const c = makeClients(addr);
        setAddress(addr);
        setClients(c);
        await refresh(c, addr);
      } catch {
        /* leave on the connect screen */
      } finally {
        if (!cancelled) setBusy(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendThen = (label: string, build: (c: Clients, addr: string) => Promise<{ signAndSend(): Promise<unknown> }>) =>
    run(label, async (c, addr) => {
      await (await build(c, addr)).signAndSend();
      await refresh(c, addr);
    }).then(() => undefined);

  const claim = () => sendThen("Claiming coins", (c, addr) => c.faucet.claim({ claimer: addr }));
  const buy = async () => {
    // Client-side pre-check (issue #14): surface a clear message instead of the
    // token contract's opaque panic when the buyer can't afford a pack.
    if (coin < 100) {
      setError("Not enough coins — claim some first!");
      return;
    }
    // Only celebrate if the purchase actually went through. `run` swallows
    // errors (e.g. the user rejecting the wallet prompt) and resolves to
    // undefined, so gate the confetti on a truthy result — otherwise a
    // cancelled buy would still pop the "pack bought!" modal over the error.
    const ok = await run("Buying a pack", async (c, addr) => {
      await (await c.store.buy_pack({ buyer: addr })).signAndSend();
      await refresh(c, addr);
      return true;
    });
    if (ok) setPackBought(true);
  };
  const dismissPackBought = () => setPackBought(false);
  const openAlbum = () => sendThen("Binding album", (c, addr) => c.album.open_album({ owner: addr }));
  const paste = (t: number) =>
    run("Pasting", async (c, addr) => {
      await (await c.album.paste({ owner: addr, sticker_type: t })).signAndSend();
      await refresh(c, addr);
      return true;
    }).then((ok) => ok === true);
  const acceptOffer = (id: string) => sendThen("Accepting offer", (c, addr) => c.escrow.accept_offer({ taker: addr, offer_id: BigInt(id) }));
  const cancelOffer = (id: string) => sendThen("Taking it back", (c) => c.escrow.cancel_offer({ offer_id: BigInt(id) }));

  const open = async () => {
    setReveal(undefined);
    setOpening(true);
    await run("Ripping the pack", async (c, addr) => {
      const sent = await (await c.pack.open({ opener: addr })).signAndSend();
      const resp = sent.getTransactionResponse as unknown as { status?: string };
      if (resp?.status && resp.status !== "SUCCESS") throw new Error(`pack reveal reverted on-chain (status=${resp.status})`);
      // Use the contract's ordered return value — a balance diff can't preserve
      // draw order or per-pack grouping, both of which the reveal needs.
      const result = sent.result as Array<number | bigint> | undefined;
      const types = (Array.isArray(result) ? result : []).map(Number);
      if (types.length === 0) throw new Error("pack revealed but no stickers were returned");
      const flat: RevealCard[] = types.map((t) => ({ type: t, isNew: !pasted[t] }));
      const grouped: RevealCard[][] = [];
      for (let i = 0; i < flat.length; i += PACK_SIZE) grouped.push(flat.slice(i, i + PACK_SIZE));
      setReveal({ packs: grouped });
      // The reveal already succeeded and is showing — a transient error refreshing
      // balances shouldn't surface as an "open failed" toast.
      try {
        await refresh(c, addr);
      } catch (e) {
        console.error(e); // eslint-disable-line no-console
      }
    });
    setOpening(false);
  };

  const dismissReveal = () => setReveal(undefined);

  const reloadOffers = async () => {
    if (clients) setOffers(await readOffers(clients));
  };

  const createOffer = (give: number, want: number) =>
    run("Putting it on the table", async (c, addr) => {
      const sent = await (await c.escrow.create_offer({ maker: addr, give_type: give, want_type: want })).signAndSend();
      let id = "?";
      try {
        id = String(sent.result);
      } catch {
        /* best-effort id */
      }
      await refresh(c, addr);
      return id;
    });

  const value: Store = {
    address, coin, packs, collection, pasted, offers, hasAlbum, claimAt, busy, error, reveal, opening, packBought, retryFn,
    connect, disconnect, clearError: () => setError(undefined), claim, buy, open, dismissReveal, dismissPackBought, openAlbum, paste, createOffer, acceptOffer, cancelOffer, reloadOffers,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
