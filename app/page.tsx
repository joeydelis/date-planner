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
    <main className="flex min-h-screen items-center justify-center text-[#493343]">
      <div className="rounded-lg border border-[#f3bfd0] bg-white/80 px-5 py-3 text-sm font-medium shadow-2xl shadow-[#e06f92]/15">
        Loading Our Date Planner
      </div>
    </main>
  );
}
