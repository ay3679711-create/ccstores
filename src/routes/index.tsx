import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Zap, BadgeCheck, MessagesSquare, ArrowRight, Package, Code, Repeat, Gift, Gamepad2, Box, Sparkles, Activity, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { CountUp, GlassCard, NeonHeading } from "@/components/cyber-ui";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "nidia's no.1 garanted cc store" },
      { name: "description", content: "Cyberpunk marketplace for legal digital products, software licenses, subscriptions, gift cards, and gaming assets. Secure transactions, instant digital delivery." },
      { property: "og:title", content: "CC Whale Marketplace" },
      { property: "og:description", content: "Premium cyber marketplace for legal digital goods. Verified. Instant. Secure." },
    ],
  }),
  component: Landing,
});

const iconMap: Record<string, any> = { package: Package, code: Code, repeat: Repeat, gift: Gift, "gamepad-2": Gamepad2, box: Box };

function getOrCreateVisitorId() {
  try {
    const k = "ccwhale_visitor_id";
    let v = localStorage.getItem(k);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
    return v;
  } catch { return crypto.randomUUID(); }
}

function Landing() {
  // Track a visit once per session
  useEffect(() => {
    try {
      if (sessionStorage.getItem("ccwhale_visit_logged") === "1") return;
      const vid = getOrCreateVisitorId();
      supabase.from("visits").insert({ visitor_id: vid, path: "/" }).then(() => {
        sessionStorage.setItem("ccwhale_visit_logged", "1");
      });
    } catch {}
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const since5m = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const sinceToday = new Date(); sinceToday.setHours(0, 0, 0, 0);
      const [users, products, orders, visits24, live, joinedToday] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_hidden", false),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("visits").select("*", { count: "exact", head: true }).gte("created_at", since24h),
        supabase.from("visits").select("*", { count: "exact", head: true }).gte("created_at", since5m),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sinceToday.toISOString()),
      ]);
      return {
        users: users.count ?? 0,
        products: products.count ?? 0,
        orders: orders.count ?? 0,
        visits24: visits24.count ?? 0,
        live: live.count ?? 0,
        joinedToday: joinedToday.count ?? 0,
      };
    },
    refetchInterval: 15000,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .is("parent_id", null)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: featured } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,title,slug,price,cover_image,rating,product_type,short_description,stock_kind")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
        <div className="absolute -top-20 -left-20 size-[500px] rounded-full bg-neon-blue/15 blur-[100px] pointer-events-none" />
        <div className="absolute top-40 -right-20 size-[420px] rounded-full bg-neon-violet/15 blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-neon-cyan/30 mb-6">
              <span className="size-1.5 rounded-full bg-neon-cyan animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neon-cyan">System Online • v4.0.2</span>
            </div>

            <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl leading-[0.95] tracking-tight max-w-4xl">
              The digital
              <br />
              <span className="bg-gradient-to-r from-neon-cyan via-neon-blue to-neon-violet bg-clip-text text-transparent uppercase tracking-[0.1em]">
                CC Store
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base sm:text-lg text-muted-foreground">
              nidia's no.1 garanted cc store and unlimited features with secqure tranjection and more feature as compare to other website
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/marketplace">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_oklch(0.85_0.18_200_/_0.4)]">
                  <Sparkles className="size-4 mr-2" /> Explore Marketplace
                </Button>
              </Link>
              <Link to="/auth" search={{ mode: "register" }}>
                <Button size="lg" variant="outline" className="border-neon-violet/40 hover:bg-neon-violet/10 hover:text-foreground">
                  Create Account
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="ghost">Sign In <ArrowRight className="size-4 ml-1" /></Button>
              </Link>
            </div>
          </motion.div>

          {/* Stats strip - live metrics */}
          <div className="mt-16 grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { label: "Live now", value: "9.6k", color: "neon-cyan", pulse: true },
              { label: "Visits / 24h", value: "42k", color: "neon-blue" },
              { label: "Joined today", value: "70", color: "neon-pink" },
              { label: "Total users", value: "180k", color: "neon-cyan" },
              { label: "Active listings", value: "34k", color: "neon-violet" },
              { label: "Orders done", value: "47925673", color: "neon-pink" },
            ].map((s: any, i: number) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="glass rounded-2xl p-4 relative overflow-hidden"
              >
                <div className="flex items-center gap-1.5">
                  {s.pulse && <span className="size-1.5 rounded-full bg-neon-cyan animate-pulse" />}
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">{s.label}</p>
                </div>
                <p className={`mt-1 font-display text-2xl font-bold text-${s.color}`} style={{ textShadow: `0 0 16px var(--${s.color})` }}>
                  {typeof s.value === "string" ? s.value : <CountUp to={s.value} />}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div className="border-y border-border/40 bg-surface/40 py-3 overflow-hidden">
        <div className="flex gap-12 animate-marquee whitespace-nowrap text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
          {[...Array(2)].flatMap((_, i) => [
            <span key={`a${i}`} className="flex items-center gap-2"><Activity className="size-3 text-neon-cyan" /> AMAZON LODED ACCOUNT</span>,
            <span key={`b${i}`} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-neon-violet animate-pulse" /> NEW VIP PROXY</span>,
            <span key={`c${i}`} className="flex items-center gap-2"><Activity className="size-3 text-neon-cyan" /> {"\n"}</span>,
            <span key={`d${i}`} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-neon-pink animate-pulse" /> NEW ALL FUNCTION</span>,
            <span key={`e${i}`} className="flex items-center gap-2"><Activity className="size-3 text-neon-cyan" /> SUBSCRIPTION PREMIUM</span>,
          ])}
        </div>
      </div>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neon-cyan mb-2">// Categories</p>
            <NeonHeading className="text-3xl sm:text-4xl">Explore the vault</NeonHeading>
          </div>
          <Link to="/marketplace" className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-neon-cyan flex items-center gap-1">
            View all <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories?.map((c, i) => {
            const Icon = iconMap[c.icon ?? "box"] ?? Box;
            return (
              <Link
                key={c.id}
                to="/marketplace"
                search={{ category: c.slug }}
                className="group glass rounded-2xl p-5 hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all relative overflow-hidden"
              >
                <Icon className="size-6 mb-3 text-neon-cyan group-hover:scale-110 transition-transform" />
                <div className="text-sm font-semibold">{c.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground mt-1">0{i + 1}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neon-violet mb-2">// Popular</p>
            <NeonHeading className="text-3xl sm:text-4xl">Featured assets</NeonHeading>
          </div>
        </div>

        {featured && featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map((p: any) => {
              const isCard = p.stock_kind === "card";
              return (
                <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="group glass rounded-2xl overflow-hidden hover:border-neon-cyan/50 transition-all">
                  <div className={`aspect-square relative overflow-hidden ${isCard ? "bg-gradient-to-br from-neon-violet/20 via-neon-cyan/10 to-background" : "bg-surface/50"}`}>
                    {isCard ? (
                      <div className="absolute inset-0 grid place-items-center text-center p-4">
                        <div>
                          <div className="font-mono text-xs text-neon-violet uppercase tracking-widest mb-2">CARD</div>
                          <div className="font-mono text-lg font-bold">XXXX XXXX XXXX XXXX</div>
                          <div className="font-mono text-[10px] text-muted-foreground mt-2">CVV ••• &nbsp; EXP ••/••</div>
                        </div>
                      </div>
                    ) : p.cover_image ? (
                      <img src={p.cover_image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground/40 font-mono text-xs">PREVIEW</div>
                    )}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded glass text-[10px] font-mono uppercase">{p.stock_kind ?? p.product_type.replace("_", " ")}</div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-1">{p.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{p.short_description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-mono text-neon-cyan font-bold">${p.price}</span>
                      <span className="text-[10px] text-muted-foreground">★ {p.rating ?? 0}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <GlassCard className="p-12 text-center text-muted-foreground">
            <Package className="size-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No products listed yet. Check back soon.</p>
          </GlassCard>
        )}
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Shield, title: "Secure Transactions", desc: "End-to-end encrypted exchange with manual verification.", color: "neon-cyan" },
            { icon: Zap, title: "Instant Delivery", desc: "Digital cards,account dispatched the moment payment clears review.", color: "neon-blue" },
            { icon: BadgeCheck, title: "Verified Marketplace", desc: "Every listing curated and validated before going live.", color: "neon-violet" },
            { icon: MessagesSquare, title: "24/7 Community", desc: "Private support and an active discussion hub.", color: "neon-pink" },
          ].map((f) => (
            <GlassCard key={f.title} className="p-6">
              <div className={`size-10 rounded-lg grid place-items-center mb-4 bg-${f.color}/10 text-${f.color}`}>
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-10">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neon-cyan mb-2">// FAQ</p>
          <NeonHeading className="text-3xl sm:text-4xl">Operational intel</NeonHeading>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {[
            { q: "How does delivery work?", a: "Once payment is verified by an admin, digital keys, accounts, or download links are dispatched to your dashboard inbox and email immediately." },
            { q: "Are all products legal?", a: "Yes. CC Whale only allows legal digital goods. Every listing is reviewed before publishing. We never store payment card data or third-party credentials." },
            { q: "How are payments verified?", a: "Submit your transaction details and screenshot. Our verification team reviews within 12 hours. You'll receive a notification when status updates." },
            { q: "Can I request a refund?", a: "Refunds are handled case-by-case before delivery. Once a digital good is delivered and used, it cannot be refunded." },
            { q: "What is my CC code?", a: "Every user receives a unique permanent identifier (e.g. CC42) at signup. Use it for support and verification — it can never be changed." },
          ].map((f, i) => (
            <AccordionItem key={i} value={`f${i}`} className="glass rounded-xl border-border/40 px-5">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/40 bg-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-gradient-to-br from-neon-cyan to-neon-violet" />
            <span className="font-display font-black tracking-wider text-sm">CC <span className="neon-text-cyan">STORE</span></span>
          </div>
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            © 2026 CC MARKET @COPYRIGHT CCSTORE OFFICIAL INDIA
          </div>
        </div>
      </footer>
    </AppShell>
  );
}
