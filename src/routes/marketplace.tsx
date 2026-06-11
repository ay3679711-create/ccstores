import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NeonHeading } from "@/components/cyber-ui";

const searchSchema = z.object({ category: z.string().optional(), q: z.string().optional() });

export const Route = createFileRoute("/marketplace")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Marketplace — CC Whale" },
      { name: "description", content: "Browse all verified digital products, software licenses, subscriptions, gift cards, and gaming items." },
    ],
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");

  const { data: categories } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search.category, search.q],
    queryFn: async () => {
      let query = supabase.from("products").select("*, categories(name, slug)").eq("is_hidden", false);
      if (search.category) {
        const cat = await supabase.from("categories").select("id").eq("slug", search.category).single();
        if (cat.data) query = query.eq("category_id", cat.data.id);
      }
      if (search.q) query = query.ilike("title", `%${search.q}%`);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neon-cyan mb-2">// Marketplace</p>
          <NeonHeading className="text-3xl sm:text-4xl">The full catalog</NeonHeading>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products..."
              className="pl-10 bg-input/40"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  window.location.href = `/marketplace?q=${encodeURIComponent(q)}`;
                }
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <Link to="/marketplace">
            <Button variant={!search.category ? "default" : "outline"} size="sm">All</Button>
          </Link>
          {categories?.map((c) => (
            <Link key={c.id} to="/marketplace" search={{ category: c.slug }}>
              <Button variant={search.category === c.slug ? "default" : "outline"} size="sm">{c.name}</Button>
            </Link>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => <div key={i} className="glass rounded-2xl aspect-[3/4] animate-pulse" />)}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p) => (
              <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="group glass rounded-2xl overflow-hidden hover:border-neon-cyan/50 transition-all">
                <div className="aspect-square bg-surface/50 relative overflow-hidden">
                  {p.cover_image ? (
                    <img src={p.cover_image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground/30 font-mono text-xs">PREVIEW</div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded glass text-[10px] font-mono uppercase">{p.product_type.replace("_", " ")}</div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-sm line-clamp-1">{p.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{p.short_description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-mono text-neon-cyan font-bold">${p.price}</span>
                    <span className="text-[10px] text-muted-foreground">{p.unlimited_stock ? "In stock" : `${p.stock_quantity} left`}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
            <Filter className="size-10 mx-auto mb-3 opacity-50" />
            <p>No products match your filters.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
