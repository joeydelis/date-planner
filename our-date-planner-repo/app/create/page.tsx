"use client";

import { useRouter } from "next/navigation";
import InvitePanel from "@/components/InvitePanel";

export default function CreatePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-white">
      <div className="mx-auto max-w-md pt-8">
        <h1 className="text-3xl font-semibold">Create Couple ❤️</h1>
        <p className="mt-2 text-zinc-400">Generate a one-time invite link for your partner.</p>
        <div className="mt-6">
          <InvitePanel onCreated={() => router.push("/dashboard")} />
        </div>
      </div>
    </main>
  );
}
