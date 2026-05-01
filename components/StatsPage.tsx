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

    const channel = supabase
      .channel(`stats-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "list_items", filter: `couple_id=eq.${coupleId}` },
        loadStats
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  const totalPicks = items.reduce((sum, item) => sum + item.plays, 0);
  const favorites = items.filter((item) => item.favorite).length;

  return (
    <section className="px-4 pb-36 pt-6 text-[#edf3ff]">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#68e7ff]">Stats</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white">Your date history</h2>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="app-card rounded-[1.5rem] p-4">
          <p className="text-sm font-medium text-[#68e7ff]">Total picks</p>
          <p className="mt-2 text-3xl font-semibold">{totalPicks}</p>
        </div>
        <div className="app-card rounded-[1.5rem] p-4">
          <p className="text-sm font-medium text-[#c7a0ff]">Favorites</p>
          <p className="mt-2 text-3xl font-semibold">{favorites}</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <article key={item.id} className="flex items-center justify-between rounded-[1.35rem] border border-white/10 bg-[#0f1422]/82 p-4 shadow-xl shadow-black/20">
            <div>
              <p className="text-xs text-[#8d98ad]">#{index + 1} / {item.type}</p>
              <h3 className="font-semibold tracking-tight text-white">{item.name}</h3>
            </div>
            <span className="rounded-xl border border-[#68e7ff]/18 bg-[#68e7ff]/12 px-3 py-1 text-sm font-semibold text-[#68e7ff]">{item.plays}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
