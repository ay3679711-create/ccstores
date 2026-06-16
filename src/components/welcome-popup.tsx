import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
          {settings?.welcome_popup_body ?? "You're signed in. Browse the marketplace, check out the community, and place your first order."}
        </p>
        <div className="glass rounded-xl p-3 border border-neon-cyan/30 mt-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Your ID</p>
          <p className="font-mono font-bold text-lg text-neon-cyan">{profile.cc_code}</p>
        </div>
        <Button onClick={() => setOpen(false)} className="w-full mt-4 glass border-neon-cyan/40 bg-white/5 hover:bg-white/10 text-foreground backdrop-blur-xl">Enter marketplace</Button>
      </DialogContent>
    </Dialog>
  );
}
