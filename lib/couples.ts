import { supabase } from "@/lib/supabase";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

function throwSupabaseError(error: unknown, fallback: string): never {
  console.error(fallback, error);
  throw new Error(getErrorMessage(error, fallback));
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throwSupabaseError(error, "Could not load the current user.");
  return data.user;
}

export async function getUserCoupleId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throwSupabaseError(error, "Could not load your couple.");
  return data?.[0]?.couple_id ?? null;
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

  const coupleId = crypto.randomUUID();
  const inviteCode = crypto.randomUUID();

  const { error: coupleError } = await supabase.from("couples").insert({
    id: coupleId,
    invite_code: inviteCode,
    invite_used: false,
  });

  if (coupleError) throwSupabaseError(coupleError, "Could not create invite.");

  const { error: memberError } = await supabase.from("couple_members").insert({
    couple_id: coupleId,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) throwSupabaseError(memberError, "Could not add you to the couple.");

  return {
    id: coupleId,
    invite_code: inviteCode,
    invite_used: false,
  };
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

  if (coupleError) throwSupabaseError(coupleError, "Could not load invite.");
  if (!couple) throw new Error("This invite link is invalid.");
  if (couple.invite_used) throw new Error("This invite link has already been used.");

  const { count, error: countError } = await supabase
    .from("couple_members")
    .select("*", { count: "exact", head: true })
    .eq("couple_id", couple.id);

  if (countError) throwSupabaseError(countError, "Could not check invite members.");
  if ((count ?? 0) >= 2) throw new Error("This couple is already full.");

  const { error: memberError } = await supabase.from("couple_members").insert({
    couple_id: couple.id,
    user_id: user.id,
    role: "member",
  });

  if (memberError) throwSupabaseError(memberError, "Could not join couple.");

  const { error: updateError } = await supabase
    .from("couples")
    .update({ invite_used: true })
    .eq("id", couple.id);

  if (updateError) throwSupabaseError(updateError, "Could not mark invite as used.");
  return couple;
}

export async function leaveCouple() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not logged in.");

  const { error } = await supabase
    .from("couple_members")
    .delete()
    .eq("user_id", user.id);

  if (error) throwSupabaseError(error, "Could not leave couple.");
}
