"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import DisconnectButton from "@/components/DisconnectButton";
import InvitePanel from "@/components/InvitePanel";
import ListPanel from "@/components/ListPanel";
import PartnerStatus from "@/components/PartnerStatus";
import PickerPage from "@/components/PickerPage";
import StatsPage from "@/components/StatsPage";
import { getUserCoupleId } from "@/lib/couples";
import { supabase } from "@/lib/supabase";
import type { Tab } from "@/types";

const LAST_TAB_KEY = "our-date-planner-last-tab";

function isTab(value: string | null): value is Tab {
  return value === "lists" || value === "favorites" || value === "picker" || value === "stats";
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("lists");
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedTab = localStorage.getItem(LAST_TAB_KEY);
    if (isTab(savedTab)) setActiveTab(savedTab);

    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }

      const id = await getUserCoupleId();
      setCoupleId(id);
      setLoading(false);
    }

    load();
  }, [router]);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    localStorage.setItem(LAST_TAB_KEY, tab);
  }

  async function refreshCouple() {
    const id = await getUserCoupleId();
    setCoupleId(id);
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">Loading...</main>;
  }

  if (!coupleId) {
    return (
      <main className="min-h-screen bg-zinc-950 p-4 text-white">
        <div className="mx-auto max-w-md pt-8">
          <p className="text-sm uppercase tracking-[0.3em] text-pink-300/70">Setup</p>
          <h1 className="mt-2 text-4xl font-semibold">Our Date Planner ❤️</h1>
          <p className="mt-3 text-zinc-400">Create an invite link and send it to your partner. You can start adding ideas right after creating your couple.</p>
          <div className="mt-8">
            <InvitePanel onCreated={refreshCouple} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="mx-auto max-w-md px-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-pink-300/70">Our Date Planner</p>
            <h1 className="text-2xl font-semibold">Plan together ❤️</h1>
          </div>
          <DisconnectButton />
        </div>
        <div className="mt-4">
          <PartnerStatus coupleId={coupleId} />
        </div>
      </header>

      <div className="mx-auto max-w-md">
        {activeTab === "lists" && <ListPanel coupleId={coupleId} />}
        {activeTab === "favorites" && <ListPanel coupleId={coupleId} favoritesOnly />}
        {activeTab === "picker" && <PickerPage coupleId={coupleId} />}
        {activeTab === "stats" && <StatsPage coupleId={coupleId} />}
      </div>

      <BottomNav active={activeTab} setActive={handleTabChange} />
    </main>
  );
}
