import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check, X, Save, Upload, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/cyber-ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: AdminPayments,
});

function AdminPayments() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: settings } = useQuery({
    queryKey: ["payment-settings-admin"],
    queryFn: async () => (await supabase.from("payment_settings").select("*").limit(1).maybeSingle()).data,
  });
  const { data: appSettings } = useQuery({
    queryKey: ["app-settings-admin"],
    queryFn: async () => (await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle()).data,
  });
  const { data: payments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => (await supabase.from("payments").select("*, orders(order_number), profiles!payments_user_id_fkey(cc_code, full_name)").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  const [s, setS] = useState<any>({});
  const [app, setApp] = useState<any>({});

  useEffect(() => { if (settings) setS(settings); }, [settings]);
  useEffect(() => { if (appSettings) setApp(appSettings); }, [appSettings]);

  const saveSettings = async () => {
    const payload: any = {
      upi_id: s.upi_id ?? null, instructions: s.instructions ?? null,
      notes: s.notes ?? null, qr_code_url: s.qr_code_url ?? null, is_active: true,
    };
    if (settings?.id) await supabase.from("payment_settings").update(payload).eq("id", settings.id);
    else await supabase.from("payment_settings").insert(payload);
    toast.success("Payment settings saved");
    qc.invalidateQueries({ queryKey: ["payment-settings-admin"] });
    qc.invalidateQueries({ queryKey: ["payment-settings"] });
  };

  const saveApp = async () => {
    const payload = {
      brand_name: app.brand_name, brand_logo_url: app.brand_logo_url ?? null,
      welcome_popup_title: app.welcome_popup_title, welcome_popup_body: app.welcome_popup_body,
      delivery_message_template: app.delivery_message_template,
      payment_timer_hours: parseInt(app.payment_timer_hours) || 12,
    };
    const { error } = await supabase.from("app_settings").update(payload).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Brand & template saved");
    qc.invalidateQueries({ queryKey: ["app-settings-admin"] });
    qc.invalidateQueries({ queryKey: ["app-settings"] });
  };

  const uploadQR = async (file: File) => {
    if (!user) return;
    const path = `qr/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("payments").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); return; }
    const { data: signed } = await supabase.storage.from("payments").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (signed) { setS({ ...s, qr_code_url: signed.signedUrl }); toast.success("QR uploaded — click Save"); }
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
    <Tabs defaultValue="verifications">
      <TabsList className="bg-surface/40">
        <TabsTrigger value="verifications">Pending verifications</TabsTrigger>
        <TabsTrigger value="payment">Payment / QR / UPI</TabsTrigger>
        <TabsTrigger value="brand">Brand & delivery template</TabsTrigger>
      </TabsList>

      <TabsContent value="verifications">
        <GlassCard className="overflow-hidden mt-4">
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
                    {(p.status === "under_review" || p.status === "pending") && (
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
      </TabsContent>

      <TabsContent value="payment">
        <GlassCard className="p-6 mt-4">
          <h3 className="font-semibold mb-3">QR / UPI settings (shown to buyers)</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">UPI ID</Label><Input value={s.upi_id ?? ""} onChange={(e) => setS({ ...s, upi_id: e.target.value })} className="bg-input/40" /></div>
            <div>
              <Label className="text-xs">QR code image</Label>
              <div className="flex gap-2 items-center">
                <Input value={s.qr_code_url ?? ""} onChange={(e) => setS({ ...s, qr_code_url: e.target.value })} placeholder="URL or upload →" className="bg-input/40" />
                <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-2 rounded-md bg-neon-cyan/10 text-neon-cyan text-xs hover:bg-neon-cyan/20">
                  <Upload className="size-3.5" /> Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadQR(e.target.files[0])} />
                </label>
              </div>
              {s.qr_code_url && <img src={s.qr_code_url} alt="QR" className="mt-2 size-24 object-contain rounded bg-white p-1" />}
            </div>
            <div className="sm:col-span-2"><Label className="text-xs">Instructions (shown next to QR)</Label><Textarea rows={2} value={s.instructions ?? ""} onChange={(e) => setS({ ...s, instructions: e.target.value })} className="bg-input/40" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Notes / warnings</Label><Textarea rows={2} value={s.notes ?? ""} onChange={(e) => setS({ ...s, notes: e.target.value })} className="bg-input/40" /></div>
            <Button onClick={saveSettings} className="sm:col-span-2 bg-primary text-primary-foreground"><Save className="size-4 mr-2" /> Save payment settings</Button>
          </div>
        </GlassCard>
      </TabsContent>

      <TabsContent value="brand">
        <GlassCard className="p-6 mt-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="size-4 text-neon-violet" /> Brand & delivery template</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label className="text-xs">Brand name</Label><Input value={app.brand_name ?? ""} onChange={(e) => setApp({ ...app, brand_name: e.target.value })} className="bg-input/40" /></div>
            <div><Label className="text-xs">Brand logo URL</Label><Input value={app.brand_logo_url ?? ""} onChange={(e) => setApp({ ...app, brand_logo_url: e.target.value })} className="bg-input/40" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Welcome popup title</Label><Input value={app.welcome_popup_title ?? ""} onChange={(e) => setApp({ ...app, welcome_popup_title: e.target.value })} className="bg-input/40" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Welcome popup body</Label><Textarea rows={2} value={app.welcome_popup_body ?? ""} onChange={(e) => setApp({ ...app, welcome_popup_body: e.target.value })} className="bg-input/40" /></div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Delivery / congratulations template</Label>
              <Textarea rows={4} value={app.delivery_message_template ?? ""} onChange={(e) => setApp({ ...app, delivery_message_template: e.target.value })} className="bg-input/40 font-mono text-xs" />
              <p className="text-[10px] text-muted-foreground mt-1">Variables: <code>{`{{card_number}} {{card_cvv}} {{card_exp}} {{account_login}} {{account_password}} {{account_balance}} {{usage_window}} {{provider_label}}`}</code></p>
            </div>
            <div><Label className="text-xs">Verification timer (hours)</Label><Input type="number" min={1} max={72} value={app.payment_timer_hours ?? 12} onChange={(e) => setApp({ ...app, payment_timer_hours: e.target.value })} className="bg-input/40" /></div>
            <Button onClick={saveApp} className="sm:col-span-2 bg-primary text-primary-foreground"><Save className="size-4 mr-2" /> Save brand & template</Button>
          </div>
        </GlassCard>
      </TabsContent>
    </Tabs>
  );
}
