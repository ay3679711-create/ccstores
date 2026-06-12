import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, ShoppingBag, Package, Users, User as UserIcon, Shield, LogOut, Bell } from "lucide-react";
import { useAuth, useProfile, useIsAdmin } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WelcomePopup } from "@/components/welcome-popup";
import type { ReactNode } from "react";

const navItems = [
  { to: "/marketplace", label: "Market", icon: ShoppingBag },
  { to: "/orders", label: "Orders", icon: Package, auth: true },
  { to: "/community", label: "Community", icon: Users, auth: true },
  { to: "/profile", label: "Profile", icon: UserIcon, auth: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="size-8 rounded-md bg-gradient-to-br from-neon-cyan to-neon-violet shadow-[0_0_20px_oklch(0.85_0.18_200_/_0.5)] group-hover:scale-105 transition-transform" />
            <div className="font-display font-black tracking-wider text-sm sm:text-base">
              CC <span className="neon-text-cyan">WHALE</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              if (item.auth && !user) return null;
              const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active ? "text-neon-cyan bg-neon-cyan/10" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  pathname.startsWith("/admin") ? "text-neon-violet bg-neon-violet/10" : "text-muted-foreground hover:text-neon-violet"
                }`}
              >
                <Shield className="size-3.5" />
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link to="/notifications" className="p-2 rounded-md hover:bg-white/5">
                  <Bell className="size-4" />
                </Link>
                <Link to="/profile" className="flex items-center gap-2">
                  <Avatar className="size-8 ring-1 ring-neon-cyan/40">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-surface text-xs">
                      {profile?.full_name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-xs font-mono text-neon-cyan">{profile?.cc_code}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut} title="Sign out">
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth"><Button variant="ghost" size="sm">Log in</Button></Link>
                <Link to="/auth" search={{ mode: "register" }}>
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_oklch(0.85_0.18_200_/_0.3)]">
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      {user && <WelcomePopup />}

      {/* Mobile bottom nav */}
      {user && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-border/40">
          <div className="grid grid-cols-4 h-16">
            {navItems.map((item) => {
              const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                    active ? "text-neon-cyan" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
