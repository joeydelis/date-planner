import { supabase } from "@/lib/supabase";

export type UserProfile = {
  id: string;
  name: string | null;
  username: string | null;
};

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, "");
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, username")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) {
    if (error.code === "42703" || error.code === "42P01" || error.code === "PGRST205") return null;
    throw error;
  }
  return data as UserProfile | null;
}

export async function saveMyUsername(username: string) {
  const normalized = normalizeUsername(username);
  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
    throw new Error("Use 3-20 letters, numbers, or underscores.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Please sign in again.");

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userData.user.id,
        name: userData.user.email?.split("@")[0] ?? normalized,
        username: normalized,
      },
      { onConflict: "id" }
    );

  if (error) {
    if (error.code === "42703" || error.code === "42P01") {
      throw new Error("Run supabase/add-username-invites.sql in Supabase first.");
    }
    if (error.code === "23505") throw new Error("That username is already taken.");
    throw error;
  }

  return normalized;
}
