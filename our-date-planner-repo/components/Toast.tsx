"use client";

export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed left-1/2 top-5 z-[70] -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-white shadow-xl">
      {message}
    </div>
  );
}
