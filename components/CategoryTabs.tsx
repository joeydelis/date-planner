"use client";

import type { ListType } from "@/types";

type Props = {
  selected: ListType;
  onChange: (type: ListType) => void;
};

const categories: { id: ListType; label: string }[] = [
  { id: "home", label: "At home" },
  { id: "fun", label: "Get out" },
  { id: "creative", label: "Make" },
  { id: "food", label: "Eat" },
];

export default function CategoryTabs({ selected, onChange }: Props) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-3">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onChange(category.id)}
          className={`whitespace-nowrap rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
            selected === category.id
              ? "border-teal-300/40 bg-teal-300/15 text-teal-100 shadow-[0_0_24px_rgba(45,212,191,0.12)]"
              : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
          }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
