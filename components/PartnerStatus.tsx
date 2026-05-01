"use client";

import { Copy, Inbox, LogOut, Send, UserRoundCheck, UserRoundPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeUsername } from "@/lib/profiles";
import { leaveCouple } from "@/lib/couples";

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
    <div className="rounded-lg border border-[#f3bfd0] bg-white/75 px-4 py-3 text-sm text-[#6f4d63] shadow-xl shadow-[#e06f92]/10 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${partner ? "bg-[#b8f3df] text-[#24866f]" : "bg-[#ffe36e] text-[#8a6514]"}`}>
          {partner ? <UserRoundCheck size={18} /> : <UserRoundPlus size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#3f2a39]">{partner ? `Planning with ${partner}` : "Solo date board"}</p>
          <p className="truncate text-xs text-[#9a7187]">{partner ? "Shared ideas stay synced." : "Invite someone when a date deserves two calendars."}</p>
        </div>
        {partner ? (
          <button
            onClick={disconnect}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#f3bfd0] bg-white/70 px-3 text-xs font-semibold text-[#8b687e] transition hover:border-[#e06f92] hover:bg-[#fff0f5] hover:text-[#c7466f]"
          >
            <LogOut size={14} />
            Leave
          </button>
        ) : (
          <button
            onClick={() => setInviteOpen((open) => !open)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#ffd67d] bg-[#fff3bf] px-3 text-xs font-semibold text-[#6e4d09] transition hover:bg-[#ffe36e]"
          >
            <Send size={14} />
            Invite
          </button>
        )}
      </div>

      {!partner && inviteOpen && (
        <div className="mt-4 space-y-4 border-t border-[#f3bfd0] pt-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e06f92]">Invite by username</p>
            <div className="mt-2 flex gap-2">
              <div className="flex min-w-0 flex-1 items-center rounded-lg border border-[#f3bfd0] bg-white/80 px-3">
                <span className="text-[#c77d9a]">@</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") sendUsernameInvite();
                  }}
                  placeholder="username"
                  className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-[#493343] outline-none placeholder:text-[#c9a7b8]"
                />
              </div>
              <button onClick={sendUsernameInvite} className="rounded-lg bg-[#ff8fab] px-3 text-sm font-semibold text-white transition hover:bg-[#f7729b]">
                Send
              </button>
            </div>
          </div>

          {inviteLink && (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a7187]">Invite link</p>
              <div className="mt-2 flex gap-2">
                <div className="min-w-0 flex-1 truncate rounded-lg border border-[#f3bfd0] bg-white/80 px-3 py-2.5 text-xs text-[#8b687e]">{inviteLink}</div>
                <button
                  onClick={shareInvite}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#f3bfd0] bg-white/80 px-3 text-sm font-semibold text-[#d65b82] transition hover:bg-[#fff0f5]"
                >
                  <Copy size={15} />
                  Copy
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#9a7187]">
              <Inbox size={13} />
              Inbox
            </div>
            <div className="mt-2 space-y-2">
              {inbox.length ? (
                inbox.map((invite) => (
                  <div key={invite.id} className="rounded-lg border border-[#f3bfd0] bg-white/80 p-3">
                    <p className="text-sm text-[#493343]">
                      {invite.profiles?.username ? `@${invite.profiles.username}` : invite.profiles?.name ?? "Someone"} invited you
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => acceptInvite(invite)} className="rounded-md bg-[#b8f3df] px-3 py-2 text-xs font-semibold text-[#206b59]">
                        Accept
                      </button>
                      <button onClick={() => declineInvite(invite)} className="rounded-md border border-[#f3bfd0] px-3 py-2 text-xs text-[#8b687e]">
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-[#f3bfd0] px-3 py-3 text-xs text-[#b48ca0]">No date invites yet.</p>
              )}
            </div>
          </div>

          {status && <p className="text-xs text-[#8b687e]">{status}</p>}
        </div>
      )}
    </div>
  );
}
