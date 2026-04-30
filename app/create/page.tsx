"use client";

import { useRouter } from "next/navigation";
import InvitePanel from "@/components/InvitePanel";

export default function CreatePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen px-4 py-8 text-[#493343]">
      <div className="mx-auto max-w-md">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e06f92]">Setup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#3f2a39]">Create Couple</h1>
        <p className="mt-2 leading-7 text-[#8b687e]">Generate a one-time invite link for your partner.</p>
        <div className="mt-6">
          <InvitePanel onCreated={() => router.push("/dashboard")} />
        </div>
      </div>
    </main>
  );
}
