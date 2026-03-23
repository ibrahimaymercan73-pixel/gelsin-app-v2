"use client";

import { FormEvent, useMemo, useState } from "react";

const MOODS = ["Dertliyim", "Enerjiğim", "Aşığım", "Hesap Ödeyeceğim"] as const;

export default function GuestPage() {
  const [name, setName] = useState("");
  const [mood, setMood] = useState<(typeof MOODS)[number]>("Dertliyim");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prophecy, setProphecy] = useState<string | null>(null);

  const canSubmit = useMemo(() => name.trim().length > 0 && !loading, [name, loading]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setProphecy(null);

    try {
      const response = await fetch("/api/prophecy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mood,
          question: question.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { prophecy?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Bir seyler ters gitti.");
      }

      setProphecy(data.prophecy ?? "Kehanet alinamadi.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bilinmeyen hata.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <section className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-2xl shadow-black/40">
        <h1 className="text-center text-2xl font-bold tracking-wide">Rosinante Kehaneti</h1>
        <p className="text-center text-sm text-zinc-400">
          İsmini yaz, modunu seç, istersen bir soru ekle. Atın sana yol göstersin.
        </p>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1">
            <span className="text-sm text-zinc-300">İsim</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none ring-0 transition focus:border-indigo-400"
              placeholder="Adın ne yiğidim?"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-zinc-300">Mod</span>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value as (typeof MOODS)[number])}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none ring-0 transition focus:border-indigo-400"
            >
              {MOODS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-zinc-300">Serbest Soru (opsiyonel)</span>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-24 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none ring-0 transition focus:border-indigo-400"
              placeholder="Gönlünde ne varsa sor..."
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            {loading ? "Kehanet geliyor..." : "Kehaneti Al"}
          </button>
        </form>

        {error ? <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-300">{error}</p> : null}

        {prophecy ? (
          <article className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-300">Son Kehanet</h2>
            <p className="text-base leading-relaxed text-amber-100">{prophecy}</p>
          </article>
        ) : null}
      </section>
    </main>
  );
}
