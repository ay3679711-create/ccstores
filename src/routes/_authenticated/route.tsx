import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Suspension check — banned users get bounced to the suspended page
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_suspended, suspended_until")
      .eq("id", data.user.id)
      .single();
    const banned = !!profile?.is_suspended &&
      (!profile.suspended_until || new Date(profile.suspended_until) > new Date());
    if (banned) throw redirect({ to: "/suspended" });

    return { user: data.user };
  },
  component: () => <Outlet />,
});
