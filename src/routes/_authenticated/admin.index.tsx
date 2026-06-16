import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Package, ShoppingBag, DollarSign, Activity, TrendingUp, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard, CountUp } from "@/components/cyber-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

      const [users, products, orders, revenue, todayUsers, monthUsers, pendingPayments, recentOrders] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total, order_items(product_id, products(name, category_id, categories(name)))").eq("status", "completed"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "under_review"),
        supabase.from("orders").select("id, total, status, created_at, user_id, profiles(cc_code, full_name)").order("created_at", { ascending: false }).limit(8),
      ]);

      const totalRev = (revenue.data ?? []).reduce((s, o: any) => s + Number(o.total), 0);

      // Revenue breakdown by category
      const byCategory: Record<string, number> = {};
      const byProduct: Record<string, number> = {};
      (revenue.data ?? []).forEach((o: any) => {
        const per = Number(o.total) / Math.max(1, (o.order_items ?? []).length);
        (o.order_items ?? []).forEach((it: any) => {
          const cat = it.products?.categories?.name ?? "Uncategorized";
          const prod = it.products?.name ?? "Unknown";
          byCategory[cat] = (byCategory[cat] ?? 0) + per;
          byProduct[prod] = (byProduct[prod] ?? 0) + per;
        });
      });

      return {
        users: users.count ?? 0,
        products: products.count ?? 0,
        orders: orders.count ?? 0,
        revenue: totalRev,
        todayUsers: todayUsers.count ?? 0,
        monthUsers: monthUsers.count ?? 0,
        pendingPayments: pendingPayments.count ?? 0,
        byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
        byProduct: Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 6),
        recentOrders: recentOrders.data ?? [],
      };
    },
  });

  const cards = [
    { label: "Total Users", value: data?.users ?? 0, icon: Users, color: "neon-cyan", to: "/admin/users" },
    { label: "Today's Signups", value: data?.todayUsers ?? 0, icon: TrendingUp, color: "neon-blue", to: "/admin/users" },
    { label: "Monthly Signups", value: data?.monthUsers ?? 0, icon: Activity, color: "neon-violet", to: "/admin/users" },
    { label: "Products", value: data?.products ?? 0, icon: Package, color: "neon-pink", to: "/admin/products" },
    { label: "Orders", value: data?.orders ?? 0, icon: ShoppingBag, color: "neon-cyan", to: "/admin/orders" },
    { label: "Revenue", value: data?.revenue ?? 0, icon: DollarSign, color: "neon-blue", prefix: "$", to: "/admin/orders" },
    { label: "Pending Payments", value: data?.pendingPayments ?? 0, icon: Activity, color: "neon-pink", to: "/admin/payments" },
  ];

  const maxCat = data?.byCategory[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      {/* Quick switch to user view */}
      <div className="flex justify-end">
        <Link to="/marketplace">
          <Button size="sm" variant="outline" className="border-neon-cyan/40 text-neon-cyan">
            <Eye className="size-3.5 mr-1.5" /> View as user
          </Button>
        </Link>
      </div>

      {/* Metric cards (clickable) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <GlassCard className="p-5 hover:border-neon-cyan/40 cursor-pointer transition-colors h-full">
              <c.icon className={`size-5 text-${c.color} mb-2`} />
              <div className="text-2xl font-display font-bold">
                <CountUp to={c.value} prefix={c.prefix} />
              </div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </GlassCard>
          </Link>
        ))}
      </div>

      {/* Revenue breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <h3 className="font-display text-sm uppercase tracking-wider text-neon-cyan mb-3">Revenue by Category</h3>
          {data?.byCategory.length === 0 && <p className="text-xs text-muted-foreground">No completed orders yet.</p>}
          <div className="space-y-2">
            {data?.byCategory.map(([name, val]) => (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{name}</span>
                  <span className="font-mono text-neon-cyan">${val.toFixed(2)}</span>
                </div>
                <div className="h-1.5 bg-surface rounded overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-violet" style={{ width: `${(val / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="font-display text-sm uppercase tracking-wider text-neon-violet mb-3">Top Earning Products</h3>
          {data?.byProduct.length === 0 && <p className="text-xs text-muted-foreground">No data yet.</p>}
          <ul className="space-y-2 text-sm">
            {data?.byProduct.map(([name, val], i) => (
              <li key={name} className="flex justify-between items-center">
                <span className="flex items-center gap-2"><span className="text-neon-violet font-mono text-xs">#{i + 1}</span>{name}</span>
                <span className="font-mono text-neon-cyan">${val.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      {/* Recent orders */}
      <GlassCard className="p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-display text-sm uppercase tracking-wider text-neon-pink">Recent Orders</h3>
          <Link to="/admin/orders" className="text-xs text-neon-cyan hover:underline">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">User</th>
                <th className="text-left">Total</th>
                <th className="text-left">Status</th>
                <th className="text-left">When</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentOrders.map((o: any) => (
                <tr key={o.id} className="border-t border-border/30 hover:bg-white/5">
                  <td className="p-2">
                    <Link to="/admin/users" className="text-neon-cyan hover:underline font-mono text-xs">
                      {o.profiles?.cc_code ?? "—"}
                    </Link>
                    <div className="text-xs text-muted-foreground">{o.profiles?.full_name}</div>
                  </td>
                  <td className="font-mono text-neon-cyan">${Number(o.total).toFixed(2)}</td>
                  <td><span className="text-xs px-2 py-0.5 rounded bg-surface">{o.status}</span></td>
                  <td className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {(!data?.recentOrders || data.recentOrders.length === 0) && (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground text-xs">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
