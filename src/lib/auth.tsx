// Bối cảnh đăng nhập giáo viên (Supabase Auth). Giữ phiên + cung cấp hook useAuth.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { AdminRole, Profile } from "./types";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  isAdmin: boolean;
  canManageContent: boolean;
  canGrade: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  async function loadProfile(s: Session | null) {
    if (!supabase || !s) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,active,created_at")
      .eq("id", s.user.id)
      .maybeSingle();
    const fallbackRole: AdminRole = s.user.email ? "teacher" : "teacher";
    setProfile(
      (data as Profile | null) ?? {
        id: s.user.id,
        email: s.user.email ?? null,
        full_name: s.user.user_metadata?.full_name ?? null,
        role: fallbackRole,
        active: true,
      },
    );
    setProfileLoading(false);
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      void loadProfile(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error("Chưa cấu hình Supabase — xem docs/SETUP.md.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setProfile(null);
  }

  const role = profile?.role ?? "teacher";
  const isAdmin = role === "owner" || role === "admin";
  const canManageContent = isAdmin || role === "content_editor";
  const canGrade = isAdmin || role === "teacher" || role === "grader";

  return (
    <Ctx.Provider
      value={{ session, profile, loading, profileLoading, isAdmin, canManageContent, canGrade, signIn, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return v;
}
