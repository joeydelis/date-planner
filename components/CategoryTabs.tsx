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
              ? "border-[#ffd67d] bg-[#ffe36e] text-[#6e4d09] shadow-[0_10px_24px_rgba(255,143,171,0.16)]"
              : "border-[#f3bfd0] bg-white/70 text-[#8b687e] hover:bg-[#fff0f5] hover:text-[#d65b82]"
          }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
