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
    <nav className="safe-bottom fixed bottom-3 left-0 right-0 z-50 px-4">
      <div className="mx-auto grid max-w-md grid-cols-4 rounded-[1.6rem] border border-[#84a2ff]/16 bg-[#0d1220]/90 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex min-h-[3.6rem] flex-col items-center justify-center gap-1 rounded-[1.1rem] py-2 text-[11px] font-semibold transition ${
              active === tab.id ? "bg-[#68e7ff]/14 text-[#68e7ff] shadow-[inset_0_0_0_1px_rgba(104,231,255,0.18)]" : "text-[#667087] hover:bg-white/[0.04] hover:text-[#edf3ff]"
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
