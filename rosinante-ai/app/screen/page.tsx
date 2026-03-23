"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProphecyRow = {
  id: string;
  name: string;
  mood: string;
  question: string | null;
  prophecy: string;
  created_at: string;
};

export default function ScreenPage() {
  const [items, setItems] = useState<ProphecyRow[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      const { data } = await supabase
        .from("prophecies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (mounted && data) {
        setItems(data as ProphecyRow[]);
      }
    }

    loadInitial();

    const channel = supabase
      .channel("prophecies-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prophecies" },
        (payload) => {
          const next = payload.new as ProphecyRow;
          setItems((prev) => [next, ...prev].slice(0, 20));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const latest = items[0];
  const faded = useMemo(() => items.slice(1, 8), [items]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#3730a3_0%,_transparent_55%)] opacity-25" />

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-10">
        {latest ? (
          <article className="rounded-3xl border border-zinc-700 bg-zinc-900/70 p-10 text-center shadow-2xl shadow-black/50 transition-all duration-500">
            <p className="mb-2 text-sm uppercase tracking-[0.3em] text-amber-300">Son Kehanet</p>
            <h1 className="mb-6 text-2xl font-semibold text-indigo-200 md:text-4xl">
              {latest.name} • {latest.mood}
            </h1>
            <p className="mx-auto max-w-4xl text-3xl leading-tight font-bold text-amber-100 md:text-6xl">
              {latest.prophecy}
            </p>
          </article>
        ) : (
          <article className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-10 text-center">
            <p className="text-2xl text-zinc-300 md:text-4xl">Yeni kehanet bekleniyor...</p>
          </article>
        )}

        <div className="mt-10 grid grid-cols-1 gap-4 opacity-35 md:grid-cols-2">
          {faded.map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                {item.name} • {item.mood}
              </p>
              <p className="mt-2 text-lg text-zinc-300">{item.prophecy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
