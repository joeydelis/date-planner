"use client";

import { Copy, Link2 } from "lucide-react";
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

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join me on Our Date Planner",
          text: "Let's plan date nights together.",
          url: link,
        });
        return;
      }

      await navigator.clipboard.writeText(link);
      setStatus("Link copied");
    } catch {
      setStatus("Copy failed. Select the link manually.");
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5 text-white shadow-2xl shadow-black/30 backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-300/10 text-teal-200">
          <Link2 size={19} />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Invite your partner</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">Create a one-time invite link. Once your partner joins, the link expires.</p>
        </div>
      </div>

      <button
        onClick={generateInvite}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-300 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-teal-200"
      >
        <Link2 size={18} />
        Generate Invite Link
      </button>

      {link && (
        <div className="mt-4 space-y-3">
          <div className="break-all rounded-lg border border-white/10 bg-zinc-950/70 p-3 text-xs leading-5 text-zinc-300">{link}</div>
          <button
            onClick={shareInvite}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            <Copy size={16} />
            Share / Copy Link
          </button>
        </div>
      )}

      {status && <p className="mt-3 text-sm text-zinc-400">{status}</p>}
    </div>
  );
}
