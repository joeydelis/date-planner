import type { ScheduledDate } from "@/types";

function escapeCalendarText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(";", "\\;").replaceAll("\n", "\\n");
}

function calendarDate(value: string) {
  return value.replaceAll("-", "");
}

export function buildItinerary(date: Pick<ScheduledDate, "title" | "scheduled_for" | "notes">) {
  const notes = date.notes?.trim();
  return [
    { time: "Before", title: "Set the vibe", detail: "Confirm timing, outfits, reservation details, and anything to bring." },
    { time: "Start", title: date.title, detail: notes || "Enjoy the main plan without over-scheduling it." },
    { time: "After", title: "Optional add-on", detail: "Leave room for dessert, a walk, coffee, or one spontaneous stop nearby." },
  ];
}

export function buildCalendarFile(dates: ScheduledDate[]) {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const events = dates
    .map((date) => {
      const day = calendarDate(date.scheduled_for);
      const description = buildItinerary(date)
        .map((item) => `${item.time}: ${item.title} - ${item.detail}`)
        .join("\n");

      return [
        "BEGIN:VEVENT",
        `UID:${date.id}@our-date-planner`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${day}`,
        `SUMMARY:${escapeCalendarText(date.title)}`,
        `DESCRIPTION:${escapeCalendarText([date.notes, description].filter(Boolean).join("\n\n"))}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Our Date Planner//Date Calendar//EN", events, "END:VCALENDAR"].join("\r\n");
}

export function downloadCalendarFile(dates: ScheduledDate[], filename = "date-planner.ics") {
  if (!dates.length) return;
  const blob = new Blob([buildCalendarFile(dates)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
