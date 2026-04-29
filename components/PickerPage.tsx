"use client";

import confetti from "canvas-confetti";
import { Heart, Shuffle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ListItem, ListType } from "@/types";

type Props = {
  coupleId: string;
};

type ActivitySection = {
  id: Extract<ListType, "home" | "fun" | "creative" | "food">;
  title: string;
  accent: string;
  bg: string;
  text: string;
  legacyTypes: ListType[];
};

const sections: ActivitySection[] = [
  {
    id: "home",
    title: "At home",
    accent: "text-[#c8976a]",
    bg: "bg-[#1c1814]",
    text: "text-[#ede0cf]",
    legacyTypes: ["movies", "boardgames", "videogames"],
  },
  {
    id: "fun",
    title: "Get out",
    accent: "text-[#5ba898]",
    bg: "bg-[#0f1e1b]",
    text: "text-[#d0e8e4]",
    legacyTypes: ["trails", "thriftstores"],
  },
  {
    id: "creative",
    title: "Make something",
    accent: "text-[#9b8dc8]",
    bg: "bg-[#18162a]",
    text: "text-[#ddd8f0]",
    legacyTypes: ["custom"],
  },
  {
    id: "food",
    title: "Let's eat",
    accent: "text-[#d97b54]",
    bg: "bg-[#1e120c]",
    text: "text-[#f0d8cc]",
    legacyTypes: ["restaurants"],
  },
];

function getSectionForItem(item: ListItem) {
  return sections.find((section) => item.type === section.id || section.legacyTypes.includes(item.type)) ?? sections[0];
}

export default function PickerPage({ coupleId }: Props) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [winner, setWinner] = useState<ListItem | null>(null);
  const pickChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    async function loadItems() {
      const { data } = await supabase
        .from("list_items")
        .select("*")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });

      setItems((data ?? []) as ListItem[]);
    }

    loadItems();

    const listChannel = supabase
      .channel(`activities-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "list_items", filter: `couple_id=eq.${coupleId}` },
        loadItems
      )
      .subscribe();

    const pickChannel = supabase
      .channel(`couple-picks-${coupleId}`)
      .on("broadcast", { event: "pick" }, ({ payload }) => {
        if (typeof payload?.id !== "string" || typeof payload?.name !== "string") return;
        setWinner({
          id: payload.id,
          name: payload.name,
          couple_id: coupleId,
          type: payload.type ?? "custom",
          plays: payload.plays ?? 0,
          favorite: payload.favorite ?? false,
          created_at: payload.created_at ?? new Date().toISOString(),
        });
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.65 } });
      })
      .subscribe();

    pickChannelRef.current = pickChannel;

    return () => {
      pickChannelRef.current = null;
      supabase.removeChannel(listChannel);
      supabase.removeChannel(pickChannel);
    };
  }, [coupleId]);

  const pickedItems = useMemo(() => {
    return items.filter((item) => item.plays > 0).sort((a, b) => b.plays - a.plays);
  }, [items]);

  async function toggleFavorite(item: ListItem) {
    await supabase.from("list_items").update({ favorite: !item.favorite }).eq("id", item.id);
  }

  async function pickItem(item: ListItem) {
    const nextPlays = item.plays + 1;
    setWinner({ ...item, plays: nextPlays });
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.65 } });

    await supabase.from("list_items").update({ plays: nextPlays }).eq("id", item.id);

    await pickChannelRef.current?.send({
      type: "broadcast",
      event: "pick",
      payload: { ...item, plays: nextPlays },
    });
  }

  function pickRandom() {
    if (!pickedItems.length) return;
    const randomItem = pickedItems[Math.floor(Math.random() * pickedItems.length)];
    pickItem(randomItem);
  }

  return (
    <section className="px-4 pb-36 pt-5 text-white">
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-teal-200/70">Picked list</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Activities</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">Activities appear here after you tap pick from the Lists tab.</p>
      </div>

      <div className="space-y-3">
        {pickedItems.length ? (
          pickedItems.map((item) => {
            const section = getSectionForItem(item);

            return (
              <article key={item.id} className={`rounded-lg border border-white/10 p-4 shadow-xl shadow-black/20 ${section.bg}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleFavorite(item)}
                    className={`rounded-lg p-2 transition hover:bg-white/10 ${section.accent}`}
                    aria-label={item.favorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
                  >
                    <Heart size={19} fill={item.favorite ? "currentColor" : "none"} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[0.62rem] font-medium uppercase tracking-[0.2em] opacity-60 ${section.accent}`}>{section.title}</p>
                    <h3 className={`truncate text-sm font-medium ${section.text}`}>{item.name}</h3>
                  </div>
                  <button onClick={() => pickItem(item)} className={`rounded px-3 py-2 text-xs font-medium ${section.accent} bg-white/[0.055]`}>
                    pick
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.025] p-8 text-center text-sm text-zinc-500">
            No picked activities yet. Open Lists, choose a category, and tap pick on a date idea.
          </div>
        )}
      </div>

      {winner && (
        <div className="mt-6 rounded-lg border border-teal-300/20 bg-teal-300/10 p-5 text-center shadow-2xl shadow-black/30">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-100/70">Tonight's pick</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">{winner.name}</h3>
        </div>
      )}

      <div className="safe-bottom fixed bottom-[73px] left-0 right-0 z-40 border-t border-white/10 bg-zinc-950/90 p-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <button
            onClick={pickRandom}
            disabled={!pickedItems.length}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-300 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Shuffle size={18} />
            Pick random
          </button>
        </div>
      </div>
    </section>
  );
}
