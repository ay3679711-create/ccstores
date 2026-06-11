import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Package, ShoppingBag, DollarSign, Activity, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/cyber-ui";
import { CountUp } from "@/components/cyber-ui";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

      const [users, products, orders, revenue, todayUsers, monthUsers, pendingPayments] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total").eq("status", "completed"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "under_review"),
      ]);

      const totalRev = (revenue.data ?? []).reduce((s, o: any) => s + Number(o.total), 0);
      return {
        users: users.count ?? 0,
        products: products.count ?? 0,
        orders: orders.count ?? 0,
        revenue: totalRev,
        todayUsers: todayUsers.count ?? 0,
        monthUsers: monthUsers.count ?? 0,
        pendingPayments: pendingPayments.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Total Users", value: data?.users ?? 0, icon: Users, color: "neon-cyan" },
    { label: "Today's Signups", value: data?.todayUsers ?? 0, icon: TrendingUp, color: "neon-blue" },
    { label: "Monthly Signups", value: data?.monthUsers ?? 0, icon: Activity, color: "neon-violet" },
    { label: "Products", value: data?.products ?? 0, icon: Package, color: "neon-pink" },
    { label: "Orders", value: data?.orders ?? 0, icon: ShoppingBag, color: "neon-cyan" },
    { label: "Revenue", value: data?.revenue ?? 0, icon: DollarSign, color: "neon-blue", prefix: "$" },
    { label: "Pending Payments", value: data?.pendingPayments ?? 0, icon: Activity, color: "neon-pink" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <GlassCard key={c.label} className="p-5">
          <c.icon className={`size-5 text-${c.color} mb-2`} />
          <div className="text-2xl font-display font-bold">
            <CountUp to={c.value} prefix={c.prefix} />
          </div>
          <div className="text-xs text-muted-foreground">{c.label}</div>
        </GlassCard>
      ))}
    </div>
  );
}
