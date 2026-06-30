import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string | null;
  isAdmin: boolean;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      const [{ data: profile }, { data: roleRow }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", u.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.id).eq("role", "admin").maybeSingle(),
      ]);
      if (!mounted) return;
      setUser({
        id: u.id,
        email: profile?.email ?? u.email ?? null,
        fullName: profile?.full_name ?? null,
        isAdmin: !!roleRow,
      });
      setLoading(false);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
