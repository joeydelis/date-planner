"use client";

import { CalendarPlus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Toast from "@/components/Toast";
import { downloadCalendarFile } from "@/lib/calendar";
import { supabase } from "@/lib/supabase";
import type { ListItem, ScheduledDate } from "@/types";

type Props = {
  coupleId: string;
};

type ProfileTab = "calendar" | "stats";

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function ProfilePage({ coupleId }: Props) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("calendar");
  const [items, setItems] = useState<ListItem[]>([]);
  const [dates, setDates] = useState<ScheduledDate[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const [{ data: itemData }, { data: dateData }] = await Promise.all([
        supabase.from("list_items").select("*").eq("couple_id", coupleId).order("plays", { ascending: false }),
        supabase.from("scheduled_dates").select("*").eq("couple_id", coupleId).order("scheduled_for", { ascending: true }),
      ]);

      setItems((itemData ?? []) as ListItem[]);
      setDates((dateData ?? []) as ScheduledDate[]);
    }

    loadProfile();

    const itemChannel = supabase
      .channel(`profile-items-${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "list_items", filter: `couple_id=eq.${coupleId}` }, loadProfile)
      .subscribe();
    const dateChannel = supabase
      .channel(`profile-dates-${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_dates", filter: `couple_id=eq.${coupleId}` }, loadProfile)
      .subscribe();

    return () => {
      supabase.removeChannel(itemChannel);
      supabase.removeChannel(dateChannel);
    };
  }, [coupleId]);

  const totalPicks = items.reduce((sum, item) => sum + item.plays, 0);
  const favorites = items.filter((item) => item.favorite).length;
  const completedDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dates.filter((date) => new Date(`${date.scheduled_for}T12:00:00`) < today);
  }, [dates]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function deleteScheduledDate(date: ScheduledDate) {
    await supabase.from("scheduled_dates").delete().eq("id", date.id);
    notify("Removed from calendar");
  }

  return (
    <section className="px-4 pb-36 pt-6 text-[#edf3ff]">
      <Toast message={toast} />
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#68e7ff]">Profile</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white">Your planner</h2>
      </div>

      <div className="mb-5 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.035] p-1">
        {(["calendar", "stats"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold capitalize transition ${
              activeTab === tab ? "bg-[#68e7ff]/14 text-[#68e7ff]" : "text-[#8d98ad] hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "calendar" ? (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-white">Calendar</h3>
              <p className="mt-1 text-sm text-[#8d98ad]">{completedDates.length} completed dates</p>
            </div>
            <button
              onClick={() => downloadCalendarFile(completedDates, "completed-date-planner.ics")}
              disabled={!completedDates.length}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#68e7ff]/20 bg-[#68e7ff]/12 px-3 py-2 text-xs font-semibold text-[#68e7ff] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CalendarPlus size={16} />
              Export completed
            </button>
          </div>

          <div className="space-y-3">
            {dates.length ? (
              dates.map((date) => (
                <article key={date.id} className="rounded-[1.35rem] border border-white/10 bg-[#0f1422]/82 p-4 shadow-xl shadow-black/20">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-[#68e7ff]/20 bg-[#68e7ff]/12 px-3 py-2 text-center text-sm font-semibold text-[#68e7ff]">
                      {formatDate(date.scheduled_for)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-white">{date.title}</h4>
                      {date.notes && <p className="mt-1 text-sm leading-6 text-[#8d98ad]">{date.notes}</p>}
                    </div>
                    <button onClick={() => deleteScheduledDate(date)} className="rounded-xl p-2 text-[#667087] hover:bg-white/10 hover:text-[#68e7ff]">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-[#0f1422]/70 p-8 text-center text-sm text-[#8d98ad]">
                Scheduled dates will appear here.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
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
        </div>
      )}
    </section>
  );
}
