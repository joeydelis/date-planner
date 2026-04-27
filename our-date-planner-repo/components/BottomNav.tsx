"use client";

import type { Tab } from "@/types";

type Props = {
  active: Tab;
  setActive: (tab: Tab) => void;
};

const tabs: { id: Tab; icon: string; label: string }[] = [
  { id: "lists", icon: "📋", label: "Lists" },
  { id: "favorites", icon: "❤️", label: "Favorites" },
  { id: "picker", icon: "🎡", label: "Picker" },
  { id: "stats", icon: "📊", label: "Stats" },
];

export default function BottomNav({ active, setActive }: Props) {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex flex-col items-center gap-1 py-3 text-xs transition ${
              active === tab.id ? "text-pink-400" : "text-zinc-500"
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
