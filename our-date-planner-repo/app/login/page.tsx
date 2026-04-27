"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white">
      <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-pink-300/70">Welcome</p>
          <h1 className="mt-2 text-3xl font-semibold">Our Date Planner ❤️</h1>
          <p className="mt-2 text-sm text-zinc-400">Sign in with a magic link to plan together.</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#ec4899",
                  brandAccent: "#db2777",
                  inputBackground: "#18181b",
                  inputText: "#fff",
                },
              },
            },
          }}
          providers={[]}
          magicLink
          redirectTo={typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined}
        />
      </section>
    </main>
  );
}
