import { Button } from "@reworth/ui-web";

export default function HomePage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[var(--rw-bg)] text-[var(--rw-ink)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rw-hero-glow"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 20%, rgba(14,159,110,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 15% 80%, rgba(201,162,39,0.12), transparent 50%), linear-gradient(165deg, #FAF9F7 0%, #F3F0EA 45%, #E8F5EF 100%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")",
          mixBlendMode: "multiply",
        }}
      />

      <header className="relative z-10 sr-only">
        <h1>ReWorth</h1>
      </header>

      <section
        aria-label="ReWorth introduction"
        className="relative z-10 flex min-h-[100dvh] flex-col justify-end px-6 pb-16 pt-24 sm:justify-center sm:px-12 lg:px-20"
      >
        <div className="max-w-3xl">
          <p className="rw-fade-up font-[family-name:var(--font-geist-sans)] text-[clamp(3.5rem,12vw,7.5rem)] font-semibold leading-[0.95] tracking-tight text-[var(--rw-ink)]">
            ReWorth
          </p>
          <p className="rw-fade-up-delay mt-6 max-w-xl text-lg leading-relaxed text-[var(--rw-ink-muted)] sm:text-xl">
            Lagos, your unused things are worth something.
          </p>
          <div className="rw-fade-up-delay mt-10">
            <Button
              variant="sell"
              size="lg"
              aria-label="Start selling on ReWorth"
            >
              SELL
            </Button>
          </div>
        </div>
      </section>

      <aside
        aria-hidden
        className="pointer-events-none absolute right-[-8%] top-[12%] hidden h-[70%] w-[48%] md:block"
      >
        <div
          className="h-full w-full rounded-l-[3rem] opacity-90"
          style={{
            background:
              "linear-gradient(145deg, rgba(14,159,110,0.35) 0%, rgba(17,19,21,0.08) 40%, rgba(201,162,39,0.25) 100%)",
            boxShadow: "inset 0 0 80px rgba(250,249,247,0.4)",
          }}
        />
        <img
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%230E9F6E' stop-opacity='0.5'/%3E%3Cstop offset='1' stop-color='%23C9A227' stop-opacity='0.35'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='1000' fill='%23FAF9F7'/%3E%3Ccircle cx='420' cy='380' r='220' fill='url(%23g)'/%3E%3Crect x='180' y='520' width='320' height='220' rx='28' fill='%23111315' fill-opacity='0.08'/%3E%3Crect x='240' y='580' width='200' height='28' rx='8' fill='%230E9F6E' fill-opacity='0.55'/%3E%3Crect x='240' y='630' width='140' height='18' rx='6' fill='%23111315' fill-opacity='0.2'/%3E%3C/svg%3E"
          alt=""
          className="absolute inset-0 h-full w-full object-cover rounded-l-[3rem] mix-blend-multiply opacity-80"
        />
      </aside>
    </main>
  );
}
