import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Eye, EyeOff, Star, Trash2 } from "lucide-react";
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

function AdminProducts() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    title: "", description: "", short_description: "", price: 0, stock_quantity: 0,
    product_type: "digital", category_id: "", cover_image: "", tags: "",
    delivery_instructions: "", warranty_details: "", is_featured: false,
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-admin"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const submit = async () => {
    const payload = {
      title: form.title,
      slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36),
      description: form.description,
      short_description: form.short_description,
      price: form.price,
      stock_quantity: form.stock_quantity,
      product_type: form.product_type,
      category_id: form.category_id || null,
      cover_image: form.cover_image || null,
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      delivery_instructions: form.delivery_instructions,
      warranty_details: form.warranty_details,
      is_featured: form.is_featured,
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
    setOpen(false); setEditId(null);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const startEdit = (p: any) => {
    setEditId(p.id);
    setForm({ ...p, tags: (p.tags ?? []).join(", ") });
    setOpen(true);
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

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-semibold">{products?.length ?? 0} products</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm({ title: "", description: "", short_description: "", price: 0, stock_quantity: 0, product_type: "digital", category_id: "", cover_image: "", tags: "", delivery_instructions: "", warranty_details: "", is_featured: false }); }}}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground"><Plus className="size-4 mr-1" /> New product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl glass-strong border-neon-cyan/30 max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label className="text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-input/40" /></div>
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
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={form.category_id || undefined} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger className="bg-input/40"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label className="text-xs">Cover image URL</Label><Input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} className="bg-input/40" /></div>
              <div className="sm:col-span-2"><Label className="text-xs">Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="bg-input/40" /></div>
              <div className="sm:col-span-2"><Label className="text-xs">Delivery instructions</Label><Textarea rows={2} value={form.delivery_instructions} onChange={(e) => setForm({ ...form, delivery_instructions: e.target.value })} className="bg-input/40" /></div>
              <div className="sm:col-span-2"><Label className="text-xs">Warranty details</Label><Textarea rows={2} value={form.warranty_details} onChange={(e) => setForm({ ...form, warranty_details: e.target.value })} className="bg-input/40" /></div>
              <Button onClick={submit} className="sm:col-span-2 bg-primary text-primary-foreground">{editId ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <GlassCard className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/40 text-xs font-mono uppercase">
            <tr><th className="p-3 text-left">Product</th><th className="text-left">Type</th><th className="text-left">Price</th><th className="text-left">Stock</th><th className="text-left">Status</th><th className="text-left">Actions</th></tr>
          </thead>
          <tbody>
            {products?.map((p: any) => (
              <tr key={p.id} className="border-t border-border/40 hover:bg-white/5">
                <td className="p-3"><div className="font-semibold">{p.title}</div><div className="text-xs text-muted-foreground">{p.categories?.name}</div></td>
                <td className="text-xs">{p.product_type.replace("_", " ")}</td>
                <td className="font-mono text-neon-cyan">${p.price}</td>
                <td>{p.unlimited_stock ? "∞" : p.stock_quantity}</td>
                <td>{p.is_hidden ? <Badge variant="secondary">Hidden</Badge> : <Badge className="bg-green-500/20 text-green-300">Live</Badge>}{p.is_featured && <Badge className="ml-1 bg-yellow-500/20 text-yellow-300">★</Badge>}</td>
                <td className="p-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleHide(p.id, p.is_hidden)}>{p.is_hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleFeature(p.id, p.is_featured)}><Star className={`size-3.5 ${p.is_featured ? "text-yellow-400 fill-yellow-400" : ""}`} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
