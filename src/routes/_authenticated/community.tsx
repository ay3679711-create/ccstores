import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Send, Megaphone, Plus, MessageSquare, Users as UsersIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard, NeonHeading } from "@/components/cyber-ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/community")({
  component: CommunityPage,
});

function CommunityPage() {
  const { data: isAdmin } = useIsAdmin();

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-neon-cyan">// Community Hub</p>
          <NeonHeading className="text-3xl">Network channel</NeonHeading>
          <p className="text-sm text-muted-foreground mt-1">Talk to admin support or chat with other users.</p>
        </div>

        <Tabs defaultValue="admin">
          <TabsList className="bg-surface/40">
            <TabsTrigger value="admin"><MessageSquare className="size-3.5 mr-1" /> Talk to admin</TabsTrigger>
            <TabsTrigger value="friends"><UsersIcon className="size-3.5 mr-1" /> Talk to users</TabsTrigger>
            <TabsTrigger value="announcements"><Megaphone className="size-3.5 mr-1" /> Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="admin"><AdminChat /></TabsContent>
          <TabsContent value="friends"><FriendsLounge /></TabsContent>
          <TabsContent value="announcements"><Announcements isAdmin={!!isAdmin} /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function AdminChat() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: thread } = useQuery({
    queryKey: ["my-admin-thread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const existing = await supabase.from("chat_threads").select("*").eq("user_id", user!.id).maybeSingle();
      if (existing.data) return existing.data;
      const { data } = await supabase.from("chat_threads").insert({ user_id: user!.id, subject: "Admin channel" }).select().single();
      return data;
    },
  });

  useEffect(() => {
    if (!thread) return;
    supabase.from("messages").select("*").eq("thread_id", thread.id).order("created_at").then(({ data }) => setMessages(data ?? []));
    const channel = supabase.channel(`thread:${thread.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${thread.id}` },
        (payload) => setMessages((prev) => [...prev, payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [thread]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!body.trim() || !thread) return;
    const { error } = await supabase.from("messages").insert({ thread_id: thread.id, sender_id: user!.id, body: body.trim(), is_admin: !!isAdmin });
    if (error) { toast.error(error.message); return; }
    await supabase.from("chat_threads").update({ last_message_at: new Date().toISOString() }).eq("id", thread.id);
    setBody("");
  };

  if (!thread) return <div className="p-8 text-center text-muted-foreground">Opening channel…</div>;

  return (
    <GlassCard className="mt-4 flex flex-col h-[520px]">
      <div className="px-4 py-3 border-b border-border/40 text-xs font-mono uppercase tracking-widest text-neon-violet">Private admin channel</div>
      <div className="flex-1 overflow-y-auto space-y-2 p-3">
        {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No messages yet. Say hi 👋</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === user!.id ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === user!.id ? "bg-primary text-primary-foreground" : "bg-surface text-foreground border border-border/50"}`}>
              {m.body}
              <div className="text-[9px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 p-3 border-t border-border/40">
        <Input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type message…" maxLength={1000} className="bg-input/40" />
        <Button onClick={send} className="bg-primary text-primary-foreground"><Send className="size-4" /></Button>
      </div>
    </GlassCard>
  );
}

function FriendsLounge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: posts } = useQuery({
    queryKey: ["friends-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("*, profiles!community_posts_user_id_fkey(full_name, cc_code, avatar_url)")
        .eq("is_announcement", false)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const submit = async () => {
    if (!title.trim() || !body.trim()) return;
    const { error } = await supabase.from("community_posts").insert({ user_id: user!.id, title: title.trim(), body: body.trim(), is_announcement: false });
    if (error) { toast.error(error.message); return; }
    toast.success("Posted");
    setTitle(""); setBody(""); setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["friends-posts"] });
  };

  return (
    <div className="mt-4">
      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)} className="w-full justify-start text-muted-foreground mb-3"><Plus className="size-4 mr-2" /> Start a thread</Button>
      ) : (
        <GlassCard className="p-4 mb-3 space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="bg-input/40" />
          <Textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={4} className="bg-input/40" />
          <div className="flex gap-2"><Button onClick={submit} className="bg-primary text-primary-foreground">Post</Button><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
        </GlassCard>
      )}
      <div className="space-y-3">
        {posts?.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No threads yet — be the first.</p>}
        {posts?.map((p: any) => (
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
    </div>
  );
}

function Announcements({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: posts } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("*")
        .eq("is_announcement", true)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const submit = async () => {
    if (!title.trim() || !body.trim()) return;
    const { error } = await supabase.from("community_posts").insert({ user_id: user!.id, title: title.trim(), body: body.trim(), is_announcement: true });
    if (error) { toast.error(error.message); return; }
    toast.success("Posted");
    setTitle(""); setBody(""); setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
  };

  return (
    <div className="mt-4">
      {isAdmin && (
        !open ? (
          <Button variant="outline" onClick={() => setOpen(true)} className="w-full justify-start text-muted-foreground mb-3"><Plus className="size-4 mr-2" /> Post announcement</Button>
        ) : (
          <GlassCard className="p-4 mb-3 space-y-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="bg-input/40" />
            <Textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={4} className="bg-input/40" />
            <div className="flex gap-2"><Button onClick={submit} className="bg-primary text-primary-foreground">Post</Button><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
          </GlassCard>
        )
      )}
      <div className="space-y-3">
        {posts?.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No announcements yet.</p>}
        {posts?.map((p: any) => (
          <GlassCard key={p.id} className="p-5 border-neon-violet/30">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="size-4 text-neon-violet" />
              <span className="text-xs text-neon-violet font-semibold">CC WHALE</span>
              <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
            </div>
            <h3 className="font-semibold mb-1">{p.title}</h3>
            <p className="text-sm whitespace-pre-wrap">{p.body}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
