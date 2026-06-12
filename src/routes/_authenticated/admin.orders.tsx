import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard } from "@/components/cyber-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

const STATUSES = ["pending", "awaiting_payment", "payment_submitted", "under_review", "verified", "delivered", "completed", "cancelled"];

function AdminOrders() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [delivery, setDelivery] = useState("");

  const { data: orders } = useQuery({
    queryKey: ["admin-orders", filter],
    queryFn: async () => {
      let q = supabase.from("orders").select("*, order_items(*), profiles!orders_user_id_fkey(cc_code, full_name, email)").order("created_at", { ascending: false }).limit(100);
      if (filter) q = q.eq("status", filter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const update: any = { status };
    if (status === "delivered" || status === "completed") {
      update.delivered_at = new Date().toISOString();
      if (delivery) update.delivery_payload = delivery;
    }
    const { error } = await supabase.from("orders").update(update).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    setSelected(null); setDelivery("");
  };

  const autofillFromSecrets = async () => {
    if (!selected) return;
    const productId = selected.order_items?.[0]?.product_id;
    if (!productId) { toast.error("No product on this order"); return; }
    const { data } = await supabase.from("product_secrets").select("*").eq("product_id", productId).maybeSingle();
    if (!data) { toast.error("No secrets stored for this product"); return; }
    const payload = {
      card_number: data.card_number, card_cvv: data.card_cvv, card_exp: data.card_exp,
      account_login: data.account_login, account_password: data.account_password, account_balance: data.account_balance,
      extra_notes: data.extra_notes,
    };
    setDelivery(JSON.stringify(payload, null, 2));
    toast.success("Vault loaded — review then mark delivered");
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button size="sm" variant={!filter ? "default" : "outline"} onClick={() => setFilter(null)}>All</Button>
        {STATUSES.map((s) => <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>{s.replace("_", " ")}</Button>)}
      </div>
      <GlassCard className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/40 text-xs font-mono uppercase"><tr><th className="p-3 text-left">Order</th><th className="text-left">User</th><th className="text-left">Total</th><th className="text-left">Status</th><th className="text-left">Date</th><th></th></tr></thead>
          <tbody>
            {orders?.map((o: any) => (
              <tr key={o.id} className="border-t border-border/40 hover:bg-white/5">
                <td className="p-3 font-mono text-neon-cyan text-xs">{o.order_number}</td>
                <td><div className="font-mono text-xs">{o.profiles?.cc_code}</div><div className="text-xs text-muted-foreground">{o.profiles?.full_name}</div></td>
                <td className="font-mono">${o.total}</td>
                <td><Badge variant="outline">{o.status.replace("_", " ")}</Badge></td>
                <td className="text-xs">{new Date(o.created_at).toLocaleString()}</td>
                <td className="p-3"><Button size="sm" variant="outline" onClick={() => { setSelected(o); setDelivery(o.delivery_payload ?? ""); }}>Manage</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="glass-strong border-neon-cyan/30">
          <DialogHeader><DialogTitle>Manage {selected?.order_number}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="text-sm">
                <div>User: <span className="font-mono text-neon-cyan">{selected.profiles?.cc_code}</span></div>
                <div>Items: {selected.order_items?.map((i: any) => i.product_title).join(", ")}</div>
                <div>Total: <span className="font-mono">${selected.total}</span></div>
              </div>
              <div>
                <label className="text-xs">Change status</label>
                <Select onValueChange={(v) => updateStatus(selected.id, v)} defaultValue={selected.status}>
                  <SelectTrigger className="bg-input/40"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-xs">Delivery payload (JSON shape recommended)</label>
                  <Button size="sm" variant="outline" onClick={autofillFromSecrets}>Auto-fill from vault</Button>
                </div>
                <Textarea value={delivery} onChange={(e) => setDelivery(e.target.value)} rows={6} className="bg-input/40 font-mono text-xs" placeholder='{"card_number":"...", "card_cvv":"...", "card_exp":"MM/YY"}' />
              </div>
              <Button onClick={() => updateStatus(selected.id, "delivered")} className="w-full bg-primary text-primary-foreground">Mark delivered with payload</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
