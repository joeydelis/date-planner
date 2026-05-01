"use client";

import { Heart, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

const defaultDateIdeas: Record<DateSection["id"], string[]> = {
  home: [
    "Random movie night",
    "Cook a new recipe together",
    "Board game night",
    "Blanket fort dessert picnic",
    "At-home spa night",
  ],
  fun: [
    "Nearby trail or park",
    "Thrift store treasure hunt",
    "Mini golf",
    "Arcade night",
    "Farmers market stroll",
  ],
  creative: [
    "Find a nearby craft spot",
    "Pottery painting",
    "Paint and sip night",
    "Make custom candles",
    "Take a dance class",
  ],
  food: [
    "Random restaurant nearby",
    "Dessert-only date",
    "Try a new brunch spot",
    "Picnic with takeout",
    "Coffee shop crawl",
  ],
};

const DEFAULT_SEED_KEY_PREFIX = "our-date-planner-default-ideas-seeded";

const sections: DateSection[] = [
  {
    id: "home",
    eyebrow: "Stay at home",
    title: "At home",
    description: "Cozy nights, games, movies, and low-key plans without leaving the house.",
    bg: "bg-[#fff2b8]",
    glow: "before:bg-[radial-gradient(ellipse_at_85%_5%,rgba(255,143,171,0.34),transparent_58%)]",
    border: "border-[#ffd67d]",
    accent: "text-[#c98512]",
    text: "text-[#4b3440]",
    legacyTypes: ["movies", "boardgames", "videogames"],
  },
  {
    id: "fun",
    eyebrow: "Fun activity",
    title: "Get out",
    description: "Active dates, local adventures, thrift runs, trails, and things around town.",
    bg: "bg-[#dffbf1]",
    glow: "before:bg-[radial-gradient(ellipse_at_15%_95%,rgba(255,227,110,0.48),transparent_58%)]",
    border: "border-[#9ee7d0]",
    accent: "text-[#1c8f79]",
    text: "text-[#284c45]",
    legacyTypes: ["trails", "thriftstores"],
  },
  {
    id: "creative",
    eyebrow: "Creative",
    title: "Make something",
    description: "Hands-on plans like painting, cooking projects, classes, and crafty experiments.",
    bg: "bg-[#eee7ff]",
    glow: "before:bg-[radial-gradient(ellipse_at_85%_95%,rgba(255,143,171,0.36),transparent_58%)]",
    border: "border-[#c8b7ff]",
    accent: "text-[#7f63c7]",
    text: "text-[#433963]",
    legacyTypes: ["custom"],
  },
  {
    id: "food",
    eyebrow: "Food",
    title: "Let's eat",
    description: "Restaurants, treats, picnics, markets, and food ideas worth saving.",
    bg: "bg-[#ffe2d4]",
    glow: "before:bg-[radial-gradient(ellipse_at_15%_5%,rgba(255,211,92,0.44),transparent_58%)]",
    border: "border-[#ffb392]",
    accent: "text-[#d66a46]",
    text: "text-[#5d382f]",
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
  const seededRef = useRef(false);

  useEffect(() => {
    seededRef.current = false;
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

    if (error) return;

    const loadedItems = (data ?? []) as ListItem[];
    setItems(loadedItems);

    if (!favoritesOnly && !seededRef.current && !localStorage.getItem(`${DEFAULT_SEED_KEY_PREFIX}-${coupleId}`)) {
      seededRef.current = true;
      await seedDefaultIdeas(loadedItems);
    }
  }

  async function seedDefaultIdeas(existingItems: ListItem[]) {
    const existingNames = new Set(existingItems.map((item) => item.name.trim().toLowerCase()));
    const rows = sections.flatMap((section) =>
      defaultDateIdeas[section.id]
        .filter((name) => !existingNames.has(name.toLowerCase()))
        .map((name) => ({
          couple_id: coupleId,
          type: section.id,
          name,
          plays: 0,
          favorite: false,
          checkout: false,
        }))
    );

    if (!rows.length) {
      localStorage.setItem(`${DEFAULT_SEED_KEY_PREFIX}-${coupleId}`, "true");
      return;
    }

    const { error } = await supabase.from("list_items").insert(rows);
    if (!error) {
      localStorage.setItem(`${DEFAULT_SEED_KEY_PREFIX}-${coupleId}`, "true");
      fetchItems();
    }
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
      checkout: false,
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

  async function toggleCheckout(item: ListItem) {
    const { error } = await supabase.from("list_items").update({ checkout: !item.checkout }).eq("id", item.id);
    if (error) {
      notify("Could not update checkout");
      return;
    }
    notify(item.checkout ? "Removed from checkout" : "Added to checkout");
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
      <section className="px-4 pb-28 pt-5 text-[#493343]">
        <Toast message={toast} />

        <div className="pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e06f92]">Favorites</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-[#3f2a39]">Favorite activities</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#8b687e]">Everything you heart from the date categories lives here.</p>
        </div>

        <div className="space-y-3">
          {favoriteItems.length ? (
            favoriteItems.map((item) => {
              const section = getSectionForItem(item);

              return (
                <article key={item.id} className={`rounded-lg border border-white/70 p-4 shadow-lg shadow-[#e06f92]/10 ${section.bg}`}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleFavorite(item)} className={`rounded-lg p-2 transition hover:bg-white/10 ${section.accent}`}>
                      <Heart size={19} fill="currentColor" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[0.62rem] font-medium uppercase tracking-[0.2em] opacity-60 ${section.accent}`}>{section.title}</p>
                      <h3 className={`truncate text-sm font-medium ${section.text}`}>{item.name}</h3>
                    </div>
                    {item.checkout && (
                      <span className={`inline-flex items-center gap-1 rounded bg-white/60 px-2 py-1 text-xs font-semibold ${section.accent}`}>
                        <ShoppingBag size={13} />
                        checkout
                      </span>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-[#f3bfd0] bg-white/55 p-8 text-center text-sm text-[#8b687e]">
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
      <section className="px-4 pb-28 pt-5 text-[#493343]">
        <Toast message={toast} />
        <button
          onClick={() => setSelectedSectionId(null)}
          className={`mb-5 rounded-md px-2 py-2 text-sm font-semibold transition hover:bg-white/60 ${selectedSection.accent}`}
        >
          Back to categories
        </button>

        <article className={`relative overflow-hidden rounded-lg border ${selectedSection.border} p-6 shadow-2xl shadow-[#e06f92]/10 ${selectedSection.bg} ${selectedSection.glow} before:pointer-events-none before:absolute before:inset-0`}>
          <div className="relative z-10">
            <p className={`text-[0.62rem] font-medium uppercase tracking-[0.24em] opacity-60 ${selectedSection.accent}`}>{selectedSection.eyebrow}</p>
            <h2 className={`mt-2 font-serif text-4xl font-light leading-none tracking-tight ${selectedSection.text}`}>{selectedSection.title}</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#7d6175]">{selectedSection.description}</p>

            <div className="mt-8 flex flex-col gap-2">
              {sectionItems.length ? (
                sectionItems.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={`group rounded-md px-3 py-3 transition ${
                        item.favorite ? "bg-white/65" : "bg-white/35 hover:bg-white/60"
                      }`}
                    >
                      <div className="flex min-h-12 cursor-pointer items-center gap-3">
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
                            toggleCheckout(item);
                          }}
                          className={`inline-flex items-center gap-1 rounded bg-white/60 px-2 py-1 text-[0.65rem] font-semibold ${selectedSection.accent}`}
                        >
                          <ShoppingBag size={13} />
                          {item.checkout ? "in checkout" : "add"}
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteItem(item);
                          }}
                          className="rounded p-1.5 text-[#9a7187] transition hover:bg-white/60 hover:text-[#c7466f]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-md border border-dashed border-white/70 px-3 py-6 text-sm text-[#9a7187]">{emptyText}</div>
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
                      className="min-w-0 flex-1 rounded-md border border-white/70 bg-white/70 px-3 py-2 text-sm text-[#493343] outline-none placeholder:text-[#b48ca0]"
                    />
                    <button onClick={() => addItem(selectedSection)} className={`rounded-md border px-3 py-2 text-sm font-semibold ${selectedSection.border} ${selectedSection.accent} bg-white/65`}>
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSection(selectedSection.id)}
                    className={`inline-flex items-center gap-2 rounded-md px-2 py-2 text-xs font-semibold tracking-wide transition hover:bg-white/60 ${selectedSection.accent} opacity-75 hover:opacity-100`}
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
    <section className="px-4 pb-28 pt-5 text-[#493343]">
      <Toast message={toast} />

      <div className="pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e06f92]">
          {favoritesOnly ? "Saved dates" : "Date ideas"}
        </p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-[#3f2a39]">{favoritesOnly ? "Favorites" : "Dates"}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#8b687e]">Choose a category, then pick or add activities inside it.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sections.map((section, index) => {
          const sectionItems = visibleItems.filter((item) => itemBelongsToSection(item, section));
          const countLabel = `${sectionItems.length} ${sectionItems.length === 1 ? "activity" : "activities"}`;

          return (
            <button
              key={section.id}
              onClick={() => setSelectedSectionId(section.id)}
              className={`relative overflow-hidden rounded-lg border ${section.border} p-6 text-left shadow-2xl shadow-[#e06f92]/10 transition hover:-translate-y-0.5 hover:shadow-[#e06f92]/20 ${section.bg} ${section.glow} before:pointer-events-none before:absolute before:inset-0 before:opacity-100`}
            >
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent ${section.accent} opacity-60`} />
              <div className="relative z-10">
                <p className={`text-[0.62rem] font-medium uppercase tracking-[0.24em] opacity-60 ${section.accent}`}>{section.eyebrow}</p>
                <h3 className={`mt-2 font-serif text-4xl font-light leading-none tracking-tight ${section.text}`}>{section.title}</h3>
                <p className="mt-4 text-sm leading-6 text-[#7d6175]">{section.description}</p>
                <div className="mt-7 flex items-center justify-between">
                  <span className={`rounded px-2 py-1 text-[0.68rem] font-semibold ${section.accent} bg-white/60`}>{countLabel}</span>
                  <span className={`text-xs font-semibold ${section.accent}`}>Open</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
