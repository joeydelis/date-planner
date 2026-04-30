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
    <main className="flex min-h-screen items-center justify-center p-4 text-[#493343]">
      <section className="w-full max-w-sm rounded-lg border border-[#f3bfd0] bg-white/80 p-6 shadow-2xl shadow-[#e06f92]/15 backdrop-blur">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e06f92]">Welcome</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#3f2a39]">Our Date Planner</h1>
          <p className="mt-2 text-sm text-[#8b687e]">Sign in or sign up with a magic link to plan together.</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#ff8fab",
                  brandAccent: "#f7729b",
                  inputBackground: "#ffffff",
                  inputText: "#493343",
                  inputBorder: "#f3bfd0",
                  defaultButtonBackground: "#fff3bf",
                  defaultButtonBackgroundHover: "#ffe36e",
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
