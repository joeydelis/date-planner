"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getPostAuthPath = () => {
      const pendingInvite = sessionStorage.getItem("pending-invite");
      return pendingInvite ? `/join/${pendingInvite}` : "/dashboard";
    };

    setRedirectTo(`${window.location.origin}${getPostAuthPath()}`);

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(getPostAuthPath());
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") router.replace(getPostAuthPath());
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4 text-white">
      <section className="w-full max-w-sm rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-teal-200/70">Welcome</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Our Date Planner</h1>
          <p className="mt-2 text-sm text-zinc-400">Sign in or sign up with a magic link to plan together.</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#5eead4",
                  brandAccent: "#2dd4bf",
                  inputBackground: "#09090b",
                  inputText: "#fff",
                  inputBorder: "rgba(255,255,255,0.12)",
                  defaultButtonBackground: "rgba(255,255,255,0.06)",
                  defaultButtonBackgroundHover: "rgba(255,255,255,0.1)",
                },
              },
            },
          }}
          providers={[]}
          magicLink
          redirectTo={redirectTo}
        />
      </section>
    </main>
  );
}
