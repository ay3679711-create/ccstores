import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { GlassCard, NeonHeading } from "@/components/cyber-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotifPage,
});

function NotifPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const markAllRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user!.id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <NeonHeading className="text-3xl">Notifications</NeonHeading>
          <Button variant="outline" size="sm" onClick={markAllRead}><Check className="size-4 mr-1" /> Mark all read</Button>
        </div>
        {data && data.length > 0 ? (
          <div className="space-y-2">
            {data.map((n) => (
              <GlassCard key={n.id} className={`p-4 ${!n.is_read ? "border-neon-cyan/40" : ""}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-neon-cyan font-mono uppercase">{n.type}</div>
                    <h3 className="font-semibold mt-1">{n.title}</h3>
                    {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="p-12 text-center text-muted-foreground">
            <Bell className="size-10 mx-auto mb-3 opacity-50" />
            No notifications yet.
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
