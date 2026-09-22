import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-navy px-6 py-24 text-white">
      <div className="w-full max-w-xl space-y-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber">BANJARA</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Travel, transport and stays across Pakistan
        </h1>
        <p className="text-sm text-slate-300">
          The public BANJARA experience lives here. For now, this space is reserved while the
          traveller-facing site is built.
        </p>
        <Link
          href="/admin"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-amber px-6 text-sm font-medium text-navy transition hover:bg-[#d97706] hover:text-white"
        >
          Go to Admin Portal
        </Link>
      </div>
    </main>
  );
}
