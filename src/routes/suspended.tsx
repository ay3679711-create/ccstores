import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert, MessageSquare, UserPlus, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GlassCard, NeonHeading } from "@/components/cyber-ui";

export const Route = createFileRoute("/suspended")({
  ssr: false,
  head: () => ({ meta: [{ title: "Account Suspended — CC Whale" }] }),
  component: SuspendedPage,
});

function SuspendedPage() {
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ reason: string | null; until: string | null; cc_code: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { navigate({ to: "/auth", replace: true }); return; }
      const { data } = await supabase
        .from("profiles")
        .select("suspend_reason, suspended_until, is_suspended, cc_code")
        .eq("id", auth.user.id)
        .single();
      // If no longer suspended (or ban expired), bounce back to marketplace
      const stillBanned = !!data?.is_suspended && (!data.suspended_until || new Date(data.suspended_until) > new Date());
      if (!stillBanned) { navigate({ to: "/marketplace", replace: true }); return; }
      setInfo({ reason: data?.suspend_reason ?? null, until: data?.suspended_until ?? null, cc_code: data?.cc_code ?? null });
      setLoading(false);
    })();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (loading) return null;

  const permanent = !info?.until;
  const untilStr = info?.until ? new Date(info.until).toLocaleString() : null;

  return (
    <div className="min-h-screen grid place-items-center px-4 py-12 relative">
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      <GlassCard className="w-full max-w-lg p-8 relative border-destructive/40" glow>
        <div className="flex flex-col items-center text-center">
          <div className="size-16 rounded-full bg-destructive/20 grid place-items-center mb-4 ring-2 ring-destructive/50">
            <ShieldAlert className="size-8 text-destructive" />
          </div>
          <NeonHeading className="text-2xl mb-2">Your account is suspended</NeonHeading>
          {info?.cc_code && (
            <p className="text-xs font-mono text-muted-foreground mb-4">Account: {info.cc_code}</p>
          )}

          <div className="w-full rounded-md border border-destructive/30 bg-destructive/5 p-4 text-left mb-6">
            <p className="text-xs uppercase tracking-wider text-destructive mb-1">Reason</p>
            <p className="text-sm">{info?.reason || "No reason provided by admin."}</p>
            <p className="text-xs uppercase tracking-wider text-destructive mt-3 mb-1">Duration</p>
            <p className="text-sm">
              {permanent ? (
                <span className="text-destructive font-semibold">Permanent</span>
              ) : (
                <>Suspended until <span className="font-mono">{untilStr}</span></>
              )}
            </p>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            You have two options to continue:
          </p>

          <div className="grid sm:grid-cols-2 gap-3 w-full mb-4">
            <Button
              variant="outline"
              className="border-neon-cyan/40 hover:bg-neon-cyan/10"
              onClick={() => window.location.href = "mailto:ay3679711@gmail.com?subject=Account%20Unsuspend%20Request%20-%20" + (info?.cc_code ?? "")}
            >
              <MessageSquare className="size-4 mr-2" />
              Contact admin
            </Button>
            <Button
              variant="outline"
              className="border-neon-violet/40 hover:bg-neon-violet/10"
              onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth", search: { mode: "register" } }); }}
            >
              <UserPlus className="size-4 mr-2" />
              Create new account
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
            <LogOut className="size-3.5 mr-1.5" /> Sign out
          </Button>

          <p className="text-[10px] text-muted-foreground mt-6">
            <Link to="/" className="hover:text-neon-cyan">← Back to homepage</Link>
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
