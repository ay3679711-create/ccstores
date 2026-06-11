import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { GlassCard, NeonHeading } from "@/components/cyber-ui";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
});

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  awaiting_payment: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  payment_submitted: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  under_review: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  verified: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  delivered: "bg-green-500/20 text-green-300 border-green-500/30",
  completed: "bg-green-500/20 text-green-300 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
};

function OrdersPage() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <NeonHeading className="text-3xl mb-2">My orders</NeonHeading>
        <p className="text-sm text-muted-foreground mb-8">Track every transaction across the marketplace.</p>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="glass rounded-2xl h-24 animate-pulse" />)}</div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((o: any) => (
              <Link key={o.id} to="/orders/$id" params={{ id: o.id }}>
                <GlassCard className="p-5 hover:border-neon-cyan/50 transition-colors">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-neon-cyan">{o.order_number}</span>
                        <Badge className={STATUS_COLORS[o.status]} variant="outline">{o.status.replace("_", " ")}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {o.order_items?.length ?? 0} item(s) • {new Date(o.created_at).toLocaleString()}
                      </div>
                      <div className="text-xs mt-2 line-clamp-1">{o.order_items?.[0]?.product_title}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xl font-bold neon-text-cyan">${o.total}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{o.currency}</div>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        ) : (
          <GlassCard className="p-12 text-center text-muted-foreground">
            <Package className="size-10 mx-auto mb-3 opacity-50" />
            <p className="mb-3">No orders yet</p>
            <Link to="/marketplace" className="text-neon-cyan hover:underline text-sm">Browse the marketplace →</Link>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
