import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Shield, ShieldOff, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/cyber-ui";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false }).limit(100);
      if (q) query = query.or(`cc_code.ilike.%${q}%,full_name.ilike.%${q}%,email.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const toggleSuspend = async (id: string, currently: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_suspended: !currently }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(currently ? "User activated" : "User suspended");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      toast.success("Removed admin role");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      toast.success("Granted admin role");
    }
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <div>
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search by code, name, email..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-10 bg-input/40" />
      </div>
      <GlassCard className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/40 text-xs font-mono uppercase">
            <tr><th className="p-3 text-left">Code</th><th className="text-left">User</th><th className="text-left">Email</th><th className="text-left">Joined</th><th className="text-left">Status</th><th className="text-left">Actions</th></tr>
          </thead>
          <tbody>
            {users?.map((u: any) => {
              const isAdmin = u.user_roles?.some((r: any) => r.role === "admin");
              return (
                <tr key={u.id} className="border-t border-border/40 hover:bg-white/5">
                  <td className="p-3 font-mono text-neon-cyan text-xs">{u.cc_code}</td>
                  <td>{u.full_name}</td>
                  <td className="text-muted-foreground text-xs">{u.email}</td>
                  <td className="text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    {u.is_suspended ? <Badge variant="destructive">Suspended</Badge> : <Badge className="bg-green-500/20 text-green-300">Active</Badge>}
                    {isAdmin && <Badge className="ml-1 bg-neon-violet/20 text-neon-violet">Admin</Badge>}
                  </td>
                  <td className="flex gap-1 p-3">
                    <Button size="sm" variant="ghost" onClick={() => toggleSuspend(u.id, u.is_suspended)}>
                      {u.is_suspended ? <Shield className="size-3.5" /> : <ShieldOff className="size-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleAdmin(u.id, isAdmin)} title={isAdmin ? "Revoke admin" : "Grant admin"}>
                      <Shield className={`size-3.5 ${isAdmin ? "text-neon-violet" : ""}`} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
