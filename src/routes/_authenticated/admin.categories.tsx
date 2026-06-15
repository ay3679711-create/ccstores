import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlassCard } from "@/components/cyber-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategories,
});

const ICONS = ["box", "package", "code", "repeat", "gift", "gamepad-2"];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function AdminCategories() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: "", slug: "", icon: "box", parent_id: "", sort_order: 0, is_active: true });

  const { data: categories } = useQuery({
    queryKey: ["categories-admin-full"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });

  const mains = categories?.filter((c: any) => !c.parent_id) ?? [];

  const reset = () => { setEditing(null); setForm({ name: "", slug: "", icon: "box", parent_id: "", sort_order: 0, is_active: true }); };

  const save = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      icon: form.icon || null,
      parent_id: form.parent_id || null,
      sort_order: form.sort_order ?? 0,
      is_active: form.is_active,
    };
    if (editing) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Category updated");
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Category created");
    }
    setOpen(false); reset();
    qc.invalidateQueries({ queryKey: ["categories-admin-full"] });
    qc.invalidateQueries({ queryKey: ["categories-admin"] });
    qc.invalidateQueries({ queryKey: ["categories-public"] });
    qc.invalidateQueries({ queryKey: ["categories-all"] });
  };

  const startEdit = (c: any) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, icon: c.icon ?? "box", parent_id: c.parent_id ?? "", sort_order: c.sort_order, is_active: c.is_active });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete category? Sub-categories will be deleted too. Products in this category will be uncategorized.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["categories-admin-full"] });
  };

  return (
    <div>
      <div className="flex justify-between mb-4 items-center">
        <h2 className="text-lg font-semibold">{categories?.length ?? 0} categories</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground"><Plus className="size-4 mr-1" /> New category</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg glass-strong border-neon-cyan/30">
            <DialogHeader><DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} className="bg-input/40" /></div>
              <div><Label className="text-xs">Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-input/40 font-mono" /></div>
              <div>
                <Label className="text-xs">Icon</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger className="bg-input/40"><SelectValue /></SelectTrigger>
                  <SelectContent>{ICONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Parent (leave empty for main category)</Label>
                <Select value={form.parent_id || "__none"} onValueChange={(v) => setForm({ ...form, parent_id: v === "__none" ? "" : v })}>
                  <SelectTrigger className="bg-input/40"><SelectValue placeholder="None (main)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None (main category)</SelectItem>
                    {mains.filter((m: any) => m.id !== editing?.id).map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="bg-input/40" /></div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} id="active" />
                <Label htmlFor="active" className="text-xs">Active (visible on site)</Label>
              </div>
              <Button onClick={save} className="sm:col-span-2 bg-primary text-primary-foreground"><Save className="size-4 mr-1" />{editing ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <GlassCard className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface/40 text-xs font-mono uppercase">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="text-left">Slug</th>
              <th className="text-left">Type</th>
              <th className="text-left">Sort</th>
              <th className="text-left">Status</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mains.map((m: any) => {
              const subs = categories?.filter((c: any) => c.parent_id === m.id) ?? [];
              return (
                <>
                  <tr key={m.id} className="border-t border-border/40 hover:bg-white/5">
                    <td className="p-3 font-semibold">{m.name}</td>
                    <td className="font-mono text-xs text-neon-cyan">{m.slug}</td>
                    <td><Badge className="bg-neon-cyan/20 text-neon-cyan">Main</Badge></td>
                    <td>{m.sort_order}</td>
                    <td>{m.is_active ? <Badge className="bg-green-500/20 text-green-300">Active</Badge> : <Badge variant="secondary">Hidden</Badge>}</td>
                    <td className="p-3 flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(m)}><Pencil className="size-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                    </td>
                  </tr>
                  {subs.map((s: any) => (
                    <tr key={s.id} className="border-t border-border/40 hover:bg-white/5 bg-white/[0.02]">
                      <td className="p-3 pl-8 text-muted-foreground">↳ {s.name}</td>
                      <td className="font-mono text-xs text-neon-violet">{s.slug}</td>
                      <td><Badge variant="outline">Sub</Badge></td>
                      <td>{s.sort_order}</td>
                      <td>{s.is_active ? <Badge className="bg-green-500/20 text-green-300">Active</Badge> : <Badge variant="secondary">Hidden</Badge>}</td>
                      <td className="p-3 flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(s)}><Pencil className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
            {mains.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No categories yet. Create one to get started.</td></tr>
            )}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
