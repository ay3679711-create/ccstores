import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Eye, EyeOff, Star, Trash2, Lock, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/cyber-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: AdminProducts,
});

const PRODUCT_TYPES = ["digital", "subscription", "software_license", "gift_card", "gaming", "asset"];
const STOCK_KINDS = ["card", "account", "game", "subscription", "key", "other"];

function emptyForm() {
  return {
    title: "", description: "", short_description: "", price: 0, stock_quantity: 0,
    product_type: "digital", category_id: "", cover_image: "", tags: "",
    delivery_instructions: "", warranty_details: "", is_featured: false,
    stock_kind: "account", provider_label: "", usage_window: "",
    account_email: "", account_password: "", account_balance: 0,
    card_number: "", card_cvv: "", card_holder: "", card_country: "",
    bin: "", card_price: 0, inner_price: 0, delivery_description: ""
  };
}

function AdminProducts() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  // Secrets dialog
  const [secretsFor, setSecretsFor] = useState<any>(null);
  const [secrets, setSecrets] = useState<any>({
    card_number: "", card_cvv: "", card_exp: "", card_holder: "", card_country: "",
    account_login: "", account_password: "", account_balance: "",
    extra_notes: "",
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-admin"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const submit = async () => {
    const payload: any = {
      title: form.title,
      slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36),
      description: form.description, short_description: form.short_description,
      price: form.price, stock_quantity: form.stock_quantity,
      product_type: form.product_type, category_id: form.category_id || null,
      cover_image: form.cover_image || null,
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      delivery_instructions: form.delivery_instructions, warranty_details: form.warranty_details,
      is_featured: form.is_featured,
      stock_kind: form.stock_kind, provider_label: form.provider_label, usage_window: form.usage_window,
      account_email: form.account_email, account_password: form.account_password, account_balance: form.account_balance,
      card_number: form.card_number, card_cvv: form.card_cvv, card_holder: form.card_holder, card_country: form.card_country,
      bin: form.bin, card_price: form.card_price, inner_price: form.inner_price, delivery_description: form.delivery_description,
      created_by: user!.id,
    };
    if (editId) {
      const { slug, ...update } = payload;
      const { error } = await supabase.from("products").update(update).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Created");
    }
    setOpen(false); setEditId(null); setForm(emptyForm());
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const startEdit = (p: any) => {
    setEditId(p.id);
    setForm({ ...emptyForm(), ...p, tags: (p.tags ?? []).join(", ") });
    setOpen(true);
  };

  const openSecrets = async (p: any) => {
    setSecretsFor(p);
    const { data } = await supabase.from("product_secrets").select("*").eq("product_id", p.id).maybeSingle();
    setSecrets(data ?? { card_number: "", card_cvv: "", card_exp: "", card_holder: "", card_country: "", account_login: "", account_password: "", account_balance: "", extra_notes: "" });
  };

  const saveSecrets = async () => {
    if (!secretsFor) return;
    const payload: any = {
      product_id: secretsFor.id,
      card_number: secrets.card_number || null,
      card_cvv: secrets.card_cvv || null,
      card_exp: secrets.card_exp || null,
      card_holder: secrets.card_holder || null,
      card_country: secrets.card_country || null,
      account_login: secrets.account_login || null,
      account_password: secrets.account_password || null,
      account_balance: secrets.account_balance ? parseFloat(secrets.account_balance) : null,
      extra_notes: secrets.extra_notes || null,
    };
    const { error } = await supabase.from("product_secrets").upsert(payload, { onConflict: "product_id" });
    if (error) { toast.error(error.message); return; }
    toast.success("Secrets saved (admin-only)");
    setSecretsFor(null);
  };

  const toggleHide = async (id: string, hidden: boolean) => {
    await supabase.from("products").update({ is_hidden: !hidden }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };
  const toggleFeature = async (id: string, f: boolean) => {
    await supabase.from("products").update({ is_featured: !f }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Delete product?")) return;
    await supabase.from("products").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const isCard = form.stock_kind === "card";

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-semibold">{products?.length ?? 0} products</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(emptyForm()); } }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground"><Plus className="size-4 mr-1" /> New product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl glass-strong border-neon-cyan/30 max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label className="text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-input/40" /></div>
              
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={form.category_id || undefined} onValueChange={(v) => {
                  const cat = categories?.find(c => c.id === v);
                  setForm({ ...form, category_id: v, stock_kind: cat?.name === 'debit card' ? 'card' : (cat?.name === 'loded account' ? 'account' : form.stock_kind) });
                }}>
                  <SelectTrigger className="bg-input/40"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Stock kind (drives delivery form)</Label>
                <Select value={form.stock_kind} onValueChange={(v) => setForm({ ...form, stock_kind: v })}>
                  <SelectTrigger className="bg-input/40"><SelectValue /></SelectTrigger>
                  <SelectContent>{STOCK_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {form.stock_kind === 'card' && (
                <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3 p-3 border border-neon-cyan/20 rounded-lg bg-neon-cyan/5">
                  <p className="sm:col-span-2 text-[10px] font-mono uppercase text-neon-cyan">Card specific fields</p>
                  <div><Label className="text-xs">Card Number</Label><Input value={form.card_number} onChange={(e) => setForm({ ...form, card_number: e.target.value })} className="bg-input/40" /></div>
                  <div><Label className="text-xs">CVV</Label><Input value={form.card_cvv} onChange={(e) => setForm({ ...form, card_cvv: e.target.value })} className="bg-input/40" /></div>
                  <div><Label className="text-xs">Card Holder</Label><Input value={form.card_holder} onChange={(e) => setForm({ ...form, card_holder: e.target.value })} className="bg-input/40" /></div>
                  <div><Label className="text-xs">Country</Label><Input value={form.card_country} onChange={(e) => setForm({ ...form, card_country: e.target.value })} className="bg-input/40" /></div>
                  <div><Label className="text-xs">BIN</Label><Input value={form.bin} onChange={(e) => setForm({ ...form, bin: e.target.value })} className="bg-input/40" /></div>
                  <div><Label className="text-xs">Card Price</Label><Input type="number" value={form.card_price} onChange={(e) => setForm({ ...form, card_price: parseFloat(e.target.value) })} className="bg-input/40" /></div>
                  <div><Label className="text-xs">Inner Price</Label><Input type="number" value={form.inner_price} onChange={(e) => setForm({ ...form, inner_price: parseFloat(e.target.value) })} className="bg-input/40" /></div>
                </div>
              )}

              {form.stock_kind === 'account' && (
                <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3 p-3 border border-neon-violet/20 rounded-lg bg-neon-violet/5">
                  <p className="sm:col-span-2 text-[10px] font-mono uppercase text-neon-violet">Account specific fields</p>
                  <div><Label className="text-xs">Email</Label><Input value={form.account_email} onChange={(e) => setForm({ ...form, account_email: e.target.value })} className="bg-input/40" /></div>
                  <div><Label className="text-xs">Password</Label><Input value={form.account_password} onChange={(e) => setForm({ ...form, account_password: e.target.value })} className="bg-input/40" /></div>
                  <div><Label className="text-xs">Balance</Label><Input type="number" value={form.account_balance} onChange={(e) => setForm({ ...form, account_balance: parseFloat(e.target.value) })} className="bg-input/40" /></div>
                  <div className="sm:col-span-2"><Label className="text-xs">Delivery Description</Label><Textarea rows={2} value={form.delivery_description} onChange={(e) => setForm({ ...form, delivery_description: e.target.value })} className="bg-input/40" /></div>
                </div>
              )}

              <div>
                <Label className="text-xs">Provider label (e.g. Playstore)</Label>
                <Input value={form.provider_label ?? ""} onChange={(e) => setForm({ ...form, provider_label: e.target.value })} className="bg-input/40" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Usage window (suggestion shown to buyer, e.g. "8pm–9pm Playstore subscriptions")</Label>
                <Input value={form.usage_window ?? ""} onChange={(e) => setForm({ ...form, usage_window: e.target.value })} className="bg-input/40" />
              </div>
              <div className="sm:col-span-2"><Label className="text-xs">Short description</Label><Input value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="bg-input/40" /></div>
              <div className="sm:col-span-2"><Label className="text-xs">Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-input/40" /></div>
              <div><Label className="text-xs">Price</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })} className="bg-input/40" /></div>
              <div><Label className="text-xs">Stock</Label><Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: parseInt(e.target.value) })} className="bg-input/40" /></div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.product_type} onValueChange={(v) => setForm({ ...form, product_type: v })}>
                  <SelectTrigger className="bg-input/40"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRODUCT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {!isCard && (
                <div className="sm:col-span-2"><Label className="text-xs">Cover image URL</Label><Input value={form.cover_image ?? ""} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} className="bg-input/40" /></div>
              )}
              {isCard && (
                <p className="sm:col-span-2 text-xs text-neon-violet bg-neon-violet/10 p-3 rounded-lg">📇 Stock kind = card. Image is hidden on listing; deliver card number/CVV/expiry via the lock icon after creating the product.</p>
              )}
              <div className="sm:col-span-2"><Label className="text-xs">Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="bg-input/40" /></div>
              <div className="sm:col-span-2"><Label className="text-xs">Delivery instructions (shown after admin verifies)</Label><Textarea rows={2} value={form.delivery_instructions} onChange={(e) => setForm({ ...form, delivery_instructions: e.target.value })} className="bg-input/40" /></div>
              <div className="sm:col-span-2"><Label className="text-xs">Warranty details</Label><Textarea rows={2} value={form.warranty_details} onChange={(e) => setForm({ ...form, warranty_details: e.target.value })} className="bg-input/40" /></div>
              <Button onClick={submit} className="sm:col-span-2 bg-primary text-primary-foreground">{editId ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <GlassCard className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/40 text-xs font-mono uppercase">
            <tr><th className="p-3 text-left">Product</th><th className="text-left">Kind</th><th className="text-left">Price</th><th className="text-left">Stock</th><th className="text-left">Status</th><th className="text-left">Actions</th></tr>
          </thead>
          <tbody>
            {products?.map((p: any) => (
              <tr key={p.id} className="border-t border-border/40 hover:bg-white/5">
                <td className="p-3"><div className="font-semibold">{p.title}</div><div className="text-xs text-muted-foreground">{p.categories?.name} {p.provider_label && `• ${p.provider_label}`}</div></td>
                <td className="text-xs"><Badge variant="outline">{p.stock_kind ?? p.product_type}</Badge></td>
                <td className="font-mono text-neon-cyan">${p.price}</td>
                <td>{p.unlimited_stock ? "∞" : p.stock_quantity}</td>
                <td>{p.is_hidden ? <Badge variant="secondary">Hidden</Badge> : <Badge className="bg-green-500/20 text-green-300">Live</Badge>}{p.is_featured && <Badge className="ml-1 bg-yellow-500/20 text-yellow-300">★</Badge>}</td>
                <td className="p-3 flex gap-1 flex-wrap">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>Edit</Button>
                  <Button size="sm" variant="ghost" title="Manage secrets (card/account)" onClick={() => openSecrets(p)}><Lock className="size-3.5 text-neon-violet" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleHide(p.id, p.is_hidden)}>{p.is_hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleFeature(p.id, p.is_featured)}><Star className={`size-3.5 ${p.is_featured ? "text-yellow-400 fill-yellow-400" : ""}`} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>

      {/* Secrets dialog */}
      <Dialog open={!!secretsFor} onOpenChange={(o) => !o && setSecretsFor(null)}>
        <DialogContent className="max-w-lg glass-strong border-neon-violet/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="size-4 text-neon-violet" /> Vault — {secretsFor?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Admin-only. Stored encrypted at rest; revealed to the buyer only after you verify their payment.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 text-[10px] font-mono uppercase tracking-widest text-neon-violet">CARD FIELDS</div>
            <div><Label className="text-xs">Card number</Label><Input value={secrets.card_number ?? ""} onChange={(e) => setSecrets({ ...secrets, card_number: e.target.value })} className="bg-input/40 font-mono" /></div>
            <div><Label className="text-xs">CVV</Label><Input value={secrets.card_cvv ?? ""} onChange={(e) => setSecrets({ ...secrets, card_cvv: e.target.value })} className="bg-input/40 font-mono" /></div>
            <div><Label className="text-xs">Expiry (MM/YY)</Label><Input value={secrets.card_exp ?? ""} onChange={(e) => setSecrets({ ...secrets, card_exp: e.target.value })} className="bg-input/40 font-mono" /></div>
            <div><Label className="text-xs">Cardholder name</Label><Input value={secrets.card_holder ?? ""} onChange={(e) => setSecrets({ ...secrets, card_holder: e.target.value })} className="bg-input/40" /></div>
            <div><Label className="text-xs">Country</Label><Input value={secrets.card_country ?? ""} onChange={(e) => setSecrets({ ...secrets, card_country: e.target.value })} className="bg-input/40" placeholder="e.g. India" /></div>
            <div className="sm:col-span-2 text-[10px] font-mono uppercase tracking-widest text-neon-violet mt-2">ACCOUNT FIELDS</div>
            <div><Label className="text-xs">Login / email</Label><Input value={secrets.account_login ?? ""} onChange={(e) => setSecrets({ ...secrets, account_login: e.target.value })} className="bg-input/40" /></div>
            <div><Label className="text-xs">Password</Label><Input value={secrets.account_password ?? ""} onChange={(e) => setSecrets({ ...secrets, account_password: e.target.value })} className="bg-input/40 font-mono" /></div>
            <div><Label className="text-xs">Balance</Label><Input value={secrets.account_balance ?? ""} onChange={(e) => setSecrets({ ...secrets, account_balance: e.target.value })} className="bg-input/40" /></div>
            <div className="sm:col-span-2"><Label className="text-xs">Extra notes</Label><Textarea rows={2} value={secrets.extra_notes ?? ""} onChange={(e) => setSecrets({ ...secrets, extra_notes: e.target.value })} className="bg-input/40" /></div>
            <Button onClick={saveSecrets} className="sm:col-span-2 bg-neon-violet/20 text-neon-violet hover:bg-neon-violet/30">Save secrets</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
