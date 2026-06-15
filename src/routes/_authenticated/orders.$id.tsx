import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Clock, CheckCircle2, Circle, Send, Sparkles, Timer, AlertCircle } from "lucide-react";
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

function useCountdown(deadline: string | null | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!deadline) return null;
  const remaining = new Date(deadline).getTime() - now;
  if (remaining <= 0) return { expired: true, hours: 0, minutes: 0, seconds: 0 };
  return {
    expired: false,
    hours: Math.floor(remaining / 3600000),
    minutes: Math.floor((remaining % 3600000) / 60000),
    seconds: Math.floor((remaining % 60000) / 1000),
  };
}

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

function OrderDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: order } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(provider_label, usage_window, stock_kind)), order_timeline(*), payments(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: paymentSettings } = useQuery({
    queryKey: ["payment-settings"],
    queryFn: async () => (await supabase.from("payment_settings").select("*").eq("is_active", true).limit(1).maybeSingle()).data,
  });

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => (await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle()).data,
  });

  const [form, setForm] = useState({
    account_holder: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_time: new Date().toTimeString().slice(0, 5),
    transaction_id: "",
    amount: "",
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
      const amount = parseFloat(form.amount) || Number(order.total);
      const { error } = await supabase.from("payments").insert({
        order_id: order.id, user_id: user.id,
        account_holder: form.account_holder,
        payment_date: form.payment_date,
        payment_time: form.payment_time + ":00",
        transaction_id: form.transaction_id,
        amount, screenshot_url,
        status: "under_review",
      });
      if (error) throw error;

      const timerHours = appSettings?.payment_timer_hours ?? 12;
      const now = new Date();
      const deadline = new Date(now.getTime() + timerHours * 3600 * 1000).toISOString();
      await supabase.from("orders").update({
        status: "payment_submitted",
        payment_submitted_at: now.toISOString(),
        payment_deadline: deadline,
      }).eq("id", order.id);

      toast.success("Payment submitted. Admin will verify within " + timerHours + "h.");
      queryClient.invalidateQueries({ queryKey: ["order", id] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit payment");
    } finally { setSubmitting(false); }
  };

  const countdown = useCountdown(order?.payment_deadline);

  if (!order) return <AppShell><div className="p-8">Loading...</div></AppShell>;

  const currentIdx = TIMELINE_STATUSES.indexOf(order.status);
  const hasPayment = order.payments && order.payments.length > 0;
  const isDelivered = !!order.delivery_payload && (order.status === "delivered" || order.status === "completed");
  const firstItemProduct = order.order_items?.[0]?.products as any;
  const usageWindow = firstItemProduct?.usage_window ?? "any time";

  let congrats = "";
  if (isDelivered && appSettings?.delivery_message_template) {
    let parsed: any = {};
    try { parsed = JSON.parse(order.delivery_payload ?? "{}"); } catch { parsed = { raw: order.delivery_payload }; }
    congrats = renderTemplate(appSettings.delivery_message_template, {
      card_number: parsed.card_number ?? "—",
      card_cvv: parsed.card_cvv ?? "—",
      card_exp: parsed.card_exp ?? "—",
      account_login: parsed.account_login ?? "—",
      account_password: parsed.account_password ?? "—",
      account_balance: parsed.account_balance ?? "—",
      usage_window: usageWindow,
      provider_label: firstItemProduct?.provider_label ?? "",
    });
  }

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

        {/* Countdown timer */}
        {countdown && hasPayment && !isDelivered && (
          <GlassCard className={`p-6 mb-6 border ${countdown.expired ? "border-destructive/50" : "border-neon-cyan/40"}`} glow>
            <div className="flex items-center gap-3">
              <Timer className={`size-8 ${countdown.expired ? "text-destructive" : "text-neon-cyan animate-pulse"}`} />
              <div className="flex-1">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{countdown.expired ? "Window elapsed — admin still reviewing" : "Verification window"}</p>
                <div className="font-mono text-3xl font-bold">
                  {String(countdown.hours).padStart(2, "0")}:{String(countdown.minutes).padStart(2, "0")}:{String(countdown.seconds).padStart(2, "0")}
                </div>
                {firstItemProduct?.usage_window && (
                  <p className="text-xs text-neon-violet mt-2">💡 Suggested usage: {firstItemProduct.usage_window}{firstItemProduct.provider_label ? ` • ${firstItemProduct.provider_label}` : ""}</p>
                )}
              </div>
            </div>
          </GlassCard>
        )}

        {/* Timeline */}
        <GlassCard className="p-6 mb-6">
          <h3 className="font-semibold mb-4">Order timeline</h3>
          <div className="grid grid-cols-7 gap-2">
            {TIMELINE_STATUSES.map((s, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <div key={s} className="flex flex-col items-center text-center">
                  <div className={`size-8 rounded-full grid place-items-center mb-2 ${done ? "bg-neon-cyan/20 text-neon-cyan" : "bg-muted text-muted-foreground"} ${active ? "ring-2 ring-neon-cyan animate-pulse-glow" : ""}`}>
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

        {/* Congratulations + delivery payload */}
        {isDelivered && (
          <GlassCard className="p-6 mb-6 border-neon-cyan/50" glow>
            <h3 className="font-semibold mb-2 text-neon-cyan flex items-center gap-2"><Sparkles className="size-4" /> Congratulations!</h3>
            <p className="text-sm whitespace-pre-wrap mb-4">{congrats || order.delivery_payload}</p>
            
            <div className="bg-neon-violet/10 border border-neon-violet/30 p-4 rounded-lg mb-4">
              <p className="text-xs font-semibold text-neon-violet uppercase tracking-wider mb-2">Special Offer</p>
              <p className="text-sm text-muted-foreground">Aik special badge milega agar tum hamare website ke bare mai daloge (social media, etc). Contact admin after sharing to get your badge and free cards!</p>
            </div>

            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Raw delivery payload</summary>
              <pre className="text-xs whitespace-pre-wrap bg-background/50 p-3 rounded-lg font-mono mt-2">{order.delivery_payload}</pre>
            </details>
          </GlassCard>
        )}

        {/* Payment section — QR + form */}
        {(order.status === "awaiting_payment" || order.status === "pending") && !hasPayment && (
          <GlassCard className="p-6" glow>
            <h3 className="font-semibold mb-4">Pay & submit details</h3>
            {paymentSettings ? (
              <div className="grid sm:grid-cols-[200px_1fr] gap-5 mb-6 items-start">
                <div className="glass rounded-xl p-3 text-center">
                  {paymentSettings.qr_code_url ? (
                    <img src={paymentSettings.qr_code_url} alt="UPI QR" className="w-full aspect-square object-contain rounded mb-2 bg-white p-2" />
                  ) : (
                    <div className="w-full aspect-square grid place-items-center bg-surface/50 rounded mb-2 text-xs text-muted-foreground">QR pending</div>
                  )}
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Scan & pay</p>
                </div>
                <div className="text-xs space-y-2">
                  <div className="glass rounded-lg p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">UPI ID</p>
                    <p className="font-mono text-base text-neon-cyan">{paymentSettings.upi_id ?? "—"}</p>
                  </div>
                  {paymentSettings.instructions && <p className="text-muted-foreground">{paymentSettings.instructions}</p>}
                  {paymentSettings.notes && <p className="text-yellow-400 flex items-start gap-1"><AlertCircle className="size-3 mt-0.5 shrink-0" />{paymentSettings.notes}</p>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">Payment details not configured yet — contact support.</p>
            )}

            <form onSubmit={submitPayment} className="grid sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">PhonePe / account holder name</Label><Input required maxLength={100} value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })} className="bg-input/40" /></div>
              <div><Label className="text-xs">Transaction / UTR ID</Label><Input required maxLength={100} value={form.transaction_id} onChange={(e) => setForm({ ...form, transaction_id: e.target.value })} className="bg-input/40" /></div>
              <div><Label className="text-xs">Payment date</Label><Input required type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className="bg-input/40" /></div>
              <div><Label className="text-xs">Payment time</Label><Input required type="time" value={form.payment_time} onChange={(e) => setForm({ ...form, payment_time: e.target.value })} className="bg-input/40" /></div>
              <div><Label className="text-xs">Amount paid (USD)</Label><Input required type="number" step="0.01" placeholder={String(order.total)} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="bg-input/40" /></div>
              <div><Label className="text-xs">Screenshot</Label><Input type="file" accept="image/*" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} className="bg-input/40" /></div>
              <Button type="submit" disabled={submitting} className="sm:col-span-2 bg-primary text-primary-foreground">
                <Send className="size-4 mr-2" />{submitting ? "Submitting..." : "Done — submit for verification"}
              </Button>
            </form>
          </GlassCard>
        )}

        {hasPayment && !isDelivered && (
          <GlassCard className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Clock className="size-4 text-yellow-400" /> Payment under verification</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Submitted at {new Date(order.payments[0].created_at).toLocaleString()}.
            </p>
            <div className="font-mono text-xs">TXN: {order.payments[0].transaction_id} • ${order.payments[0].amount}</div>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
