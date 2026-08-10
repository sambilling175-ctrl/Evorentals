"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthCallbackPage() {
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const completeRecovery = async () => {
      const supabase = createClient();
      const searchParams = new URLSearchParams(window.location.search);
      const requestedNext = searchParams.get("next") ?? "/update-password";
      const next = requestedNext.startsWith("/") ? requestedNext : "/update-password";
      const code = searchParams.get("code");
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const authError = hash.get("error_description") ?? searchParams.get("error_description");

      if (authError) {
        router.replace(`/forgot-password?error=${encodeURIComponent(authError)}`);
        return;
      }

      const { error } =
        accessToken && refreshToken
          ? await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
          : code
            ? await supabase.auth.exchangeCodeForSession(code)
            : { error: new Error("Reset link is invalid or has expired") };

      if (error) {
        router.replace(`/forgot-password?error=${encodeURIComponent(error.message)}`);
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace(
          `/forgot-password?error=${encodeURIComponent(userError?.message ?? "Unable to establish the recovery session")}`,
        );
        return;
      }

      // A hard navigation guarantees the cookie-backed session written by
      // setSession is available to the route proxy before it protects the
      // update-password page. It also removes fragment credentials from view.
      window.location.replace(next);
    };

    void completeRecovery();
  }, [router]);

  return (
    <main className="grid min-h-screen w-full place-items-center bg-[radial-gradient(circle_at_top,#12304a_0%,#07111f_45%,#030812_100%)] p-4">
      <Card className="w-full max-w-md border-cyan-500/20 bg-card/95 shadow-2xl">
        <CardHeader className="items-center text-center">
          <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-slate-950">
            <Zap className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Verifying reset link</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          Please wait while we secure your password recovery session.
        </CardContent>
      </Card>
    </main>
  );
}
