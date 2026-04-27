"use client";

import confetti from "canvas-confetti";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ListItem, ListType } from "@/types";
import CategoryTabs from "@/components/CategoryTabs";
import PickerWheel from "@/components/PickerWheel";

type Props = {
  coupleId: string;
};

export default function PickerPage({ coupleId }: Props) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [type, setType] = useState<ListType>("movies");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    async function loadItems() {
      const { data } = await supabase
        .from("list_items")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("type", type)
        .order("created_at", { ascending: false });
      setItems((data ?? []) as ListItem[]);
    }

    loadItems();

    const channel = supabase
      .channel(`picker-${coupleId}-${type}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "list_items", filter: `couple_id=eq.${coupleId}` },
        loadItems
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, type]);

  const pickerItems = useMemo(() => {
    return (favoritesOnly ? items.filter((item) => item.favorite) : items).map((item) => item.name);
  }, [favoritesOnly, items]);

  async function handlePick(name: string) {
    setWinner(name);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.65 } });

    const item = items.find((entry) => entry.name === name);
    if (item) {
      await supabase
        .from("list_items")
        .update({ plays: item.plays + 1 })
        .eq("id", item.id);
    }
  }

  return (
    <section className="px-4 pb-28 pt-4">
      <div className="mb-5">
        <p className="text-sm uppercase tracking-[0.3em] text-pink-300/70">Tonight</p>
        <h2 className="mt-1 text-3xl font-semibold text-white">Picker</h2>
      </div>

      <CategoryTabs selected={type} onChange={setType} />

      <div className="mb-6 flex rounded-full bg-white/5 p-1">
        <button
          onClick={() => setFavoritesOnly(false)}
          className={`flex-1 rounded-full py-2 text-sm ${!favoritesOnly ? "bg-pink-500 text-white" : "text-zinc-400"}`}
        >
          All
        </button>
        <button
          onClick={() => setFavoritesOnly(true)}
          className={`flex-1 rounded-full py-2 text-sm ${favoritesOnly ? "bg-pink-500 text-white" : "text-zinc-400"}`}
        >
          Favorites ❤️
        </button>
      </div>

      <PickerWheel items={pickerItems} onPick={handlePick} />

      {winner && (
        <div className="mt-8 rounded-3xl border border-pink-400/20 bg-pink-500/10 p-5 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-pink-200/70">Tonight's pick</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{winner}</h3>
        </div>
      )}
    </section>
  );
}
