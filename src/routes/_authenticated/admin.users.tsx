import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Shield, Ban, ShieldCheck, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlassCard } from "@/components/cyber-ui";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

type BanTarget = { id: string; cc_code: string; full_name: string | null };

function AdminUsers() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const [banTarget, setBanTarget] = useState<BanTarget | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<string>("permanent");
  const [banning, setBanning] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  const submitBan = async () => {
    if (!banTarget) return;
    if (!banReason.trim()) { toast.error("Reason is required"); return; }
    setBanning(true);
    let until: string | null = null;
    if (banDuration !== "permanent") {
      const hours = parseInt(banDuration, 10);
      until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    }
    const { error } = await supabase.from("profiles").update({
      is_suspended: true,
      suspend_reason: banReason.trim().slice(0, 500),
      suspended_at: new Date().toISOString(),
      suspended_until: until,
    }).eq("id", banTarget.id);
    setBanning(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Suspended ${banTarget.cc_code}`);
    setBanTarget(null); setBanReason(""); setBanDuration("permanent");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const unsuspend = async (id: string, code: string) => {
    const { error } = await supabase.from("profiles").update({
      is_suspended: false, suspend_reason: null, suspended_until: null, suspended_at: null,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Unsuspended ${code}`);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) { toast.error(error.message); return; }
      toast.success("Removed admin role");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) { toast.error(error.message); return; }
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
      <GlassCard className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface/40 text-xs font-mono uppercase">
            <tr>
              <th className="p-3 w-8"></th>
              <th className="text-left">Code</th>
              <th className="text-left">User</th>
              <th className="text-left">Email</th>
              <th className="text-left">Joined</th>
              <th className="text-left">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u: any) => {
              const isAdmin = u.user_roles?.some((r: any) => r.role === "admin");
              const banActive = u.is_suspended && (!u.suspended_until || new Date(u.suspended_until) > new Date());
              return (
                <>
                <tr key={u.id} className="border-t border-border/40 hover:bg-white/5 align-top">
                  <td className="p-3">
                    <button onClick={() => setExpanded((p) => ({ ...p, [u.id]: !p[u.id] }))} className="text-muted-foreground hover:text-neon-cyan">
                      {expanded[u.id] ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>
                  </td>
                  <td className="font-mono text-neon-cyan text-xs">{u.cc_code}</td>
                  <td className="py-3">{u.full_name ?? "—"}</td>
                  <td className="text-muted-foreground text-xs py-3">{u.email}</td>
                  <td className="text-xs py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-3">
                    {banActive ? (
                      <div className="flex flex-col gap-1">
                        <Badge variant="destructive">Suspended</Badge>
                        {u.suspended_until ? (
                          <span className="text-[10px] text-muted-foreground">until {new Date(u.suspended_until).toLocaleString()}</span>
                        ) : (
                          <span className="text-[10px] text-destructive">Permanent</span>
                        )}
                        {u.suspend_reason && <span className="text-[10px] text-muted-foreground italic max-w-[180px] truncate" title={u.suspend_reason}>{u.suspend_reason}</span>}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <Badge className="bg-green-500/20 text-green-300">Active</Badge>
                        {u.has_special_badge && <Badge className="bg-yellow-500/20 text-yellow-300">★ Special Badge</Badge>}
                      </div>
                    )}
                    {isAdmin && <Badge className="ml-1 bg-neon-violet/20 text-neon-violet">Admin</Badge>}
                  </td>
                  <td className="flex flex-wrap gap-1 p-3">
                    {banActive ? (
                      <Button size="sm" variant="ghost" onClick={() => unsuspend(u.id, u.cc_code)} title="Unsuspend">
                        <ShieldCheck className="size-3.5 text-green-400" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setBanTarget({ id: u.id, cc_code: u.cc_code, full_name: u.full_name })} title="Suspend">
                        <Ban className="size-3.5 text-destructive" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => toggleAdmin(u.id, isAdmin)} title={isAdmin ? "Revoke admin" : "Grant admin"}>
                      <Shield className={`size-3.5 ${isAdmin ? "text-neon-violet" : ""}`} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      const { error } = await supabase.from('profiles').update({ has_special_badge: !u.has_special_badge }).eq('id', u.id);
                      if (error) toast.error(error.message);
                      else toast.success(u.has_special_badge ? "Removed badge" : "Granted special badge");
                      qc.invalidateQueries({ queryKey: ["admin-users"] });
                    }} title={u.has_special_badge ? "Remove special badge" : "Grant special badge"}>
                      <Sparkles className={`size-3.5 ${u.has_special_badge ? "text-yellow-400" : ""}`} />
                    </Button>
                  </td>
                </tr>
                {expanded[u.id] && (
                  <tr className="bg-white/[0.02] border-t border-border/20">
                    <td colSpan={7} className="p-4">
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono">{u.id}</span></div>
                        <div><span className="text-muted-foreground">CC Code:</span> <span className="font-mono text-neon-cyan">{u.cc_code}</span></div>
                        <div><span className="text-muted-foreground">Community Code:</span> <span className="font-mono text-neon-violet">{u.community_code ?? "—"}</span></div>
                        <div><span className="text-muted-foreground">Full Name:</span> {u.full_name ?? "—"}</div>
                        <div><span className="text-muted-foreground">Email:</span> {u.email ?? "—"}</div>
                        <div><span className="text-muted-foreground">Phone:</span> {u.phone ?? "—"}</div>
                        <div><span className="text-muted-foreground">Joined:</span> {new Date(u.created_at).toLocaleString()}</div>
                        <div><span className="text-muted-foreground">Updated:</span> {u.updated_at ? new Date(u.updated_at).toLocaleString() : "—"}</div>
                        <div><span className="text-muted-foreground">Suspended:</span> {u.is_suspended ? "Yes" : "No"}</div>
                        {u.suspended_at && <div><span className="text-muted-foreground">Suspended at:</span> {new Date(u.suspended_at).toLocaleString()}</div>}
                        {u.suspended_until && <div><span className="text-muted-foreground">Until:</span> {new Date(u.suspended_until).toLocaleString()}</div>}
                        {u.suspend_reason && <div className="sm:col-span-2 md:col-span-3"><span className="text-muted-foreground">Reason:</span> {u.suspend_reason}</div>}
                        <div><span className="text-muted-foreground">Special badge:</span> {u.has_special_badge ? "Yes ★" : "No"}</div>
                        <div><span className="text-muted-foreground">Role:</span> {isAdmin ? "Admin" : "User"}</div>
                        {u.avatar_url && <div className="sm:col-span-2 md:col-span-3"><span className="text-muted-foreground">Avatar:</span> <a href={u.avatar_url} target="_blank" rel="noreferrer" className="text-neon-cyan underline break-all">{u.avatar_url}</a></div>}
                      </div>
                    </td>
                  </tr>
                )}
                </>
              );
            })}
          </tbody>
        </table>
      </GlassCard>

      <Dialog open={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)}>
        <DialogContent className="bg-card border-destructive/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="size-4 text-destructive" />
              Suspend {banTarget?.cc_code}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Reason (shown to user)</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="e.g. Fraudulent payment screenshot submitted"
                className="bg-input/40"
              />
            </div>
            <div>
              <Label className="text-xs">Duration</Label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger className="bg-input/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="24">1 day</SelectItem>
                  <SelectItem value="72">3 days</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                  <SelectItem value="720">30 days</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitBan} disabled={banning || !banReason.trim()}>
              {banning ? "Suspending..." : "Suspend user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
