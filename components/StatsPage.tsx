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
    <section className="px-4 pb-28 pt-5 text-[#493343]">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e06f92]">Stats</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-[#3f2a39]">Your date history</h2>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[#9ee7d0] bg-[#dffbf1] p-4 shadow-xl shadow-[#1c8f79]/10">
          <p className="text-sm font-medium text-[#24866f]">Total picks</p>
          <p className="mt-2 text-3xl font-semibold">{totalPicks}</p>
        </div>
        <div className="rounded-lg border border-[#f3bfd0] bg-[#ffe8f0] p-4 shadow-xl shadow-[#e06f92]/10">
          <p className="text-sm font-medium text-[#d65b82]">Favorites</p>
          <p className="mt-2 text-3xl font-semibold">{favorites}</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <article key={item.id} className="flex items-center justify-between rounded-lg border border-[#f3bfd0] bg-white/75 p-4 shadow-xl shadow-[#e06f92]/10">
            <div>
              <p className="text-xs text-[#9a7187]">#{index + 1} / {item.type}</p>
              <h3 className="font-semibold tracking-tight text-[#3f2a39]">{item.name}</h3>
            </div>
            <span className="rounded-lg border border-[#ffd67d] bg-[#fff3bf] px-3 py-1 text-sm font-semibold text-[#8a6514]">{item.plays}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
