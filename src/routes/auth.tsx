import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/app-shell";
import { GlassCard, NeonHeading } from "@/components/cyber-ui";

const searchSchema = z.object({ mode: z.enum(["login", "register"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign In — CC Whale" },
      { name: "description", content: "Access your CC Whale marketplace account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">(search.mode ?? "login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "", fullName: "", phone: "" });

  useEffect(() => { setMode(search.mode ?? "login"); }, [search.mode]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        if (form.password !== form.confirmPassword) { toast.error("Passwords don't match"); return; }
        if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: form.fullName, phone: form.phone },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome to the grid");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        toast.success("Authenticated");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
      if (result.error) { toast.error(result.error.message ?? "Google sign-in failed"); return; }
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } finally { setLoading(false); }
  };

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-4 py-12 relative">
        <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
          <GlassCard className="p-8" glow>
            <div className="text-center mb-6">
              <div className="inline-flex size-12 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-violet mb-4 shadow-[0_0_30px_oklch(0.85_0.18_200_/_0.4)]" />
              <NeonHeading className="text-2xl">{mode === "login" ? "Access terminal" : "Initialize account"}</NeonHeading>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "login" ? "Welcome back to CC Whale" : "Join the marketplace"}
              </p>
            </div>

            <Button type="button" onClick={handleGoogle} disabled={loading} variant="outline" className="w-full mb-4 border-border/60 hover:bg-white/5">
              <svg className="size-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.5h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.7 3.2-8.2z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.7 1.1-2.8 0-5.2-1.9-6-4.5H2.2v2.8C4 19.9 7.7 23 12 23z"/><path fill="#FBBC05" d="M6 14.3c-.2-.7-.4-1.4-.4-2.3s.1-1.5.4-2.3V7H2.2C1.4 8.5 1 10.2 1 12s.4 3.5 1.2 5l3.8-2.7z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.4 2.1 14.9 1 12 1 7.7 1 4 4.1 2.2 8.4L6 11.1c.8-2.6 3.2-4.5 6-4.5z"/></svg>
              Continue with Google
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-[10px] font-mono uppercase"><span className="bg-card px-2 text-muted-foreground">or with email</span></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              {mode === "register" && (
                <>
                  <div>
                    <Label className="text-xs">Full name</Label>
                    <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required maxLength={100} className="bg-input/40" />
                  </div>
                  <div>
                    <Label className="text-xs">Phone (optional)</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" maxLength={20} className="bg-input/40" />
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" required maxLength={255} className="bg-input/40" />
              </div>
              <div>
                <Label className="text-xs">Password</Label>
                <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" required minLength={6} maxLength={72} className="bg-input/40" />
              </div>
              {mode === "register" && (
                <div>
                  <Label className="text-xs">Confirm password</Label>
                  <Input value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} type="password" required minLength={6} maxLength={72} className="bg-input/40" />
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_24px_oklch(0.85_0.18_200_/_0.3)]">
                {loading ? "Processing..." : mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <p className="text-center mt-6 text-sm text-muted-foreground">
              {mode === "login" ? "New here?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-neon-cyan hover:underline font-semibold"
              >
                {mode === "login" ? "Create account" : "Sign in"}
              </button>
            </p>
            <p className="text-center mt-2 text-xs">
              <Link to="/" className="text-muted-foreground hover:text-neon-cyan">← Back to home</Link>
            </p>
          </GlassCard>
        </motion.div>
      </div>
    </AppShell>
  );
}
