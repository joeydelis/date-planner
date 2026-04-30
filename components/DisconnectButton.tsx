"use client";

import { LogOut } from "lucide-react";
import { leaveCouple } from "@/lib/couples";

export default function DisconnectButton() {
  async function disconnect() {
    const confirmed = window.confirm("Leave this couple? You can join again with a new invite.");
    if (!confirmed) return;
    await leaveCouple();
    window.location.reload();
  }

  return (
    <button
      onClick={disconnect}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#f3bfd0] bg-white/70 px-3 text-sm font-medium text-[#8b687e] shadow-sm transition hover:border-[#e06f92] hover:bg-[#fff0f5] hover:text-[#c7466f]"
    >
      <LogOut size={15} />
      Leave
    </button>
  );
}
