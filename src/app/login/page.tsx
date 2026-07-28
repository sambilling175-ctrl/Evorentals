import { Zap } from "lucide-react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next = "/" } = await searchParams;
  return (
    <main className="grid min-h-screen w-full place-items-center bg-[radial-gradient(circle_at_top,#12304a_0%,#07111f_45%,#030812_100%)] p-4">
      <Card className="w-full max-w-md border-cyan-500/20 bg-card/95 shadow-2xl">
        <CardHeader className="items-center text-center">
          <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-slate-950">
            <Zap className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Evo Rentals ERP</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to manage rental operations</p>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {error && (
              <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
