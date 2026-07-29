"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetPasswordRequestFormProps = {
  initialError: string | null;
  initialSent: boolean;
};

export function ResetPasswordRequestForm({
  initialError,
  initialSent,
}: ResetPasswordRequestFormProps) {
  const [error, setError] = useState<string | null>(initialError);
  const [sent, setSent] = useState(initialSent);
  const [isSending, setIsSending] = useState(false);

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    setIsSending(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
    window.history.replaceState(null, "", "/forgot-password?sent=1");
  }

  return (
    <main className="grid min-h-screen w-full place-items-center bg-[radial-gradient(circle_at_top,#12304a_0%,#07111f_45%,#030812_100%)] p-4">
      <Card className="w-full max-w-md border-cyan-500/20 bg-card/95 shadow-2xl">
        <CardHeader className="items-center text-center">
          <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-slate-950">
            <Zap className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your account email and we will send a secure reset link.
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                If an account exists for that email, a password reset link has been sent.
              </p>
              <Button asChild className="w-full"><Link href="/login">Back to sign in</Link></Button>
            </div>
          ) : (
            <form onSubmit={requestPasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
              </div>
              {error && (
                <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isSending}>
                {isSending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSending ? "Sending reset link..." : "Send reset link"}
              </Button>
              <Link className="block text-center text-sm text-blue-400 hover:text-blue-300 hover:underline" href="/login">
                Back to sign in
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
