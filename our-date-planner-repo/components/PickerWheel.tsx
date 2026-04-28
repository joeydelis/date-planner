"use client";

import { Shuffle } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

type Props = {
  items: string[];
  onPick: (name: string) => void;
};

export default function PickerWheel({ items, onPick }: Props) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);

  function spinWheel() {
    if (!items.length || spinning) return;

    setSpinning(true);
    const winnerIndex = Math.floor(Math.random() * items.length);
    const segmentAngle = 360 / items.length;
    const targetAngle = 360 - winnerIndex * segmentAngle - segmentAngle / 2;
    const spins = 360 * 6 + targetAngle;

    setRotation((current) => current + spins);

    window.setTimeout(() => {
      setSpinning(false);
      onPick(items[winnerIndex]);
    }, 3200);
  }

  const segmentAngle = items.length ? 360 / items.length : 360;

  return (
    <div className="flex flex-col items-center gap-5 rounded-lg border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30">
      <div className="relative">
        <div className="absolute -top-2 left-1/2 z-10 h-5 w-5 -translate-x-1/2 rotate-45 border-l border-t border-teal-200 bg-teal-300 shadow-[0_0_24px_rgba(45,212,191,0.45)]" />
        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 3.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex h-72 w-72 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-950 shadow-2xl shadow-black/50 ring-8 ring-white/[0.04]"
        >
          {items.length ? (
            items.slice(0, 12).map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="absolute left-1/2 top-1/2 h-1/2 w-1 origin-bottom-left"
                style={{ transform: `rotate(${index * segmentAngle}deg)` }}
              >
                <div
                  className={`absolute bottom-0 h-36 w-36 origin-bottom-left ${index % 2 === 0 ? "bg-teal-400/75" : "bg-slate-500/70"}`}
                  style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}
                />
                <span
                  className="absolute bottom-16 left-6 w-20 origin-left truncate text-[10px] font-semibold text-white"
                  style={{ transform: `rotate(${segmentAngle / 2}deg)` }}
                >
                  {item}
                </span>
              </div>
            ))
          ) : (
            <span className="px-8 text-center text-sm text-zinc-500">Add some ideas first</span>
          )}
          <div className="absolute h-16 w-16 rounded-full border border-white/15 bg-zinc-950 shadow-xl shadow-black/50" />
          <Shuffle className="absolute text-teal-100" size={24} />
        </motion.div>
      </div>

      <button
        onClick={spinWheel}
        disabled={!items.length || spinning}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-300 px-8 py-3 font-semibold text-zinc-950 shadow-lg shadow-teal-950/25 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Shuffle size={18} />
        {spinning ? "Spinning..." : "Spin"}
      </button>
    </div>
  );
}
