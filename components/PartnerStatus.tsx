"use client";

import { Copy, Inbox, LogOut, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { leaveCouple } from "@/lib/couples";
import { supabase } from "@/lib/supabase";
import { normalizeUsername } from "@/lib/profiles";

type Props = {
  coupleId: string;
};

type PendingInvite = {
  id: string;
  couple_id: string;
  from_user_id: string;
  created_at: string;
  profiles?: {
    name: string | null;
    username: string | null;
  } | null;
};

type InviteRow = Omit<PendingInvite, "profiles"> & {
  profiles?:
    | {
        name: string | null;
        username: string | null;
      }
    | {
        name: string | null;
        username: string | null;
      }[]
    | null;
};

export default function PartnerStatus({ coupleId }: Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [partner, setPartner] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [inbox, setInbox] = useState<PendingInvite[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadPartner() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      setCurrentUserId(userId ?? null);
      if (!userId) return;

      const { data: members } = await supabase
        .from("couple_members")
        .select("user_id")
        .eq("couple_id", coupleId);

      const partnerMember = members?.find((member) => member.user_id !== userId);
      if (!partnerMember) {
        setPartner(null);

        const { data: couple } = await supabase
          .from("couples")
          .select("invite_code, invite_used")
          .eq("id", coupleId)
          .maybeSingle();

        if (couple && !couple.invite_used) {
          setInviteLink(`${window.location.origin}/join/${couple.invite_code}`);
        }

        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, username")
        .eq("id", partnerMember.user_id)
        .maybeSingle();

      setPartner(profile?.username ? `@${profile.username}` : profile?.name ?? "your partner");
      setInviteLink(null);
    }

    async function loadInbox() {
      const { data } = await supabase
        .from("couple_invites")
        .select("id, couple_id, from_user_id, created_at, profiles:from_user_id(name, username)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      const invites = ((data ?? []) as InviteRow[]).map((invite) => ({
        ...invite,
        profiles: Array.isArray(invite.profiles) ? invite.profiles[0] ?? null : invite.profiles ?? null,
      }));

      setInbox(invites);
    }

    loadPartner();
    loadInbox();

    const channel = supabase
      .channel(`invite-inbox-${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "couple_invites" }, loadInbox)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  async function sendUsernameInvite() {
    const normalized = normalizeUsername(username);
    if (!normalized) return;
    if (!currentUserId) {
      setStatus("Please sign in again.");
      return;
    }

    setStatus("Finding user...");
    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", normalized)
      .maybeSingle();

    if (targetError || !target) {
      setStatus("No user found with that username.");
      return;
    }
    if (target.id === currentUserId) {
      setStatus("That's you.");
      return;
    }

    const { error } = await supabase.from("couple_invites").insert({
      couple_id: coupleId,
      from_user_id: currentUserId,
      to_user_id: target.id,
      status: "pending",
    });

    if (error) {
      setStatus(error.code === "23505" ? "Invite already sent." : "Could not send invite.");
      return;
    }

    setUsername("");
    setStatus(`Invite sent to @${normalized}`);
  }

  async function shareInvite() {
    if (!inviteLink) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my date planner",
          text: "Pick date ideas with me.",
          url: inviteLink,
        });
        return;
      }

      await navigator.clipboard.writeText(inviteLink);
      setStatus("Link copied");
    } catch {
      setStatus("Copy failed. Select the link manually.");
    }
  }

  async function acceptInvite(invite: PendingInvite) {
    if (!currentUserId) return;

    const { error: leaveError } = await supabase.from("couple_members").delete().eq("user_id", currentUserId);
    if (leaveError) {
      setStatus("Could not switch planners.");
      return;
    }

    const { error: memberError } = await supabase.from("couple_members").insert({
      couple_id: invite.couple_id,
      user_id: currentUserId,
      role: "member",
    });
    if (memberError) {
      setStatus("Could not join invite.");
      return;
    }

    await supabase.from("couple_invites").update({ status: "accepted" }).eq("id", invite.id);
    await supabase.from("couples").update({ invite_used: true }).eq("id", invite.couple_id);
    window.location.reload();
  }

  async function declineInvite(invite: PendingInvite) {
    await supabase.from("couple_invites").update({ status: "declined" }).eq("id", invite.id);
    setInbox((current) => current.filter((entry) => entry.id !== invite.id));
  }

  async function disconnect() {
    const confirmed = window.confirm("Leave this couple? You can join again with a new invite.");
    if (!confirmed) return;
    await leaveCouple();
    window.location.reload();
  }

  return (
    <div className="text-sm text-[#c9d4ea]">
      <div className="flex items-center gap-2 rounded-full border border-[#84a2ff]/14 bg-[#070b16]/72 px-3 py-2 shadow-xl shadow-black/20 backdrop-blur">
        <div className={`h-2.5 w-2.5 rounded-full ${partner ? "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.55)]" : "bg-[#68e7ff] shadow-[0_0_18px_rgba(104,231,255,0.55)]"}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{partner ? `Planning with ${partner}` : "Solo board"}</p>
        </div>
        {partner ? (
          <button
            onClick={disconnect}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#84a2ff]/20 bg-white/[0.03] px-3 text-xs font-semibold text-[#c9d4ea] transition hover:bg-[#68e7ff]/10 hover:text-[#68e7ff]"
          >
            <LogOut size={14} />
            Leave
          </button>
        ) : (
          <button
            onClick={() => setInviteOpen((open) => !open)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#68e7ff]/25 bg-[#68e7ff]/14 px-3 text-xs font-semibold text-[#68e7ff] transition hover:bg-[#68e7ff]/22"
          >
            <Send size={14} />
            Invite
          </button>
        )}
      </div>

      {!partner && inviteOpen && (
        <div className="mt-2 space-y-3 rounded-2xl border border-[#84a2ff]/14 bg-[#070b16]/88 p-3 shadow-xl shadow-black/25 backdrop-blur">
          <div>
            <div className="flex gap-2">
              <div className="flex min-w-0 flex-1 items-center rounded-xl border border-[#84a2ff]/15 bg-[#04070e]/70 px-3">
                <span className="text-[#8d98ad]">@</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") sendUsernameInvite();
                  }}
                  placeholder="username"
                  className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-[#edf3ff] outline-none placeholder:text-[#667087]"
                />
              </div>
              <button onClick={sendUsernameInvite} className="rounded-xl bg-[#68e7ff] px-3 text-sm font-semibold text-[#071016] transition hover:bg-[#9df4ff]">
                Send
              </button>
            </div>
          </div>

          {inviteLink && (
            <div>
              <div className="mt-2 flex gap-2">
                <div className="min-w-0 flex-1 truncate rounded-xl border border-[#84a2ff]/15 bg-[#04070e]/70 px-3 py-2 text-xs text-[#8d98ad]">{inviteLink}</div>
                <button
                  onClick={shareInvite}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#84a2ff]/18 bg-white/[0.03] px-2.5 text-xs font-semibold text-[#68e7ff] transition hover:bg-[#68e7ff]/10"
                >
                  <Copy size={14} />
                  Copy
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#8d98ad]">
              <Inbox size={13} />
              Inbox
            </div>
            <div className="mt-2 space-y-2">
              {inbox.length ? (
                inbox.map((invite) => (
                  <div key={invite.id} className="rounded-2xl border border-[#84a2ff]/15 bg-[#04070e]/55 p-3">
                    <p className="text-sm text-[#edf3ff]">
                      {invite.profiles?.username ? `@${invite.profiles.username}` : invite.profiles?.name ?? "Someone"} invited you
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => acceptInvite(invite)} className="rounded-xl bg-emerald-300/16 px-3 py-2 text-xs font-semibold text-emerald-100">
                        Accept
                      </button>
                      <button onClick={() => declineInvite(invite)} className="rounded-xl border border-[#84a2ff]/15 px-3 py-2 text-xs text-[#8d98ad]">
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-[#84a2ff]/15 px-3 py-3 text-xs text-[#667087]">No date invites yet.</p>
              )}
            </div>
          </div>

          {status && <p className="text-xs text-[#8d98ad]">{status}</p>}
        </div>
      )}
    </div>
  );
}
