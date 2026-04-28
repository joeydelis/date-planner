"use client";

import { useRouter } from "next/navigation";
import InvitePanel from "@/components/InvitePanel";

export default function CreatePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen px-4 py-8 text-white">
      <div className="mx-auto max-w-md">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-teal-200/70">Setup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create Couple</h1>
        <p className="mt-2 leading-7 text-zinc-400">Generate a one-time invite link for your partner.</p>
        <div className="mt-6">
          <InvitePanel onCreated={() => router.push("/dashboard")} />
        </div>
      </div>
    </main>
  );
}
