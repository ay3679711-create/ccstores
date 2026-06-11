import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Send, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/cyber-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  component: AdminMessages,
});

function AdminMessages() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: threads } = useQuery({
    queryKey: ["admin-threads"],
    queryFn: async () => (await supabase.from("chat_threads").select("*, profiles!chat_threads_user_id_fkey(cc_code, full_name)").order("last_message_at", { ascending: false })).data ?? [],
  });

  const { data: codes } = useQuery({
    queryKey: ["support-codes"],
    queryFn: async () => (await supabase.from("support_codes").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  useEffect(() => {
    if (!activeThread) return;
    supabase.from("messages").select("*").eq("thread_id", activeThread).order("created_at").then(({ data }) => setMessages(data ?? []));
    const channel = supabase.channel(`admin:${activeThread}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${activeThread}` },
        (p) => setMessages((prev) => [...prev, p.new]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeThread]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!body.trim() || !activeThread) return;
    await supabase.from("messages").insert({ thread_id: activeThread, sender_id: user!.id, body, is_admin: true });
    await supabase.from("chat_threads").update({ last_message_at: new Date().toISOString() }).eq("id", activeThread);
    setBody("");
  };

  const [newCode, setNewCode] = useState({ code: "", description: "" });
  const createCode = async () => {
    if (!newCode.code) return;
    await supabase.from("support_codes").insert(newCode);
    toast.success("Code created");
    setNewCode({ code: "", description: "" });
    qc.invalidateQueries({ queryKey: ["support-codes"] });
  };

  const [bcast, setBcast] = useState({ title: "", body: "" });
  const broadcast = async () => {
    if (!bcast.title) return;
    const { data: users } = await supabase.from("profiles").select("id");
    if (!users) return;
    const rows = users.map((u) => ({ user_id: u.id, type: "announcement" as const, title: bcast.title, body: bcast.body }));
    await supabase.from("notifications").insert(rows);
    toast.success(`Broadcast sent to ${users.length} users`);
    setBcast({ title: "", body: "" });
  };

  return (
    <Tabs defaultValue="chats">
      <TabsList className="bg-surface/40">
        <TabsTrigger value="chats">Support chats</TabsTrigger>
        <TabsTrigger value="codes">Access codes</TabsTrigger>
        <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
      </TabsList>

      <TabsContent value="chats">
        <div className="grid lg:grid-cols-[320px_1fr] gap-4">
          <GlassCard className="p-2 max-h-[600px] overflow-y-auto">
            {threads?.map((t: any) => (
              <button key={t.id} onClick={() => setActiveThread(t.id)} className={`w-full text-left p-3 rounded-lg hover:bg-white/5 ${activeThread === t.id ? "bg-neon-cyan/10" : ""}`}>
                <div className="font-mono text-xs text-neon-cyan">{t.profiles?.cc_code}</div>
                <div className="text-sm font-semibold">{t.profiles?.full_name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{t.subject}</div>
              </button>
            ))}
          </GlassCard>
          <GlassCard className="p-4 flex flex-col h-[600px]">
            {activeThread ? (
              <>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.is_admin ? "bg-neon-violet/20 text-foreground border border-neon-violet/30" : "bg-surface"}`}>
                        {m.body}
                        <div className="text-[9px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
                <div className="flex gap-2 pt-2 border-t border-border/40">
                  <Input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Reply..." className="bg-input/40" />
                  <Button onClick={send} className="bg-primary text-primary-foreground"><Send className="size-4" /></Button>
                </div>
              </>
            ) : (
              <div className="flex-1 grid place-items-center text-muted-foreground">Select a thread</div>
            )}
          </GlassCard>
        </div>
      </TabsContent>

      <TabsContent value="codes">
        <GlassCard className="p-6 mb-4">
          <h3 className="font-semibold mb-3">Generate access code</h3>
          <div className="grid sm:grid-cols-3 gap-2">
            <Input placeholder="Code (e.g. VIP-2026)" value={newCode.code} onChange={(e) => setNewCode({ ...newCode, code: e.target.value })} className="bg-input/40" />
            <Input placeholder="Description" value={newCode.description} onChange={(e) => setNewCode({ ...newCode, description: e.target.value })} className="bg-input/40" />
            <Button onClick={createCode} className="bg-primary text-primary-foreground"><Plus className="size-4 mr-1" /> Create</Button>
          </div>
        </GlassCard>
        <GlassCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface/40 text-xs font-mono uppercase"><tr><th className="p-3 text-left">Code</th><th className="text-left">Description</th><th className="text-left">Active</th><th className="text-left">Created</th></tr></thead>
            <tbody>{codes?.map((c) => <tr key={c.id} className="border-t border-border/40"><td className="p-3 font-mono text-neon-cyan">{c.code}</td><td>{c.description}</td><td>{c.is_active ? "✓" : "✗"}</td><td className="text-xs">{new Date(c.created_at).toLocaleDateString()}</td></tr>)}</tbody>
          </table>
        </GlassCard>
      </TabsContent>

      <TabsContent value="broadcast">
        <GlassCard className="p-6 space-y-3">
          <div className="flex items-center gap-2 mb-2"><Megaphone className="size-4 text-neon-violet" /><h3 className="font-semibold">Broadcast notification to all users</h3></div>
          <Input placeholder="Title" value={bcast.title} onChange={(e) => setBcast({ ...bcast, title: e.target.value })} maxLength={200} className="bg-input/40" />
          <Textarea placeholder="Body" rows={4} value={bcast.body} onChange={(e) => setBcast({ ...bcast, body: e.target.value })} maxLength={1000} className="bg-input/40" />
          <Button onClick={broadcast} className="bg-primary text-primary-foreground"><Send className="size-4 mr-2" /> Send broadcast</Button>
        </GlassCard>
      </TabsContent>
    </Tabs>
  );
}
