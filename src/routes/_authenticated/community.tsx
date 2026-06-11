import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { MessageSquare, Send, Lock, Megaphone, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GlassCard, NeonHeading } from "@/components/cyber-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/community")({
  component: CommunityPage,
});

function CommunityPage() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [accessCode, setAccessCode] = useState("");
  const [supportOpen, setSupportOpen] = useState(false);

  const { data: posts } = useQuery({
    queryKey: ["community-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*, profiles!community_posts_user_id_fkey(full_name, cc_code, avatar_url)")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: thread } = useQuery({
    queryKey: ["my-support-thread", user?.id],
    enabled: !!user && supportOpen,
    queryFn: async () => {
      const { data } = await supabase.from("chat_threads").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const checkCode = async () => {
    const code = accessCode.trim();
    if (!code) return;
    const { data, error } = await supabase
      .from("support_codes")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) {
      toast.error("Invalid access code. Please verify and try again.");
      return;
    }
    // Create thread if not exists
    if (!thread) {
      const { data: newThread, error: createErr } = await supabase
        .from("chat_threads")
        .insert({ user_id: user!.id, subject: "Support: " + code })
        .select()
        .single();
      if (createErr) { toast.error(createErr.message); return; }
      queryClient.invalidateQueries({ queryKey: ["my-support-thread"] });
    }
    setSupportOpen(true);
    toast.success("Access granted");
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-neon-cyan">// Community Hub</p>
            <NeonHeading className="text-3xl">Network channel</NeonHeading>
          </div>
          <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-neon-violet/40"><Lock className="size-4 mr-2" /> Private Support</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-neon-cyan/30 max-w-2xl">
              <DialogHeader><DialogTitle>Private admin support</DialogTitle></DialogHeader>
              {!thread ? (
                <div className="space-y-3 py-4">
                  <p className="text-sm text-muted-foreground">Enter your support access code to start a private chat.</p>
                  <Input
                    placeholder="Access code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="bg-input/40 font-mono"
                  />
                  <Button onClick={checkCode} className="w-full bg-primary text-primary-foreground">Verify & open chat</Button>
                </div>
              ) : (
                <SupportChat threadId={thread.id} />
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="discussions">
          <TabsList className="bg-surface/40">
            <TabsTrigger value="discussions">Discussions</TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
          </TabsList>
          <TabsContent value="discussions">
            <NewPostCard isAdmin={false} />
            <div className="space-y-3">
              {posts?.filter((p: any) => !p.is_announcement).map((p: any) => (
                <GlassCard key={p.id} className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-neon-cyan">{p.profiles?.cc_code ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
                  </div>
                  <h3 className="font-semibold mb-1">{p.title}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.body}</p>
                </GlassCard>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="announcements">
            {isAdmin && <NewPostCard isAdmin />}
            <div className="space-y-3">
              {posts?.filter((p: any) => p.is_announcement).map((p: any) => (
                <GlassCard key={p.id} className="p-5 border-neon-violet/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Megaphone className="size-4 text-neon-violet" />
                    <span className="text-xs text-neon-violet font-semibold">ADMIN</span>
                    <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
                  </div>
                  <h3 className="font-semibold mb-1">{p.title}</h3>
                  <p className="text-sm whitespace-pre-wrap">{p.body}</p>
                </GlassCard>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function NewPostCard({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const submit = async () => {
    if (!title.trim() || !body.trim()) return;
    const { error } = await supabase.from("community_posts").insert({
      user_id: user!.id, title, body, is_announcement: isAdmin,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Posted");
    setTitle(""); setBody(""); setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["community-posts"] });
  };

  return (
    <div className="mb-4">
      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)} className="w-full justify-start text-muted-foreground"><Plus className="size-4 mr-2" /> {isAdmin ? "Post announcement" : "Start discussion"}</Button>
      ) : (
        <GlassCard className="p-4 space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="bg-input/40" />
          <Textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={4} className="bg-input/40" />
          <div className="flex gap-2">
            <Button onClick={submit} className="bg-primary text-primary-foreground">Post</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function SupportChat({ threadId }: { threadId: string }) {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("messages").select("*").eq("thread_id", threadId).order("created_at").then(({ data }) => setMessages(data ?? []));
    const channel = supabase.channel(`thread:${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        (payload) => setMessages((prev) => [...prev, payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!body.trim()) return;
    const { error } = await supabase.from("messages").insert({
      thread_id: threadId, sender_id: user!.id, body, is_admin: !!isAdmin,
    });
    if (error) { toast.error(error.message); return; }
    setBody("");
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === user!.id ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
              m.sender_id === user!.id ? "bg-primary text-primary-foreground" : "bg-surface text-foreground"
            }`}>
              {m.body}
              <div className="text-[9px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 pt-2 border-t border-border/40">
        <Input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type message..." className="bg-input/40" />
        <Button onClick={send} className="bg-primary text-primary-foreground"><Send className="size-4" /></Button>
      </div>
    </div>
  );
}
