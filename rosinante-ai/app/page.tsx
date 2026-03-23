export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <section className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center">
        <h1 className="text-3xl font-bold">Rosinante AI</h1>
        <p className="mt-3 text-zinc-300">Kullanım için sayfalardan birine geç:</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <a className="rounded-xl bg-indigo-500 px-4 py-3 font-semibold hover:bg-indigo-400" href="/guest">
            /guest
          </a>
          <a className="rounded-xl bg-zinc-800 px-4 py-3 font-semibold hover:bg-zinc-700" href="/screen">
            /screen
          </a>
        </div>
      </section>
    </main>
  );
}
