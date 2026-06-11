import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, MessageSquare, Wallet, Clock, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { GlassCard, NeonHeading } from "@/components/cyber-ui";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [orders, notif] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact" }).eq("user_id", user!.id),
        supabase.from("notifications").select("*", { count: "exact" }).eq("user_id", user!.id).eq("is_read", false),
      ]);
      return {
        totalOrders: orders.count ?? 0,
        unreadNotif: notif.count ?? 0,
        recentOrders: orders.data?.slice(0, 5) ?? [],
      };
    },
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="size-16 ring-2 ring-neon-cyan/40">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-surface text-lg">{profile?.full_name?.[0] ?? "U"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-neon-cyan">// Welcome back</p>
            <NeonHeading className="text-2xl sm:text-3xl">{profile?.full_name ?? "User"}</NeonHeading>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30">{profile?.cc_code}</Badge>
              <span className="text-xs text-muted-foreground">Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ""}</span>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link to="/orders"><GlassCard className="p-5 hover:border-neon-cyan/50 transition-colors">
            <ShoppingBag className="size-5 text-neon-cyan mb-2" />
            <div className="text-2xl font-display font-bold">{stats?.totalOrders ?? 0}</div>
            <div className="text-xs text-muted-foreground">Total orders</div>
          </GlassCard></Link>
          <GlassCard className="p-5">
            <Package className="size-5 text-neon-violet mb-2" />
            <div className="text-2xl font-display font-bold">0</div>
            <div className="text-xs text-muted-foreground">Purchases</div>
          </GlassCard>
          <Link to="/notifications"><GlassCard className="p-5 hover:border-neon-cyan/50 transition-colors">
            <MessageSquare className="size-5 text-neon-pink mb-2" />
            <div className="text-2xl font-display font-bold">{stats?.unreadNotif ?? 0}</div>
            <div className="text-xs text-muted-foreground">Notifications</div>
          </GlassCard></Link>
          <GlassCard className="p-5">
            <Wallet className="size-5 text-neon-blue mb-2" />
            <div className="text-2xl font-display font-bold">$0</div>
            <div className="text-xs text-muted-foreground">Wallet balance</div>
          </GlassCard>
        </div>

        {/* Recent orders */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><Activity className="size-4 text-neon-cyan" /> Recent activity</h3>
            <Link to="/orders" className="text-xs text-neon-cyan hover:underline">View all</Link>
          </div>
          {stats?.recentOrders.length ? (
            <div className="space-y-2">
              {stats.recentOrders.map((o: any) => (
                <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <Clock className="size-4 text-muted-foreground" />
                    <div>
                      <div className="font-mono text-xs text-neon-cyan">{o.order_number}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">${o.total}</div>
                    <Badge variant="outline" className="text-[10px]">{o.status.replace("_", " ")}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No orders yet. <Link to="/marketplace" className="text-neon-cyan hover:underline">Explore the marketplace</Link></p>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
