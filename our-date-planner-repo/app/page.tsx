"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function routeUser() {
      const { data } = await supabase.auth.getUser();
      router.replace(data.user ? "/dashboard" : "/login");
    }
    routeUser();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-zinc-300">
      <div className="rounded-lg border border-white/10 bg-white/[0.045] px-5 py-3 text-sm shadow-2xl shadow-black/30">
        Loading Our Date Planner
      </div>
    </main>
  );
}
