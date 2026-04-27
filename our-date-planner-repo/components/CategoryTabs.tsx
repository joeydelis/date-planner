"use client";

import type { ListType } from "@/types";

type Props = {
  selected: ListType;
  onChange: (type: ListType) => void;
};

const categories: { id: ListType; label: string }[] = [
  { id: "movies", label: "Movies" },
  { id: "boardgames", label: "Board Games" },
  { id: "videogames", label: "Video Games" },
  { id: "trails", label: "Trails" },
  { id: "thriftstores", label: "Thrift" },
  { id: "restaurants", label: "Food" },
];

export default function CategoryTabs({ selected, onChange }: Props) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onChange(category.id)}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
            selected === category.id
              ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20"
              : "bg-white/5 text-zinc-400"
          }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
