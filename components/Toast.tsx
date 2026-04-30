"use client";

export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed left-1/2 top-5 z-[70] -translate-x-1/2 rounded-lg border border-[#f2b8cf] bg-white/95 px-4 py-2 text-sm font-semibold text-[#493343] shadow-2xl shadow-[#e06f92]/20 backdrop-blur">
      {message}
    </div>
  );
}
