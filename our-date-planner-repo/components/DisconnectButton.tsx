"use client";

import { leaveCouple } from "@/lib/couples";

export default function DisconnectButton() {
  async function disconnect() {
    const confirmed = window.confirm("Leave this couple? You can join again with a new invite.");
    if (!confirmed) return;
    await leaveCouple();
    window.location.reload();
  }

  return (
    <button onClick={disconnect} className="text-sm text-red-300/80 underline underline-offset-4">
      Disconnect
    </button>
  );
}
