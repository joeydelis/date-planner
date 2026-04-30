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
    accent: "text-[#c98512]",
    bg: "bg-[#fff2b8]",
    text: "text-[#4b3440]",
    legacyTypes: ["movies", "boardgames", "videogames"],
  },
  {
    id: "fun",
    title: "Get out",
    accent: "text-[#1c8f79]",
    bg: "bg-[#dffbf1]",
    text: "text-[#284c45]",
    legacyTypes: ["trails", "thriftstores"],
  },
  {
    id: "creative",
    title: "Make something",
    accent: "text-[#7f63c7]",
    bg: "bg-[#eee7ff]",
    text: "text-[#433963]",
    legacyTypes: ["custom"],
  },
  {
    id: "food",
    title: "Let's eat",
    accent: "text-[#d66a46]",
    bg: "bg-[#ffe2d4]",
    text: "text-[#5d382f]",
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
    <section className="px-4 pb-32 pt-5 text-[#493343]">
      <Toast message={toast} />

      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e06f92]">Checkout</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-[#3f2a39]">Plan dates</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#8b687e]">
          Add ideas from Lists, choose what you want to do, then assign a date and notes for the shared calendar.
        </p>
      </div>

      <div className="space-y-3">
        {checkoutItems.length ? (
          checkoutItems.map((item) => {
            const section = getSectionForItem(item);
            const selected = selectedIds.has(item.id);

            return (
              <article key={item.id} className={`rounded-lg border p-4 shadow-xl shadow-[#e06f92]/10 ${section.bg} ${selected ? "border-[#ff8fab]" : "border-white/70"}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSelected(item)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                      selected ? "border-[#ff8fab] bg-[#ff8fab] text-white" : "border-white/70 bg-white/60 text-[#b48ca0] hover:text-[#d65b82]"
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
                    className="rounded-lg p-2 text-[#9a7187] transition hover:bg-white/60 hover:text-[#c7466f]"
                    aria-label={`Remove ${item.name} from checkout`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-lg border border-dashed border-[#f3bfd0] bg-white/55 p-8 text-center text-sm text-[#8b687e]">
            Your checkout is empty. Open Lists, choose a category, and tap add on any date idea that sounds good.
          </div>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-[#f3bfd0] bg-white/75 p-4 shadow-2xl shadow-[#e06f92]/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e06f92]">Schedule</p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-[#3f2a39]">{selectedItems.length || "No"} selected</h3>
          </div>
          <button
            onClick={pickRandom}
            disabled={!checkoutItems.length}
            className="inline-flex items-center gap-2 rounded-lg border border-[#ffd67d] bg-[#fff3bf] px-3 py-2 text-sm font-semibold text-[#6e4d09] transition hover:bg-[#ffe36e] disabled:cursor-not-allowed disabled:opacity-40"
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
            className="h-11 rounded-lg border border-[#f3bfd0] bg-white/85 px-3 text-sm text-[#493343] outline-none focus:border-[#ff8fab]"
          />
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes, reservations, reminders..."
            rows={3}
            className="resize-none rounded-lg border border-[#f3bfd0] bg-white/85 px-3 py-3 text-sm text-[#493343] outline-none placeholder:text-[#c9a7b8] focus:border-[#ff8fab]"
          />
          <button
            onClick={scheduleSelected}
            disabled={!selectedItems.length || !scheduledFor || saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#ff8fab] px-4 py-3 font-semibold text-white shadow-lg shadow-[#ff8fab]/25 transition hover:bg-[#f7729b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CalendarDays size={18} />
            {saving ? "Scheduling..." : "Schedule date"}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e06f92]">Calendar</p>
            <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[#3f2a39]">Upcoming</h3>
          </div>
          <span className="rounded bg-[#ffe36e] px-2 py-1 text-xs font-semibold text-[#6e4d09]">{sortedScheduledDates.length}</span>
        </div>

        <div className="space-y-3">
          {sortedScheduledDates.length ? (
            sortedScheduledDates.map((date) => (
              <article key={date.id} className="rounded-lg border border-[#f3bfd0] bg-white/75 p-4 shadow-xl shadow-[#e06f92]/10">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg border border-[#ffd67d] bg-[#fff3bf] px-3 py-2 text-center text-sm font-semibold text-[#8a6514]">
                    {formatDate(date.scheduled_for)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-semibold tracking-tight">{date.title}</h4>
                    {date.notes && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#8b687e]">{date.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteScheduledDate(date)}
                    className="rounded-lg p-2 text-[#9a7187] transition hover:bg-[#fff0f5] hover:text-[#c7466f]"
                    aria-label={`Remove ${date.title} from calendar`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-[#f3bfd0] bg-white/55 p-8 text-center text-sm text-[#8b687e]">
              Scheduled dates will show up here for both people in the couple.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
