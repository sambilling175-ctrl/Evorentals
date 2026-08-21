import { createClient } from "@/lib/supabase/server";

export interface CurrentUserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  designation: string | null;
  avatarUrl: string | null;
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const loadProfile = () => supabase
    .from("profiles")
    .select("id,email,full_name,role,designation,avatar_url")
    .eq("id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  let { data: profile, error: profileError } = await loadProfile();
  if (profileError && /jwt|token/i.test(profileError.message)) {
    // A newly issued Supabase token can briefly be ahead of the PostgREST
    // verifier clock. Refresh once before surfacing a real profile failure.
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError) ({ data: profile, error: profileError } = await loadProfile());
  }

  if (profileError) throw new Error(`Unable to load user profile: ${profileError.message}`);

  const metadataName = typeof user.user_metadata?.full_name === "string"
    ? user.user_metadata.full_name
    : null;
  const email = profile?.email ?? user.email ?? "Unknown email";

  return {
    id: user.id,
    email,
    fullName: profile?.full_name ?? metadataName ?? email.split("@")[0],
    role: profile?.role ?? "employee",
    designation: profile?.designation ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  };
}
