import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Upload, Clock, CheckCircle2, Circle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GlassCard, NeonHeading } from "@/components/cyber-ui";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  component: OrderDetail,
});

const TIMELINE_STATUSES = ["pending", "awaiting_payment", "payment_submitted", "under_review", "verified", "delivered", "completed"];

function OrderDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: order } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), order_timeline(*), payments(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: paymentSettings } = useQuery({
    queryKey: ["payment-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_settings").select("*").eq("is_active", true).limit(1).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    account_holder: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_time: new Date().toTimeString().slice(0, 5),
    transaction_id: "",
    amount: order?.total ?? 0,
    file: null as File | null,
  });
  const [submitting, setSubmitting] = useState(false);

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !order) return;
    setSubmitting(true);
    try {
      let screenshot_url: string | null = null;
      if (form.file) {
        const path = `${user.id}/${order.id}-${Date.now()}-${form.file.name}`;
        const { error: upErr } = await supabase.storage.from("payments").upload(path, form.file);
        if (upErr) throw upErr;
        screenshot_url = path;
      }
      const { error } = await supabase.from("payments").insert({
        order_id: order.id,
        user_id: user.id,
        account_holder: form.account_holder,
        payment_date: form.payment_date,
        payment_time: form.payment_time + ":00",
        transaction_id: form.transaction_id,
        amount: form.amount || order.total,
        screenshot_url,
      });
      if (error) throw error;
      await supabase.from("orders").update({ status: "payment_submitted" }).eq("id", order.id);
      toast.success("Payment submitted — verification in progress");
      queryClient.invalidateQueries({ queryKey: ["order", id] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit payment");
    } finally { setSubmitting(false); }
  };

  if (!order) return <AppShell><div className="p-8">Loading...</div></AppShell>;

  const currentIdx = TIMELINE_STATUSES.indexOf(order.status);
  const hasPayment = order.payments && order.payments.length > 0;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-neon-cyan mb-4"><ArrowLeft className="size-4" /> Back to orders</Link>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-neon-cyan">// Order</p>
            <NeonHeading className="text-2xl font-mono">{order.order_number}</NeonHeading>
            <p className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <div className="font-mono text-3xl font-bold neon-text-cyan">${order.total}</div>
            <Badge variant="outline">{order.status.replace("_", " ")}</Badge>
          </div>
        </div>

        {/* Timeline */}
        <GlassCard className="p-6 mb-6">
          <h3 className="font-semibold mb-4">Order timeline</h3>
          <div className="grid grid-cols-7 gap-2">
            {TIMELINE_STATUSES.map((s, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <div key={s} className="flex flex-col items-center text-center">
                  <div className={`size-8 rounded-full grid place-items-center mb-2 ${
                    done ? "bg-neon-cyan/20 text-neon-cyan" : "bg-muted text-muted-foreground"
                  } ${active ? "ring-2 ring-neon-cyan animate-pulse-glow" : ""}`}>
                    {done ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider">{s.replace("_", " ")}</div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Items */}
        <GlassCard className="p-6 mb-6">
          <h3 className="font-semibold mb-4">Items</h3>
          <div className="space-y-2">
            {order.order_items?.map((it: any) => (
              <div key={it.id} className="flex justify-between p-3 rounded-lg bg-white/5">
                <div>
                  <div className="font-medium text-sm">{it.product_title}</div>
                  <div className="text-xs text-muted-foreground">Qty: {it.quantity} × ${it.unit_price}</div>
                </div>
                <div className="font-mono">${it.subtotal}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Delivered payload */}
        {order.delivery_payload && (
          <GlassCard className="p-6 mb-6" glow>
            <h3 className="font-semibold mb-2 text-neon-cyan">🔓 Delivery</h3>
            <pre className="text-xs whitespace-pre-wrap bg-background/50 p-4 rounded-lg font-mono">{order.delivery_payload}</pre>
          </GlassCard>
        )}

        {/* Payment section */}
        {order.status === "awaiting_payment" && !hasPayment && (
          <GlassCard className="p-6" glow>
            <h3 className="font-semibold mb-4">Submit payment</h3>
            {paymentSettings && (
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="glass rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-2">Pay to</p>
                  {paymentSettings.qr_code_url && (
                    <img src={paymentSettings.qr_code_url} alt="QR" className="w-32 h-32 object-cover rounded mb-2" />
                  )}
                  <div className="font-mono text-sm">{paymentSettings.upi_id}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="mb-2">{paymentSettings.instructions}</p>
                  <p className="text-yellow-400">{paymentSettings.notes}</p>
                </div>
              </div>
            )}

            <form onSubmit={submitPayment} className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Account holder name</Label>
                <Input required maxLength={100} value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })} className="bg-input/40" />
              </div>
              <div>
                <Label className="text-xs">Transaction ID</Label>
                <Input required maxLength={100} value={form.transaction_id} onChange={(e) => setForm({ ...form, transaction_id: e.target.value })} className="bg-input/40" />
              </div>
              <div>
                <Label className="text-xs">Payment date</Label>
                <Input required type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className="bg-input/40" />
              </div>
              <div>
                <Label className="text-xs">Payment time</Label>
                <Input required type="time" value={form.payment_time} onChange={(e) => setForm({ ...form, payment_time: e.target.value })} className="bg-input/40" />
              </div>
              <div>
                <Label className="text-xs">Amount paid</Label>
                <Input required type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) })} className="bg-input/40" />
              </div>
              <div>
                <Label className="text-xs">Screenshot</Label>
                <Input type="file" accept="image/*" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} className="bg-input/40" />
              </div>
              <Button type="submit" disabled={submitting} className="sm:col-span-2 bg-primary text-primary-foreground">
                <Send className="size-4 mr-2" />{submitting ? "Submitting..." : "Submit for verification"}
              </Button>
            </form>
          </GlassCard>
        )}

        {hasPayment && (
          <GlassCard className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Clock className="size-4 text-yellow-400" /> Payment under verification</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Submitted at {new Date(order.payments[0].created_at).toLocaleString()}. Reviewed within 12 hours.
            </p>
            <div className="font-mono text-xs">
              TXN: {order.payments[0].transaction_id} • ${order.payments[0].amount}
            </div>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
