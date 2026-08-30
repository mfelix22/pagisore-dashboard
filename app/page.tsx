import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(88,101,242,0.18),transparent_60%)]" />

      <main className="relative z-10 w-full max-w-3xl">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#5865f2]">
            PAGISORE
          </p>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-[#f2f3f5] sm:text-5xl">
            Guild Dashboard
          </h1>
          <p className="mx-auto max-w-lg text-[#b5bac1]">
            Manage Emperium Overrun attendance and member activities all in one place.
          </p>
        </div>

        <nav className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <Link
            href="/eo"
            className="group relative overflow-hidden rounded-2xl bg-[#2b2d31] p-6 shadow-lg ring-1 ring-white/5 transition hover:-translate-y-1 hover:bg-[#313338] hover:shadow-xl hover:ring-[#5865f2]/30"
          >
            <span className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-[#5865f2]/10 blur-2xl transition group-hover:bg-[#5865f2]/20" />
            <div className="relative mb-3 h-10 w-10 rounded-xl bg-[#5865f2]/20 p-2.5 text-[#5865f2]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 21l18-9L3 3v7l14 2-14 2v7z" />
              </svg>
            </div>
            <h2 className="relative text-lg font-bold text-[#f2f3f5]">
              Emperium Overrun
            </h2>
            <p className="relative mt-1 text-sm text-[#b5bac1]">
              Track EO schedules and signups.
            </p>
          </Link>

          <Link
            href="/members"
            className="group relative overflow-hidden rounded-2xl bg-[#2b2d31] p-6 shadow-lg ring-1 ring-white/5 transition hover:-translate-y-1 hover:bg-[#313338] hover:shadow-xl hover:ring-[#5865f2]/30"
          >
            <span className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-[#5865f2]/10 blur-2xl transition group-hover:bg-[#5865f2]/20" />
            <div className="relative mb-3 h-10 w-10 rounded-xl bg-[#5865f2]/20 p-2.5 text-[#5865f2]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 className="relative text-lg font-bold text-[#f2f3f5]">Members</h2>
            <p className="relative mt-1 text-sm text-[#b5bac1]">
              Browse and manage guild member profiles.
            </p>
          </Link>

          <Link
            href="/settings"
            className="group relative overflow-hidden rounded-2xl bg-[#2b2d31] p-6 shadow-lg ring-1 ring-white/5 transition hover:-translate-y-1 hover:bg-[#313338] hover:shadow-xl hover:ring-[#5865f2]/30"
          >
            <span className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-[#5865f2]/10 blur-2xl transition group-hover:bg-[#5865f2]/20" />
            <div className="relative mb-3 h-10 w-10 rounded-xl bg-[#5865f2]/20 p-2.5 text-[#5865f2]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H8a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <h2 className="relative text-lg font-bold text-[#f2f3f5]">Settings</h2>
            <p className="relative mt-1 text-sm text-[#b5bac1]">
              Edit attendance message templates.
            </p>
          </Link>
        </nav>
      </main>
    </div>
  );
}
