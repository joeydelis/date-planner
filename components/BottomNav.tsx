"use client";

import { ChartNoAxesColumn, Heart, ListChecks, Sparkles } from "lucide-react";
import type { Tab } from "@/types";

type Props = {
  active: Tab;
  setActive: (tab: Tab) => void;
};

const tabs = [
  { id: "lists" as const, icon: ListChecks, label: "Lists" },
  { id: "favorites" as const, icon: Heart, label: "Favorites" },
  { id: "picker" as const, icon: Sparkles, label: "Activities" },
  { id: "stats" as const, icon: ChartNoAxesColumn, label: "Stats" },
];

export default function BottomNav({ active, setActive }: Props) {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-[#f3bfd0] bg-white/85 shadow-[0_-12px_35px_rgba(224,111,146,0.16)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition ${
              active === tab.id ? "bg-[#ffe36e] text-[#4b3440] shadow-sm" : "text-[#9a7187] hover:bg-[#fff0f5] hover:text-[#d65b82]"
            }`}
          >
            <tab.icon size={19} strokeWidth={2.2} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
