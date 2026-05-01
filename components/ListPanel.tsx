"use client";

import { Check, Heart, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Toast from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import type { ListItem, ListType } from "@/types";

type Props = {
  coupleId: string;
  favoritesOnly?: boolean;
};

type DateSection = {
  id: Extract<ListType, "home" | "fun" | "creative" | "food">;
  eyebrow: string;
  title: string;
  gradient: string;
  ring: string;
  accent: string;
  legacyTypes: ListType[];
};

const defaultDateIdeas: Record<DateSection["id"], string[]> = {
  home: ["Random movie night", "Cook a new recipe together", "Board game night", "Blanket fort dessert picnic", "At-home spa night"],
  fun: ["Nearby trail or park", "Thrift store treasure hunt", "Mini golf", "Arcade night", "Farmers market stroll"],
  creative: ["Find a nearby craft spot", "Pottery painting", "Paint and sip night", "Make custom candles", "Take a dance class"],
  food: ["Random restaurant nearby", "Dessert-only date", "Try a new brunch spot", "Picnic with takeout", "Coffee shop crawl"],
};

const DEFAULT_SEED_KEY_PREFIX = "our-date-planner-default-ideas-seeded";

const sections: DateSection[] = [
  {
    id: "home",
    eyebrow: "Cozy",
    title: "At home",
    gradient: "from-[#13234f] via-[#1c1747] to-[#11131f]",
    ring: "border-[#53b7ff]/35",
    accent: "text-[#62d9ff]",
    legacyTypes: ["movies", "boardgames", "videogames"],
  },
  {
    id: "fun",
    eyebrow: "Explore",
    title: "Get out",
    gradient: "from-[#083445] via-[#12305a] to-[#10131f]",
    ring: "border-[#6af5d2]/35",
    accent: "text-[#6af5d2]",
    legacyTypes: ["trails", "thriftstores"],
  },
  {
    id: "creative",
    eyebrow: "Make",
    title: "Create",
    gradient: "from-[#35135e] via-[#23194d] to-[#11131f]",
    ring: "border-[#b98cff]/35",
    accent: "text-[#c7a0ff]",
    legacyTypes: ["custom"],
  },
  {
    id: "food",
    eyebrow: "Taste",
    title: "Eat",
    gradient: "from-[#4a1839] via-[#2a1a4f] to-[#11131f]",
    ring: "border-[#ff6fb1]/35",
    accent: "text-[#ff8fc5]",
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
  const [selectedSectionId, setSelectedSectionId] = useState<DateSection["id"]>("home");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    seededRef.current = false;
    fetchItems();

    const channel = supabase
      .channel(`date-board-${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "list_items", filter: `couple_id=eq.${coupleId}` }, fetchItems)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  const visibleItems = useMemo(() => (favoritesOnly ? items.filter((item) => item.favorite) : items), [favoritesOnly, items]);
  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? sections[0];
  const sectionItems = visibleItems.filter((item) => itemBelongsToSection(item, selectedSection));

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function fetchItems() {
    const { data, error } = await supabase.from("list_items").select("*").eq("couple_id", coupleId).order("created_at", { ascending: true });
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
        .map((name) => ({ couple_id: coupleId, type: section.id, name, plays: 0, favorite: false, checkout: false }))
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

  async function addItem() {
    const trimmed = (drafts[selectedSection.id] ?? "").trim();
    if (!trimmed) return;

    const { error } = await supabase.from("list_items").insert({
      couple_id: coupleId,
      type: selectedSection.id,
      name: trimmed,
      plays: 0,
      favorite: false,
      checkout: false,
    });

    if (error) {
      notify("Could not add activity");
      return;
    }

    setDrafts((current) => ({ ...current, [selectedSection.id]: "" }));
    setAdding(false);
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

  if (favoritesOnly) {
    const favoriteItems = items.filter((item) => item.favorite);

    return (
      <section className="px-4 pb-36 pt-6 text-[#edf3ff]">
        <Toast message={toast} />
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#68e7ff]">Favorites</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Saved ideas</h2>
          <p className="mt-2 text-sm leading-6 text-[#8d98ad]">All the hearted date options in one place.</p>
        </div>

        <div className="space-y-3">
          {favoriteItems.length ? (
            favoriteItems.map((item) => {
              const section = getSectionForItem(item);
              return (
                <article key={item.id} className="rounded-3xl border border-white/10 bg-[#101522]/80 p-4 shadow-2xl shadow-black/25">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleFavorite(item)} className={`rounded-2xl bg-white/[0.04] p-2 ${section.accent}`}>
                      <Heart size={18} fill="currentColor" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[0.62rem] font-bold uppercase tracking-[0.22em] ${section.accent}`}>{section.title}</p>
                      <h3 className="truncate text-sm font-semibold text-[#edf3ff]">{item.name}</h3>
                    </div>
                    {item.checkout && <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs text-[#68e7ff]">checkout</span>}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-[#8d98ad]">
              No favorites yet.
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 pb-36 pt-6 text-[#edf3ff]">
      <Toast message={toast} />

      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#68e7ff]">Date deck</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Pick a lane</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {sections.map((section) => {
          const count = visibleItems.filter((item) => itemBelongsToSection(item, section)).length;
          const selected = section.id === selectedSection.id;

          return (
            <button
              key={section.id}
              onClick={() => {
                setSelectedSectionId(section.id);
                setAdding(false);
              }}
              className={`relative min-h-[4.6rem] overflow-hidden rounded-2xl border bg-gradient-to-br px-3 py-3 text-left shadow-xl shadow-black/20 transition ${
                section.gradient
              } ${selected ? `${section.ring} scale-[1.01]` : "border-white/8 opacity-78 hover:opacity-100"}`}
            >
              <div className="absolute -right-10 -top-10 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
              <div className="relative z-10 flex h-full items-center justify-between gap-3">
                <div>
                  <p className={`text-[0.6rem] font-bold uppercase tracking-[0.22em] ${section.accent}`}>{section.eyebrow}</p>
                  <h3 className="mt-1 text-base font-semibold tracking-tight text-white">{section.title}</h3>
                </div>
                <span className="shrink-0 rounded-full bg-black/20 px-2 py-1 text-[0.65rem] font-semibold text-[#c9d4ea]">{count}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-[1.6rem] border border-white/8 bg-[#080d19]/70 p-3 shadow-xl shadow-black/20">
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <div>
            <p className={`text-[0.62rem] font-bold uppercase tracking-[0.22em] ${selectedSection.accent}`}>{selectedSection.eyebrow}</p>
            <h3 className="mt-0.5 text-xl font-semibold tracking-tight">{selectedSection.title}</h3>
          </div>
          <button onClick={() => setAdding((value) => !value)} className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] ${selectedSection.accent}`}>
            <Plus size={17} />
          </button>
        </div>

        {adding && (
          <div className="mb-4 flex gap-2">
            <input
              autoFocus
              value={drafts[selectedSection.id] ?? ""}
              onChange={(event) => setDrafts((current) => ({ ...current, [selectedSection.id]: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") addItem();
                if (event.key === "Escape") setAdding(false);
              }}
              placeholder="New date idea..."
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-[#667087]"
            />
            <button onClick={addItem} className="rounded-2xl bg-[#68e7ff] px-4 text-sm font-bold text-[#071016]">
              Save
            </button>
          </div>
        )}

        <div className="divide-y divide-white/[0.06]">
          {sectionItems.length ? (
            sectionItems.map((item) => (
              <div key={item.id} className="group flex min-h-12 items-center gap-2 px-1 py-2.5">
                <button
                  onClick={() => toggleFavorite(item)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-white/[0.05] ${item.favorite ? selectedSection.accent : "text-[#667087]"}`}
                  aria-label={item.favorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
                >
                  <Heart size={16} fill={item.favorite ? "currentColor" : "none"} />
                </button>
                <span className="min-w-0 flex-1 text-sm font-medium leading-5 text-[#edf3ff]">{item.name}</span>
                <button
                  onClick={() => toggleCheckout(item)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
                    item.checkout ? "bg-[#68e7ff]/15 text-[#68e7ff]" : "bg-white/[0.04] text-[#8d98ad] hover:bg-[#68e7ff]/10 hover:text-[#68e7ff]"
                  }`}
                  aria-label={item.checkout ? `Remove ${item.name} from checkout` : `Add ${item.name} to checkout`}
                >
                  {item.checkout ? <Check size={16} /> : <ShoppingBag size={15} />}
                </button>
                <button
                  onClick={() => deleteItem(item)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#4f5a70] opacity-70 transition hover:bg-[#ff6fb1]/10 hover:text-[#ff6fb1] group-hover:opacity-100"
                  aria-label={`Delete ${item.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-[#8d98ad]">No ideas here yet.</div>
          )}
        </div>
      </div>
    </section>
  );
}
