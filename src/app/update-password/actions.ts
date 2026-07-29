"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (password.length < 8) {
    redirect("/update-password?error=Password+must+be+at+least+8+characters");
  }
  if (password !== confirmation) {
    redirect("/update-password?error=Passwords+do+not+match");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=Reset+link+is+invalid+or+has+expired");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/update-password?error=${encodeURIComponent(error.message)}`);

  await supabase.auth.signOut();
  redirect("/login?message=Password+updated.+Sign+in+with+your+new+password");
}
