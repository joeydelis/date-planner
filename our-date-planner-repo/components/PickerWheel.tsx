"use client";

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
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-3xl">🔻</div>
        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 3.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex h-72 w-72 items-center justify-center overflow-hidden rounded-full border-8 border-pink-400 bg-zinc-900 shadow-2xl shadow-pink-500/20"
        >
          {items.length ? (
            items.slice(0, 12).map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="absolute left-1/2 top-1/2 h-1/2 w-1 origin-bottom-left"
                style={{ transform: `rotate(${index * segmentAngle}deg)` }}
              >
                <div
                  className={`absolute bottom-0 h-36 w-36 origin-bottom-left ${index % 2 === 0 ? "bg-pink-500/80" : "bg-purple-500/70"}`}
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
          <div className="absolute h-16 w-16 rounded-full border border-white/20 bg-zinc-950" />
          <div className="absolute text-2xl">❤️</div>
        </motion.div>
      </div>

      <button
        onClick={spinWheel}
        disabled={!items.length || spinning}
        className="rounded-full bg-pink-500 px-8 py-3 font-semibold text-white shadow-lg shadow-pink-500/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {spinning ? "Spinning..." : "Spin 🎡"}
      </button>
    </div>
  );
}
