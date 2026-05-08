"use client";

import { CalendarPlus, Download, Route, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildItinerary, downloadCalendarFile } from "@/lib/calendar";
import { supabase } from "@/lib/supabase";
import type { ScheduledDate } from "@/types";

type Props = {
  coupleId: string;
};

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function ItineraryPage({ coupleId }: Props) {
  const [dates, setDates] = useState<ScheduledDate[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDates() {
      const { data } = await supabase
        .from("scheduled_dates")
        .select("*")
        .eq("couple_id", coupleId)
        .order("scheduled_for", { ascending: true });

      setDates((data ?? []) as ScheduledDate[]);
    }

    loadDates();

    const channel = supabase
      .channel(`itinerary-dates-${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "scheduled_dates", filter: `couple_id=eq.${coupleId}` }, loadDates)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  const activeDate = useMemo(() => dates.find((date) => date.id === activeId) ?? dates[0] ?? null, [activeId, dates]);
  const itinerary = activeDate ? buildItinerary(activeDate) : [];

  return (
    <section className="px-4 pb-36 pt-6 text-[#edf3ff]">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#68e7ff]">Itinerary</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white">Date plan</h2>
        <p className="mt-2 text-sm leading-6 text-[#8d98ad]">Generate a loose plan from a scheduled date and export it to your calendar app.</p>
      </div>

      {dates.length ? (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {dates.map((date) => {
              const selected = activeDate?.id === date.id;
              return (
                <button
                  key={date.id}
                  onClick={() => setActiveId(date.id)}
                  className={`shrink-0 rounded-2xl border px-3 py-2 text-left text-sm transition ${
                    selected ? "border-[#68e7ff]/40 bg-[#68e7ff]/14 text-[#68e7ff]" : "border-white/10 bg-white/[0.035] text-[#8d98ad]"
                  }`}
                >
                  <span className="block font-semibold">{formatDate(date.scheduled_for)}</span>
                  <span className="block max-w-40 truncate text-xs opacity-80">{date.title}</span>
                </button>
              );
            })}
          </div>

          {activeDate && (
            <article className="app-card rounded-[1.6rem] p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#68e7ff]">{formatDate(activeDate.scheduled_for)}</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-white">{activeDate.title}</h3>
                  {activeDate.notes && <p className="mt-2 text-sm leading-6 text-[#8d98ad]">{activeDate.notes}</p>}
                </div>
                <button
                  onClick={() => downloadCalendarFile([activeDate], `${activeDate.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[#68e7ff]"
                  aria-label={`Export ${activeDate.title} to calendar`}
                >
                  <CalendarPlus size={18} />
                </button>
              </div>

              <div className="space-y-3">
                {itinerary.map((item) => (
                  <div key={`${item.time}-${item.title}`} className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#68e7ff]/12 text-[#68e7ff]">
                        <Route size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8d98ad]">{item.time}</p>
                        <h4 className="mt-1 font-semibold text-white">{item.title}</h4>
                        <p className="mt-1 text-sm leading-6 text-[#8d98ad]">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => downloadCalendarFile(dates, "date-planner-itinerary.ics")}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#68e7ff]/20 bg-[#68e7ff]/12 px-4 py-3 text-sm font-semibold text-[#68e7ff]"
              >
                <Download size={17} />
                Export all dates
              </button>
            </article>
          )}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-[#0f1422]/70 p-8 text-center text-sm text-[#8d98ad]">
          <Sparkles className="mx-auto mb-3 text-[#68e7ff]" size={22} />
          Schedule a date from Activities, then generate an itinerary here.
        </div>
      )}
    </section>
  );
}
