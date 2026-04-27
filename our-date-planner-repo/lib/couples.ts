import { supabase } from "@/lib/supabase";

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getUserCoupleId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.couple_id ?? null;
}

export async function createCouple() {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in to create a couple.");

  const existingCoupleId = await getUserCoupleId();
  if (existingCoupleId) {
    const { data } = await supabase
      .from("couples")
      .select("*")
      .eq("id", existingCoupleId)
      .single();
    return data;
  }

  const inviteCode = crypto.randomUUID();

  const { data: couple, error: coupleError } = await supabase
    .from("couples")
    .insert({ invite_code: inviteCode, invite_used: false })
    .select()
    .single();

  if (coupleError) throw coupleError;

  const { error: memberError } = await supabase.from("couple_members").insert({
    couple_id: couple.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) throw memberError;
  return couple;
}

export async function joinCoupleByInvite(inviteCode: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Please log in before joining an invite.");

  const existingCoupleId = await getUserCoupleId();
  if (existingCoupleId) throw new Error("You're already connected to a couple.");

  const { data: couple, error: coupleError } = await supabase
    .from("couples")
    .select("*")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (coupleError) throw coupleError;
  if (!couple) throw new Error("This invite link is invalid.");
  if (couple.invite_used) throw new Error("This invite link has already been used.");

  const { count, error: countError } = await supabase
    .from("couple_members")
    .select("*", { count: "exact", head: true })
    .eq("couple_id", couple.id);

  if (countError) throw countError;
  if ((count ?? 0) >= 2) throw new Error("This couple is already full.");

  const { error: memberError } = await supabase.from("couple_members").insert({
    couple_id: couple.id,
    user_id: user.id,
    role: "member",
  });

  if (memberError) throw memberError;

  const { error: updateError } = await supabase
    .from("couples")
    .update({ invite_used: true })
    .eq("id", couple.id);

  if (updateError) throw updateError;
  return couple;
}

export async function leaveCouple() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not logged in.");

  const { error } = await supabase
    .from("couple_members")
    .delete()
    .eq("user_id", user.id);

  if (error) throw error;
}
