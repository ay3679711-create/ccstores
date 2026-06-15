import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deriveAdminChatCode } from "@/lib/user-codes";

export function WelcomePopup() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [open, setOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => (await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle()).data,
  });

  useEffect(() => {
    if (!user || !profile) return;
    try {
      if (sessionStorage.getItem("ccwhale_welcome_pending") === "1") {
        setOpen(true);
        sessionStorage.removeItem("ccwhale_welcome_pending");
      }
    } catch {}
  }, [user, profile]);

  if (!user || !profile) return null;
  const adminCode = deriveAdminChatCode(user.id);
  const friendsCode = (profile as any).community_code ?? "";

  const copy = (v: string, label: string) => {
    navigator.clipboard.writeText(v).then(() => toast.success(`${label} copied`));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass-strong border-neon-cyan/40 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="size-5 text-neon-cyan" />
            {settings?.welcome_popup_title ?? "Welcome back, operator"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {settings?.welcome_popup_body ?? "Your private access codes are below. Keep them safe — they unlock chat channels."}
        </p>

        <div className="space-y-3 mt-2">
          <CodeRow label="Your ID" value={profile.cc_code} hint="Public — admin sees this." onCopy={() => copy(profile.cc_code, "ID")} accent="cyan" />
          <CodeRow label="Admin chat code" value={adminCode} hint="Paste this in Community → Admin chat to open a private support thread." onCopy={() => copy(adminCode, "Admin chat code")} accent="violet" />
          <CodeRow label="Friends chat code" value={friendsCode} hint="Paste in Community → Friends chat to enter the discussion lounge." onCopy={() => copy(friendsCode, "Friends chat code")} accent="pink" />
        </div>

        <Button onClick={() => setOpen(false)} className="w-full mt-4 glass border-neon-cyan/40 bg-white/5 hover:bg-white/10 text-foreground backdrop-blur-xl">Enter marketplace</Button>
      </DialogContent>
    </Dialog>
  );
}

function CodeRow({ label, value, hint, onCopy, accent }: { label: string; value: string; hint: string; onCopy: () => void; accent: "cyan" | "violet" | "pink" }) {
  const color = accent === "cyan" ? "text-neon-cyan border-neon-cyan/30" : accent === "violet" ? "text-neon-violet border-neon-violet/30" : "text-neon-pink border-neon-pink/30";
  return (
    <div className={`glass rounded-xl p-3 border ${color.split(" ")[1]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className={`font-mono font-bold text-lg ${color.split(" ")[0]}`}>{value || "—"}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onCopy}><Copy className="size-4" /></Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}
