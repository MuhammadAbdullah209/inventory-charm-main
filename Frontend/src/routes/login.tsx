import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api, setToken, setUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Boxes } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Inventory" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const data = await api<{ token: string; user?: unknown; name?: string; role?: string }>(
        "/Api/login",
        { method: "POST", body: JSON.stringify({ email, password }) },
      );
      const userPayload = data.user ?? { name: data.name, role: data.role, email };
      if (data.token) setToken(data.token);
      setUser(userPayload);
      const role = (userPayload as { role?: string }).role?.toLowerCase();
      navigate({ to: role === "staff" ? "/billing" : "/" });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border">
        <CardContent className="p-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Boxes className="size-5" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">Inventory</div>
              <div className="text-xs text-muted-foreground -mt-0.5">Sign in to continue</div>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <LoadingSpinner label="Signing in…" className="justify-center" /> : "Sign in"}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}