"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ListItem } from "@/types";

type Props = {
  coupleId: string;
};

export default function StatsPage({ coupleId }: Props) {
  const [items, setItems] = useState<ListItem[]>([]);

  useEffect(() => {
    async function loadStats() {
      const { data } = await supabase
        .from("list_items")
        .select("*")
        .eq("couple_id", coupleId)
        .order("plays", { ascending: false });
      setItems((data ?? []) as ListItem[]);
    }
    loadStats();
  }, [coupleId]);

  const totalPicks = items.reduce((sum, item) => sum + item.plays, 0);
  const favorites = items.filter((item) => item.favorite).length;

  return (
    <section className="px-4 pb-28 pt-4 text-white">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.3em] text-pink-300/70">Stats</p>
        <h2 className="mt-1 text-3xl font-semibold">Your date history</h2>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-pink-500/10 p-4">
          <p className="text-sm text-pink-200/70">Total picks</p>
          <p className="mt-2 text-3xl font-semibold">{totalPicks}</p>
        </div>
        <div className="rounded-3xl bg-purple-500/10 p-4">
          <p className="text-sm text-purple-200/70">Favorites</p>
          <p className="mt-2 text-3xl font-semibold">{favorites}</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <article key={item.id} className="flex items-center justify-between rounded-3xl border border-white/10 bg-zinc-900 p-4">
            <div>
              <p className="text-xs text-zinc-500">#{index + 1} · {item.type}</p>
              <h3 className="font-medium">{item.name}</h3>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-zinc-300">{item.plays}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
