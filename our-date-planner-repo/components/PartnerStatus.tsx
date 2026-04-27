"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  coupleId: string;
};

export default function PartnerStatus({ coupleId }: Props) {
  const [partner, setPartner] = useState<string | null>(null);

  useEffect(() => {
    async function loadPartner() {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id;
      if (!currentUserId) return;

      const { data: members } = await supabase
        .from("couple_members")
        .select("user_id")
        .eq("couple_id", coupleId);

      const partnerMember = members?.find((member) => member.user_id !== currentUserId);
      if (!partnerMember) {
        setPartner(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", partnerMember.user_id)
        .maybeSingle();

      setPartner(profile?.name ?? "your partner");
    }

    loadPartner();
  }, [coupleId]);

  return (
    <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-zinc-300">
      {partner ? <>Connected to ❤️ <span className="font-semibold text-white">{partner}</span></> : "No partner connected yet"}
    </div>
  );
}
