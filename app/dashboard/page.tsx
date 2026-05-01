"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import ListPanel from "@/components/ListPanel";
import PartnerStatus from "@/components/PartnerStatus";
import PickerPage from "@/components/PickerPage";
import StatsPage from "@/components/StatsPage";
import ThemeToggle from "@/components/ThemeToggle";
import UsernameSetup from "@/components/UsernameSetup";
import { createCouple, getUserCoupleId } from "@/lib/couples";
import { getMyProfile } from "@/lib/profiles";
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
  const [username, setUsername] = useState<string | null>(null);
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

      const profile = await getMyProfile();
      setUsername(profile?.username ?? null);

      let id = await getUserCoupleId();
      if (!id) {
        const workspace = await createCouple();
        id = workspace?.id ?? null;
      }

      setCoupleId(id);
      setLoading(false);
    }

    load();
  }, [router]);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    localStorage.setItem(LAST_TAB_KEY, tab);
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-[#8b687e]">Loading...</main>;
  }

  if (!username) {
    return <UsernameSetup onSaved={setUsername} />;
  }

  if (!coupleId) {
    return <main className="flex min-h-screen items-center justify-center text-[#8b687e]">Preparing your planner...</main>;
  }

  return (
    <main className="min-h-screen text-[#493343]">
      <header className="mx-auto max-w-md px-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e06f92]">Our Date Planner</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#3f2a39]">Date planner</h1>
          </div>
          <ThemeToggle />
        </div>
        <div className="mt-4">
          <PartnerStatus coupleId={coupleId} />
        </div>
      </header>

      <div className={activeTab === "lists" || activeTab === "favorites" ? "mx-auto max-w-7xl" : "mx-auto max-w-md"}>
        {activeTab === "lists" && <ListPanel coupleId={coupleId} />}
        {activeTab === "favorites" && <ListPanel coupleId={coupleId} favoritesOnly />}
        {activeTab === "picker" && <PickerPage coupleId={coupleId} />}
        {activeTab === "stats" && <StatsPage coupleId={coupleId} />}
      </div>

      <BottomNav active={activeTab} setActive={handleTabChange} />
    </main>
  );
}
