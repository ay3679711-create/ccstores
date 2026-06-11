import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Save, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/cyber-ui";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: AdminPayments,
});

function AdminPayments() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["payment-settings-admin"],
    queryFn: async () => (await supabase.from("payment_settings").select("*").limit(1).maybeSingle()).data,
  });
  const { data: payments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => (await supabase.from("payments").select("*, orders(order_number), profiles!payments_user_id_fkey(cc_code, full_name)").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  const [s, setS] = useState({ upi_id: "", instructions: "", notes: "", qr_code_url: "" });

  const saveSettings = async () => {
    const payload = {
      upi_id: s.upi_id || settings?.upi_id,
      instructions: s.instructions || settings?.instructions,
      notes: s.notes || settings?.notes,
      qr_code_url: s.qr_code_url || settings?.qr_code_url,
      is_active: true,
    };
    if (settings) {
      await supabase.from("payment_settings").update(payload).eq("id", settings.id);
    } else {
      await supabase.from("payment_settings").insert(payload);
    }
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["payment-settings-admin"] });
  };

  const verify = async (id: string, orderId: string) => {
    await supabase.from("payments").update({ status: "verified" }).eq("id", id);
    await supabase.from("orders").update({ status: "verified" }).eq("id", orderId);
    toast.success("Verified");
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
  };
  const reject = async (id: string, orderId: string) => {
    await supabase.from("payments").update({ status: "rejected" }).eq("id", id);
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h3 className="font-semibold mb-3">Payment settings</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label className="text-xs">UPI ID</Label><Input defaultValue={settings?.upi_id ?? ""} onChange={(e) => setS({ ...s, upi_id: e.target.value })} className="bg-input/40" /></div>
          <div><Label className="text-xs">QR code URL</Label><Input defaultValue={settings?.qr_code_url ?? ""} onChange={(e) => setS({ ...s, qr_code_url: e.target.value })} className="bg-input/40" /></div>
          <div className="sm:col-span-2"><Label className="text-xs">Instructions</Label><Textarea rows={2} defaultValue={settings?.instructions ?? ""} onChange={(e) => setS({ ...s, instructions: e.target.value })} className="bg-input/40" /></div>
          <div className="sm:col-span-2"><Label className="text-xs">Notes</Label><Textarea rows={2} defaultValue={settings?.notes ?? ""} onChange={(e) => setS({ ...s, notes: e.target.value })} className="bg-input/40" /></div>
          <Button onClick={saveSettings} className="sm:col-span-2 bg-primary text-primary-foreground"><Save className="size-4 mr-2" /> Save</Button>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="p-4 border-b border-border/40"><h3 className="font-semibold">Pending verifications</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-surface/40 text-xs font-mono uppercase"><tr><th className="p-3 text-left">Order</th><th className="text-left">User</th><th className="text-left">TXN</th><th className="text-left">Amount</th><th className="text-left">Status</th><th className="text-left">Submitted</th><th></th></tr></thead>
          <tbody>
            {payments?.map((p: any) => (
              <tr key={p.id} className="border-t border-border/40 hover:bg-white/5">
                <td className="p-3 font-mono text-xs text-neon-cyan">{p.orders?.order_number}</td>
                <td className="text-xs"><div className="font-mono">{p.profiles?.cc_code}</div><div className="text-muted-foreground">{p.profiles?.full_name}</div></td>
                <td className="font-mono text-xs">{p.transaction_id}</td>
                <td className="font-mono">${p.amount}</td>
                <td><Badge variant="outline">{p.status}</Badge></td>
                <td className="text-xs">{new Date(p.created_at).toLocaleString()}</td>
                <td className="p-3 flex gap-1">
                  {p.status === "under_review" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => verify(p.id, p.order_id)}><Check className="size-3.5 text-green-400" /></Button>
                      <Button size="sm" variant="outline" onClick={() => reject(p.id, p.order_id)}><X className="size-3.5 text-destructive" /></Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
