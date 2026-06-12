import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, Shield, Zap, ArrowLeft, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(name, slug)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const handleBuy = async () => {
    if (!user) { navigate({ to: "/auth", search: { mode: "login" } }); return; }
    if (!product) return;
    setBuying(true);
    try {
      const subtotal = Number(product.price) * qty;
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          status: "awaiting_payment",
          subtotal,
          total: subtotal,
          currency: product.currency,
        })
        .select()
        .single();
      if (error) throw error;
      const { error: itemErr } = await supabase.from("order_items").insert({
        order_id: order.id,
        product_id: product.id,
        product_title: product.title,
        unit_price: product.price,
        quantity: qty,
        subtotal,
      });
      if (itemErr) throw itemErr;
      toast.success("Order created — submit payment to continue");
      navigate({ to: "/orders/$id", params: { id: order.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create order");
    } finally { setBuying(false); }
  };

  if (isLoading) return <AppShell><div className="max-w-6xl mx-auto p-8">Loading...</div></AppShell>;
  if (!product) return <AppShell><div className="max-w-6xl mx-auto p-8">Not found</div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-neon-cyan mb-6"><ArrowLeft className="size-4" /> Back to marketplace</Link>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="glass rounded-2xl overflow-hidden">
            <div className="aspect-square bg-surface/50 relative">
              {(product as any).stock_kind === "card" ? (
                <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-neon-violet/30 via-neon-cyan/15 to-background p-6 text-center">
                  <div>
                    <div className="font-mono text-xs text-neon-violet uppercase tracking-widest mb-3">CARD ON FILE</div>
                    <div className="font-mono text-2xl font-bold tracking-widest">XXXX XXXX XXXX XXXX</div>
                    <div className="font-mono text-xs text-muted-foreground mt-3">CVV ••• &nbsp;&nbsp; EXP ••/••</div>
                    <p className="text-[10px] text-muted-foreground mt-4 max-w-xs mx-auto">Real card number, CVV and expiry are revealed only after admin verifies your payment.</p>
                  </div>
                </div>
              ) : product.cover_image ? (
                <img src={product.cover_image} alt={product.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-muted-foreground/30 font-mono text-xs">NO PREVIEW</div>
              )}
            </div>
            {(product as any).stock_kind !== "card" && product.gallery_images?.length > 0 && (
              <div className="grid grid-cols-4 gap-2 p-2">
                {product.gallery_images.slice(0, 4).map((g: string, i: number) => (
                  <img key={i} src={g} className="w-full aspect-square object-cover rounded" alt="" />
                ))}
              </div>
            )}
          </div>

          <div>
            <Badge variant="outline" className="border-neon-cyan/40 text-neon-cyan mb-3">{product.product_type.replace("_", " ")}</Badge>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">{product.title}</h1>
            {product.categories && <p className="text-sm text-muted-foreground">in <span className="text-neon-cyan">{(product.categories as any).name}</span></p>}

            <div className="mt-6 flex items-baseline gap-3">
              <span className="font-mono text-4xl font-bold neon-text-cyan">${product.price}</span>
              <span className="text-sm text-muted-foreground">{product.currency}</span>
            </div>

            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">{product.description}</p>

            {product.tags?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {product.tags.map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-xs"><Tag className="size-3 mr-1" />{t}</Badge>
                ))}
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
              <div className="glass rounded-lg p-3"><Shield className="size-4 text-neon-cyan mb-1" /> Verified seller</div>
              <div className="glass rounded-lg p-3"><Zap className="size-4 text-neon-violet mb-1" /> Instant delivery</div>
            </div>

            <div className="mt-8 glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-muted-foreground">Quantity</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setQty(Math.max(1, qty - 1))}>−</Button>
                  <span className="w-8 text-center font-mono">{qty}</span>
                  <Button size="sm" variant="outline" onClick={() => setQty(qty + 1)}>+</Button>
                </div>
              </div>
              <Button onClick={handleBuy} disabled={buying} size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_24px_oklch(0.85_0.18_200_/_0.3)]">
                <ShoppingCart className="size-4 mr-2" />
                {buying ? "Creating order..." : `Buy now — $${(Number(product.price) * qty).toFixed(2)}`}
              </Button>
              {!user && <p className="text-xs text-muted-foreground text-center mt-2">You'll be asked to sign in</p>}
            </div>

            {product.warranty_details && (
              <div className="mt-4 text-xs text-muted-foreground p-4 glass rounded-lg">
                <strong className="text-foreground">Warranty:</strong> {product.warranty_details}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
