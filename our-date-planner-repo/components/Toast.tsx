"use client";

export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed left-1/2 top-5 z-[70] -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-950/95 px-4 py-2 text-sm font-medium text-white shadow-2xl shadow-black/40 backdrop-blur">
      {message}
    </div>
  );
}
