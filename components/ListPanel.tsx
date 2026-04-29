"use client";

import { Heart, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ListItem, ListType } from "@/types";
import Toast from "@/components/Toast";

type Props = {
  coupleId: string;
  favoritesOnly?: boolean;
};

type DateSection = {
  id: Extract<ListType, "home" | "fun" | "creative" | "food">;
  eyebrow: string;
  title: string;
  description: string;
  bg: string;
  glow: string;
  border: string;
  accent: string;
  text: string;
  legacyTypes: ListType[];
};

const sections: DateSection[] = [
  {
    id: "home",
    eyebrow: "Stay at home",
    title: "At home",
    description: "Cozy nights, games, movies, and low-key plans without leaving the house.",
    bg: "bg-[#1c1814]",
    glow: "before:bg-[radial-gradient(ellipse_at_85%_5%,rgba(200,151,106,0.20),transparent_58%)]",
    border: "border-[#c8976a]/20",
    accent: "text-[#c8976a]",
    text: "text-[#ede0cf]",
    legacyTypes: ["movies", "boardgames", "videogames"],
  },
  {
    id: "fun",
    eyebrow: "Fun activity",
    title: "Get out",
    description: "Active dates, local adventures, thrift runs, trails, and things around town.",
    bg: "bg-[#0f1e1b]",
    glow: "before:bg-[radial-gradient(ellipse_at_15%_95%,rgba(91,168,152,0.22),transparent_58%)]",
    border: "border-[#5ba898]/20",
    accent: "text-[#5ba898]",
    text: "text-[#d0e8e4]",
    legacyTypes: ["trails", "thriftstores"],
  },
  {
    id: "creative",
    eyebrow: "Creative",
    title: "Make something",
    description: "Hands-on plans like painting, cooking projects, classes, and crafty experiments.",
    bg: "bg-[#18162a]",
    glow: "before:bg-[radial-gradient(ellipse_at_85%_95%,rgba(155,141,200,0.22),transparent_58%)]",
    border: "border-[#9b8dc8]/20",
    accent: "text-[#9b8dc8]",
    text: "text-[#ddd8f0]",
    legacyTypes: ["custom"],
  },
  {
    id: "food",
    eyebrow: "Food",
    title: "Let's eat",
    description: "Restaurants, treats, picnics, markets, and food ideas worth saving.",
    bg: "bg-[#1e120c]",
    glow: "before:bg-[radial-gradient(ellipse_at_15%_5%,rgba(217,123,84,0.22),transparent_58%)]",
    border: "border-[#d97b54]/20",
    accent: "text-[#d97b54]",
    text: "text-[#f0d8cc]",
    legacyTypes: ["restaurants"],
  },
];

function itemBelongsToSection(item: ListItem, section: DateSection) {
  return item.type === section.id || section.legacyTypes.includes(item.type);
}

function getSectionForItem(item: ListItem) {
  return sections.find((section) => itemBelongsToSection(item, section)) ?? sections[0];
}

export default function ListPanel({ coupleId, favoritesOnly = false }: Props) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<DateSection["id"] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [addingSection, setAddingSection] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel(`date-board-${coupleId}`)
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
  }, [coupleId]);

  const visibleItems = useMemo(() => {
    return favoritesOnly ? items.filter((item) => item.favorite) : items;
  }, [favoritesOnly, items]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function fetchItems() {
    const { data, error } = await supabase
      .from("list_items")
      .select("*")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: true });

    if (!error) setItems((data ?? []) as ListItem[]);
  }

  async function addItem(section: DateSection) {
    const trimmed = (drafts[section.id] ?? "").trim();
    if (!trimmed) return;

    const { error } = await supabase.from("list_items").insert({
      couple_id: coupleId,
      type: section.id,
      name: trimmed,
      plays: 0,
      favorite: false,
    });

    if (error) {
      notify("Could not add activity");
      return;
    }

    setDrafts((current) => ({ ...current, [section.id]: "" }));
    setAddingSection(null);
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

  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? null;

  if (favoritesOnly) {
    const favoriteItems = items.filter((item) => item.favorite);

    return (
      <section className="px-4 pb-28 pt-5 text-white">
        <Toast message={toast} />

        <div className="pb-5">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-teal-200/70">Favorites</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Favorite activities</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">Everything you heart from the date categories lives here.</p>
        </div>

        <div className="space-y-3">
          {favoriteItems.length ? (
            favoriteItems.map((item) => {
              const section = getSectionForItem(item);

              return (
                <article key={item.id} className={`rounded-lg border border-white/10 p-4 ${section.bg}`}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleFavorite(item)} className={`rounded-lg p-2 transition hover:bg-white/10 ${section.accent}`}>
                      <Heart size={19} fill="currentColor" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[0.62rem] font-medium uppercase tracking-[0.2em] opacity-60 ${section.accent}`}>{section.title}</p>
                      <h3 className={`truncate text-sm font-medium ${section.text}`}>{item.name}</h3>
                    </div>
                    {item.plays > 0 && <span className="rounded bg-white/[0.055] px-2 py-1 text-xs text-white/50">picked {item.plays}</span>}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.025] p-8 text-center text-sm text-zinc-500">
              No favorite activities yet. Tap a heart next to a date idea to save it here.
            </div>
          )}
        </div>
      </section>
    );
  }

  if (selectedSection) {
    const sectionItems = visibleItems.filter((item) => itemBelongsToSection(item, selectedSection));
    const emptyText = "Add the first activity.";

    return (
      <section className="px-4 pb-28 pt-5 text-white">
        <Toast message={toast} />
        <button
          onClick={() => setSelectedSectionId(null)}
          className={`mb-5 rounded-md px-2 py-2 text-sm transition hover:bg-white/[0.045] ${selectedSection.accent}`}
        >
          Back to categories
        </button>

        <article className={`relative overflow-hidden rounded-lg border border-white/10 p-6 ${selectedSection.bg} ${selectedSection.glow} before:pointer-events-none before:absolute before:inset-0`}>
          <div className="relative z-10">
            <p className={`text-[0.62rem] font-medium uppercase tracking-[0.24em] opacity-60 ${selectedSection.accent}`}>{selectedSection.eyebrow}</p>
            <h2 className={`mt-2 font-serif text-4xl font-light leading-none tracking-tight ${selectedSection.text}`}>{selectedSection.title}</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/45">{selectedSection.description}</p>

            <div className="mt-8 flex flex-col gap-2">
              {sectionItems.length ? (
                sectionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`group flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-3 py-3 transition ${
                      item.favorite ? "bg-white/10" : "bg-black/10 hover:bg-white/[0.045]"
                    }`}
                  >
                    <button
                      onClick={() => toggleFavorite(item)}
                      className={`rounded-lg p-1.5 transition hover:bg-white/10 ${selectedSection.accent}`}
                      aria-label={item.favorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
                    >
                      <Heart size={18} fill={item.favorite ? "currentColor" : "none"} />
                    </button>
                    <span className={`min-w-0 flex-1 text-sm font-light leading-5 ${selectedSection.text}`}>{item.name}</span>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        increment(item);
                      }}
                      className={`rounded px-2 py-1 text-[0.65rem] ${selectedSection.accent} bg-white/[0.055]`}
                    >
                      {item.plays > 0 ? `picked ${item.plays}` : "pick"}
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteItem(item);
                      }}
                      className="rounded p-1.5 text-white/20 transition hover:bg-white/10 hover:text-white/70"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-white/10 px-3 py-6 text-sm text-white/25">{emptyText}</div>
              )}
            </div>

            {!favoritesOnly && (
              <div className="mt-7">
                {addingSection === selectedSection.id ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={drafts[selectedSection.id] ?? ""}
                      onChange={(event) => setDrafts((current) => ({ ...current, [selectedSection.id]: event.target.value }))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") addItem(selectedSection);
                        if (event.key === "Escape") setAddingSection(null);
                      }}
                      placeholder="New activity..."
                      className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
                    />
                    <button onClick={() => addItem(selectedSection)} className={`rounded-md border px-3 py-2 text-sm ${selectedSection.border} ${selectedSection.accent} bg-white/[0.045]`}>
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSection(selectedSection.id)}
                    className={`inline-flex items-center gap-2 rounded-md px-2 py-2 text-xs tracking-wide transition hover:bg-white/[0.045] ${selectedSection.accent} opacity-75 hover:opacity-100`}
                  >
                    <Plus size={14} />
                    Add activity
                  </button>
                )}
              </div>
            )}
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="px-4 pb-28 pt-5 text-white">
      <Toast message={toast} />

      <div className="pb-5">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-teal-200/70">
          {favoritesOnly ? "Saved dates" : "Date ideas"}
        </p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">{favoritesOnly ? "Favorites" : "Dates"}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">Choose a category, then pick or add activities inside it.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sections.map((section, index) => {
          const sectionItems = visibleItems.filter((item) => itemBelongsToSection(item, section));
          const countLabel = `${sectionItems.length} ${sectionItems.length === 1 ? "activity" : "activities"}`;

          return (
            <button
              key={section.id}
              onClick={() => setSelectedSectionId(section.id)}
              className={`relative overflow-hidden rounded-lg border border-white/10 p-6 text-left shadow-2xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-white/20 ${section.bg} ${section.glow} before:pointer-events-none before:absolute before:inset-0 before:opacity-100`}
            >
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent ${section.accent} opacity-60`} />
              <div className="relative z-10">
                <p className={`text-[0.62rem] font-medium uppercase tracking-[0.24em] opacity-60 ${section.accent}`}>{section.eyebrow}</p>
                <h3 className={`mt-2 font-serif text-4xl font-light leading-none tracking-tight ${section.text}`}>{section.title}</h3>
                <p className="mt-4 text-sm leading-6 text-white/45">{section.description}</p>
                <div className="mt-7 flex items-center justify-between">
                  <span className={`rounded px-2 py-1 text-[0.68rem] ${section.accent} bg-white/[0.055]`}>{countLabel}</span>
                  <span className={`text-xs ${section.accent}`}>Open</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
