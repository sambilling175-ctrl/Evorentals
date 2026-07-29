import { Zap } from "lucide-react";
import { updatePassword } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen w-full place-items-center bg-[radial-gradient(circle_at_top,#12304a_0%,#07111f_45%,#030812_100%)] p-4">
      <Card className="w-full max-w-md border-cyan-500/20 bg-card/95 shadow-2xl">
        <CardHeader className="items-center text-center">
          <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-slate-950">
            <Zap className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Choose a new password</CardTitle>
          <p className="text-sm text-muted-foreground">Use at least 8 characters.</p>
        </CardHeader>
        <CardContent>
          <form action={updatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirm new password</Label>
              <Input id="confirmation" name="confirmation" type="password" minLength={8} autoComplete="new-password" required />
            </div>
            {error && (
              <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">Update password</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
