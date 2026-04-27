"use client";

import { useState } from "react";
import { createCouple } from "@/lib/couples";

type Props = {
  onCreated?: () => void;
};

export default function InvitePanel({ onCreated }: Props) {
  const [link, setLink] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function generateInvite() {
    try {
      setStatus("Creating invite...");
      const couple = await createCouple();
      const inviteLink = `${window.location.origin}/join/${couple.invite_code}`;
      setLink(inviteLink);
      setStatus("Invite ready");
      onCreated?.();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create invite");
    }
  }

  async function shareInvite() {
    if (!link) return;

    if (navigator.share) {
      await navigator.share({
        title: "Join me on Our Date Planner ❤️",
        text: "Let's plan date nights together.",
        url: link,
      });
      return;
    }

    await navigator.clipboard.writeText(link);
    setStatus("Link copied");
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5 text-white">
      <h2 className="text-xl font-semibold">Invite your partner</h2>
      <p className="mt-2 text-sm text-zinc-400">Create a one-time invite link. Once your partner joins, the link expires.</p>

      <button onClick={generateInvite} className="mt-5 w-full rounded-2xl bg-pink-500 px-4 py-3 font-semibold text-white">
        Generate Invite Link 🔗
      </button>

      {link && (
        <div className="mt-4 space-y-3">
          <div className="break-all rounded-2xl bg-white/5 p-3 text-xs text-zinc-300">{link}</div>
          <button onClick={shareInvite} className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white">
            Share / Copy Link 📤
          </button>
        </div>
      )}

      {status && <p className="mt-3 text-sm text-zinc-400">{status}</p>}
    </div>
  );
}
