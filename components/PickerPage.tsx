"use client";

import confetti from "canvas-confetti";
import { CalendarDays, Check, Heart, Shuffle, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Toast from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import type { ListItem, ListType, ScheduledDate } from "@/types";

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
    accent: "text-[#62d9ff]",
    bg: "bg-[#10172a]",
    text: "text-[#edf3ff]",
    legacyTypes: ["movies", "boardgames", "videogames"],
  },
  {
    id: "fun",
    title: "Get out",
    accent: "text-[#6af5d2]",
    bg: "bg-[#0b1d27]",
    text: "text-[#edf3ff]",
    legacyTypes: ["trails", "thriftstores"],
  },
  {
    id: "creative",
    title: "Make something",
    accent: "text-[#c7a0ff]",
    bg: "bg-[#17142b]",
    text: "text-[#edf3ff]",
    legacyTypes: ["custom"],
  },
  {
    id: "food",
    title: "Let's eat",
    accent: "text-[#ff8fc5]",
    bg: "bg-[#211326]",
    text: "text-[#edf3ff]",
    legacyTypes: ["restaurants"],
  },
];

function getSectionForItem(item: ListItem) {
  return sections.find((section) => item.type === section.id || section.legacyTypes.includes(item.type)) ?? sections[0];
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function PickerPage({ coupleId }: Props) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [scheduledDates, setScheduledDates] = useState<ScheduledDate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scheduledFor, setScheduledFor] = useState("");
  const [notes, setNotes] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadItems();
    loadScheduledDates();

    const listChannel = supabase
      .channel(`activities-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "list_items", filter: `couple_id=eq.${coupleId}` },
        loadItems
      )
      .subscribe();

    const calendarChannel = supabase
      .channel(`scheduled-dates-${coupleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduled_dates", filter: `couple_id=eq.${coupleId}` },
        loadScheduledDates
      )
      .subscribe();

    return () => {
      supabase.removeChannel(listChannel);
      supabase.removeChannel(calendarChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  const checkoutItems = useMemo(() => {
    return items.filter((item) => item.checkout).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const sortedScheduledDates = useMemo(() => {
    return [...scheduledDates].sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  }, [scheduledDates]);

  const selectedItems = useMemo(() => {
    return checkoutItems.filter((item) => selectedIds.has(item.id));
  }, [checkoutItems, selectedIds]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function loadItems() {
    const { data } = await supabase
      .from("list_items")
      .select("*")
      .eq("couple_id", coupleId)
      .order("created_at", { ascending: false });

    setItems((data ?? []) as ListItem[]);
  }

  async function loadScheduledDates() {
    const { data } = await supabase
      .from("scheduled_dates")
      .select("*")
      .eq("couple_id", coupleId)
      .order("scheduled_for", { ascending: true });

    setScheduledDates((data ?? []) as ScheduledDate[]);
  }

  async function toggleFavorite(item: ListItem) {
    await supabase.from("list_items").update({ favorite: !item.favorite }).eq("id", item.id);
  }

  async function removeFromCheckout(item: ListItem) {
    const { error } = await supabase.from("list_items").update({ checkout: false }).eq("id", item.id);
    if (error) {
      notify("Could not remove from checkout");
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
    notify("Removed from checkout");
  }

  function toggleSelected(item: ListItem) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  function pickRandom() {
    if (!checkoutItems.length) return;
    const randomItem = checkoutItems[Math.floor(Math.random() * checkoutItems.length)];
    setSelectedIds(new Set([randomItem.id]));
    notify(`Selected ${randomItem.name}`);
  }

  async function scheduleSelected() {
    if (!selectedItems.length || !scheduledFor || saving) return;
    setSaving(true);

    const { data: authData } = await supabase.auth.getUser();
    const rows = selectedItems.map((item) => ({
      couple_id: coupleId,
      list_item_id: item.id,
      title: item.name,
      scheduled_for: scheduledFor,
      notes: notes.trim() || null,
      created_by: authData.user?.id ?? null,
    }));

    const { error } = await supabase.from("scheduled_dates").insert(rows);

    if (error) {
      notify("Could not schedule date");
      setSaving(false);
      return;
    }

    await Promise.all(
      selectedItems.map((item) =>
        supabase
          .from("list_items")
          .update({ checkout: false, plays: item.plays + 1 })
          .eq("id", item.id)
      )
    );

    setSelectedIds(new Set());
    setNotes("");
    setScheduledFor("");
    setSaving(false);
    confetti({ particleCount: 110, spread: 75, origin: { y: 0.65 } });
    notify(selectedItems.length === 1 ? "Date scheduled" : "Dates scheduled");
    loadItems();
    loadScheduledDates();
  }

  async function deleteScheduledDate(date: ScheduledDate) {
    await supabase.from("scheduled_dates").delete().eq("id", date.id);
    notify("Removed from calendar");
    loadScheduledDates();
  }

  return (
    <section className="px-4 pb-36 pt-6 text-[#edf3ff]">
      <Toast message={toast} />

      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#68e7ff]">Checkout</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white">Plan dates</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#8d98ad]">
          Add ideas from Lists, choose what you want to do, then assign a date and notes for the shared calendar.
        </p>
      </div>

      <div className="space-y-3">
        {checkoutItems.length ? (
          checkoutItems.map((item) => {
            const section = getSectionForItem(item);
            const selected = selectedIds.has(item.id);

            return (
              <article key={item.id} className={`rounded-[1.5rem] border p-4 shadow-xl shadow-black/25 ${section.bg} ${selected ? "border-[#68e7ff]" : "border-white/10"}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSelected(item)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                      selected ? "border-[#68e7ff] bg-[#68e7ff] text-[#071016]" : "border-white/10 bg-white/[0.045] text-[#8d98ad] hover:text-[#68e7ff]"
                    }`}
                    aria-label={selected ? `Unselect ${item.name}` : `Select ${item.name}`}
                  >
                    {selected ? <Check size={18} /> : <ShoppingBag size={17} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[0.62rem] font-medium uppercase tracking-[0.2em] opacity-60 ${section.accent}`}>{section.title}</p>
                    <h3 className={`truncate text-sm font-medium ${section.text}`}>{item.name}</h3>
                  </div>
                  <button
                    onClick={() => toggleFavorite(item)}
                    className={`rounded-lg p-2 transition hover:bg-white/10 ${section.accent}`}
                    aria-label={item.favorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
                  >
                    <Heart size={18} fill={item.favorite ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => removeFromCheckout(item)}
                    className="rounded-xl p-2 text-[#667087] transition hover:bg-white/10 hover:text-[#68e7ff]"
                    aria-label={`Remove ${item.name} from checkout`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-[#0f1422]/70 p-8 text-center text-sm text-[#8d98ad]">
            Your checkout is empty. Open Lists, choose a category, and tap add on any date idea that sounds good.
          </div>
        )}
      </div>

      <div className="app-card mt-5 rounded-[1.5rem] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#68e7ff]">Schedule</p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">{selectedItems.length || "No"} selected</h3>
          </div>
          <button
            onClick={pickRandom}
            disabled={!checkoutItems.length}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#68e7ff]/20 bg-[#68e7ff]/12 px-3 py-2 text-sm font-semibold text-[#68e7ff] transition hover:bg-[#68e7ff]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Shuffle size={16} />
            Random
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <input
            type="date"
            value={scheduledFor}
            onChange={(event) => setScheduledFor(event.target.value)}
            className="app-input h-11 rounded-2xl px-3 text-sm outline-none focus:border-[#68e7ff]"
          />
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes, reservations, reminders..."
            rows={3}
            className="app-input resize-none rounded-2xl px-3 py-3 text-sm outline-none focus:border-[#68e7ff]"
          />
          <button
            onClick={scheduleSelected}
            disabled={!selectedItems.length || !scheduledFor || saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#68e7ff] px-4 py-3 font-semibold text-[#071016] shadow-lg shadow-[#68e7ff]/20 transition hover:bg-[#9df4ff] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CalendarDays size={18} />
            {saving ? "Scheduling..." : "Schedule date"}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#68e7ff]">Calendar</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-white">Upcoming</h3>
          </div>
          <span className="rounded-xl bg-[#68e7ff]/14 px-2 py-1 text-xs font-semibold text-[#68e7ff]">{sortedScheduledDates.length}</span>
        </div>

        <div className="space-y-3">
          {sortedScheduledDates.length ? (
            sortedScheduledDates.map((date) => (
              <article key={date.id} className="rounded-[1.35rem] border border-white/10 bg-[#0f1422]/82 p-4 shadow-xl shadow-black/20">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-[#68e7ff]/20 bg-[#68e7ff]/12 px-3 py-2 text-center text-sm font-semibold text-[#68e7ff]">
                    {formatDate(date.scheduled_for)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-semibold tracking-tight">{date.title}</h4>
                    {date.notes && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#8d98ad]">{date.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteScheduledDate(date)}
                    className="rounded-xl p-2 text-[#667087] transition hover:bg-white/10 hover:text-[#68e7ff]"
                    aria-label={`Remove ${date.title} from calendar`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-[#0f1422]/70 p-8 text-center text-sm text-[#8d98ad]">
              Scheduled dates will show up here for both people in the couple.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
