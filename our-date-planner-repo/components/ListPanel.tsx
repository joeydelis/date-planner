"use client";

import { useEffect, useState } from "react";
import { Heart, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ListItem, ListType } from "@/types";
import CategoryTabs from "@/components/CategoryTabs";
import Toast from "@/components/Toast";

type Props = {
  coupleId: string;
  favoritesOnly?: boolean;
};

export default function ListPanel({ coupleId, favoritesOnly = false }: Props) {
  const [type, setType] = useState<ListType>("movies");
  const [items, setItems] = useState<ListItem[]>([]);
  const [name, setName] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel(`list-items-${coupleId}-${type}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "list_items", filter: `couple_id=eq.${coupleId}` },
        fetchItems
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, type]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function fetchItems() {
    const { data, error } = await supabase
      .from("list_items")
      .select("*")
      .eq("couple_id", coupleId)
      .eq("type", type)
      .order("created_at", { ascending: false });

    if (!error) setItems((data ?? []) as ListItem[]);
  }

  async function addItem() {
    const trimmed = name.trim();
    if (!trimmed) return;

    const { error } = await supabase.from("list_items").insert({
      couple_id: coupleId,
      type,
      name: trimmed,
      plays: 0,
      favorite: false,
    });

    if (error) {
      notify("Could not add item");
      return;
    }

    setName("");
    notify("Added");
    fetchItems();
  }

  async function toggleFavorite(item: ListItem) {
    await supabase.from("list_items").update({ favorite: !item.favorite }).eq("id", item.id);
    fetchItems();
  }

  async function increment(item: ListItem) {
    await supabase.from("list_items").update({ plays: item.plays + 1 }).eq("id", item.id);
    fetchItems();
  }

  async function deleteItem(item: ListItem) {
    await supabase.from("list_items").delete().eq("id", item.id);
    notify("Deleted");
    fetchItems();
  }

  const shownItems = favoritesOnly ? items.filter((item) => item.favorite) : items;

  return (
    <section className="px-4 pb-28 pt-4 text-white">
      <Toast message={toast} />

      <div className="mb-4">
        <p className="text-sm uppercase tracking-[0.3em] text-pink-300/70">Our Date Planner</p>
        <h2 className="mt-1 text-3xl font-semibold">{favoritesOnly ? "Favorites" : "Lists"}</h2>
      </div>

      <CategoryTabs selected={type} onChange={setType} />

      {!favoritesOnly && (
        <div className="mb-4 flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addItem();
            }}
            placeholder="Add a new idea..."
            className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-zinc-500"
          />
          <button onClick={addItem} className="rounded-xl bg-pink-500 p-3 text-white">
            <Plus size={18} />
          </button>
        </div>
      )}

      <div className="space-y-3">
        {shownItems.length ? (
          shownItems.map((item) => (
            <article key={item.id} className="rounded-3xl border border-white/10 bg-zinc-900 p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleFavorite(item)} className="text-pink-400">
                  <Heart size={20} fill={item.favorite ? "currentColor" : "none"} />
                </button>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">{item.name}</h3>
                  <p className="text-xs text-zinc-500">Picked {item.plays} times</p>
                </div>
                <button onClick={() => increment(item)} className="rounded-full bg-white/5 px-3 py-1 text-sm text-zinc-300">
                  +1
                </button>
                <button onClick={() => deleteItem(item)} className="text-zinc-500 hover:text-red-400">
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-500">
            {favoritesOnly ? "No favorites yet." : "Nothing here yet. Add your first idea."}
          </div>
        )}
      </div>
    </section>
  );
}
