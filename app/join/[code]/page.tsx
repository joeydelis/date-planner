"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { joinCoupleByInvite } from "@/lib/couples";
import { supabase } from "@/lib/supabase";

export default function JoinInvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [status, setStatus] = useState("Checking invite...");

  useEffect(() => {
    async function join() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        sessionStorage.setItem("pending-invite", params.code);
        router.replace("/login");
        return;
      }

      try {
        await joinCoupleByInvite(params.code);
        sessionStorage.removeItem("pending-invite");
        setStatus("Connected. Redirecting...");
        window.setTimeout(() => router.replace("/dashboard"), 1000);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not join invite.");
      }
    }

    join();
  }, [params.code, router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-center text-white">
      <section className="max-w-sm rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/40 backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-tight">Joining Couple</h1>
        <p className="mt-3 text-zinc-400">{status}</p>
      </section>
    </main>
  );
}
