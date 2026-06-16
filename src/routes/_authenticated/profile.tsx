import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GlassCard, NeonHeading } from "@/components/cyber-ui";
import { Badge } from "@/components/ui/badge";


export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, refetch } = useProfile();
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", phone: "", bio: "" });
  const [saving, setSaving] = useState(false);

  if (!profile) return <AppShell><div className="p-8">Loading...</div></AppShell>;

  const fullName = form.full_name || profile.full_name || "";
  const phone = form.phone || profile.phone || "";
  const bio = form.bio || profile.bio || "";

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone, bio })
        .eq("id", user!.id);
      if (error) throw error;
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signed) {
      await supabase.from("profiles").update({ avatar_url: signed.signedUrl }).eq("id", user.id);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Avatar updated");
    }
  };

  const copy = (v: string, label: string) => navigator.clipboard.writeText(v).then(() => toast.success(`${label} copied`));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <NeonHeading className="text-3xl mb-8">Profile</NeonHeading>


        <GlassCard className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="size-20 ring-2 ring-neon-cyan/40">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-surface text-2xl">{profile.full_name?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <div>
              <Label className="text-xs cursor-pointer text-neon-cyan hover:underline inline-flex items-center gap-1">
                <Upload className="size-3" /> Change photo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
              </Label>
              <div className="mt-2"><Badge className="bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30 font-mono">{profile.cc_code}</Badge></div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Full name</Label>
              <Input value={fullName} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="bg-input/40" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={profile.email ?? ""} disabled className="bg-input/40" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-input/40" />
            </div>
            <div>
              <Label className="text-xs">Bio</Label>
              <Textarea value={bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="bg-input/40" />
            </div>
            <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground">{saving ? "Saving..." : "Save changes"}</Button>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="font-semibold mb-3">Account info</h3>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-muted-foreground">User code</dt><dd className="font-mono text-neon-cyan">{profile.cc_code}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Joined</dt><dd>{new Date(profile.created_at).toLocaleDateString()}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd>{profile.is_suspended ? <Badge variant="destructive">Suspended</Badge> : <Badge className="bg-green-500/20 text-green-300">Active</Badge>}</dd></div>
          </dl>
        </GlassCard>
      </div>
    </AppShell>
  );
}
