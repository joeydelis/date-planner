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
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-zinc-300 transition hover:border-red-300/30 hover:bg-red-500/10 hover:text-red-100"
    >
      <LogOut size={15} />
      Leave
    </button>
  );
}
