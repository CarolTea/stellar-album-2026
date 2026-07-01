import { MotionConfig } from "framer-motion";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useStore } from "./store";
import Shop from "./pages/Shop";
import Collection from "./pages/Collection";
import Album from "./pages/Album";
import Trade from "./pages/Trade";
import Guide from "./pages/Guide";
import { PackArt } from "./components/PackArt";

const NAV = [
  { to: "/", label: "Counter", end: true },
  { to: "/collection", label: "Collection" },
  { to: "/album", label: "Album" },
  { to: "/trade", label: "Trade" },
  { to: "/guide", label: "Guide" },
];

export default function App() {
  const { address, coin, packs, connect, disconnect, busy, error } = useStore();
  const location = useLocation();
  const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-30 border-b border-edge bg-kraft/90 backdrop-blur">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2.5">
            <div className="flex shrink-0 items-baseline gap-1.5">
              <span className="font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Stellar Album</span>
              <span className="text-leaf">✦</span>
            </div>

            {address && (
              <>
                <nav className="order-3 flex w-full flex-wrap justify-center gap-0.5 md:order-2 md:w-auto md:flex-1">
                  {NAV.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.end}
                      className={({ isActive }) =>
                        `rounded-full px-2.5 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf ${
                          isActive ? "bg-leaf-deep text-paper shadow-sm" : "text-ink-soft hover:bg-paper hover:text-ink"
                        }`
                      }
                    >
                      {n.label}
                    </NavLink>
                  ))}
                </nav>
                <div className="order-2 ml-auto flex shrink-0 items-center gap-1.5 text-sm md:order-3 md:ml-0">
                  <span className="inline-flex items-center gap-1 rounded-full bg-leaf-tint px-2.5 py-1 font-display font-bold text-leaf-deep tabular-nums">{coin} ⭐</span>
                  <span className="hidden rounded-full bg-paper px-2.5 py-1 text-ink-soft ring-1 ring-edge tabular-nums sm:inline-block">{packs} {packs === 1 ? "pack" : "packs"}</span>
                  <button
                    onClick={disconnect}
                    title="Disconnect wallet"
                    aria-label={`Disconnect wallet ${short(address)}`}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-xs text-ink-soft transition hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
                  >
                    <span className="hidden lg:inline">{short(address)}</span> <span aria-hidden>⏻</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {!address ? (
          <Routes location={location} key={location.pathname}>
            <Route path="/guide" element={<Guide />} />
            <Route path="*" element={<Landing connect={connect} busy={busy} error={error} />} />
          </Routes>
        ) : (
          // Plain Routes (no AnimatePresence exit-tracking): React unmounts the
          // old page and mounts the new one directly. Each Page still plays its
          // enter animation; we intentionally drop the route exit animation
          // because AnimatePresence's exit tracking could wedge on a nested,
          // mid-flight exit (e.g. the album tray emptying), pinning the old page
          // in the DOM and leaving the next page's content blank.
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Shop />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/album" element={<Album />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="*" element={<Shop />} />
          </Routes>
        )}
      </div>
    </MotionConfig>
  );
}

function Landing({ connect, busy, error }: { connect: () => void; busy?: string; error?: string }) {
  return (
    <section className="mx-auto max-w-xl px-6 py-20 text-center">
      <div className="mx-auto mb-10 w-fit" style={{ transform: "rotate(-6deg)" }}>
        <PackArt className="h-44 w-36 rounded-3xl shadow-xl" />
      </div>
      <h1 className="font-display text-4xl font-extrabold leading-tight text-ink sm:text-5xl">Collect the people who build Stellar.</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-soft">Claim coins, rip open packs of SDF stickers, press your favourites into an album that's yours alone — it can never be traded away — and swap your doubles. Live on Stellar testnet.</p>
      <button onClick={connect} disabled={!!busy} className="mt-8 rounded-full bg-leaf-deep px-7 py-3.5 font-display text-lg font-bold text-paper shadow-md transition hover:bg-leaf focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:opacity-50">
        {busy ? `${busy}…` : "Connect wallet to start"}
      </button>
      <p className="mt-3 text-xs text-ink-soft">Freighter, xBull, Lobstr, Albedo & more — on Testnet. We fund your account for you, no XLM needed.</p>
      <p className="mt-5 text-sm">
        <NavLink to="/guide" className="font-semibold text-leaf-deep underline-offset-4 hover:underline">New here? See how it works →</NavLink>
      </p>
      {error && <p className="mx-auto mt-5 max-w-md rounded-xl bg-paper px-4 py-3 text-sm text-ink ring-1 ring-edge">{error}</p>}
    </section>
  );
}
