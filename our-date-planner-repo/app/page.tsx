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
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
      Loading Our Date Planner ❤️
    </main>
  );
}
