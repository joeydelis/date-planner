"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import ListPanel from "@/components/ListPanel";
import PartnerStatus from "@/components/PartnerStatus";
import PickerPage from "@/components/PickerPage";
import StatsPage from "@/components/StatsPage";
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
    return <main className="flex min-h-screen items-center justify-center bg-[#07080a] text-[#8d98ad]">Loading...</main>;
  }

  if (!username) {
    return <UsernameSetup onSaved={setUsername} />;
  }

  if (!coupleId) {
    return <main className="flex min-h-screen items-center justify-center bg-[#07080a] text-[#8d98ad]">Preparing your planner...</main>;
  }

  return (
    <main className="min-h-screen overflow-hidden text-[#edf3ff]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,rgba(9,15,31,0.64),rgba(3,4,6,0.96))]" />

      <header className="mx-auto max-w-6xl px-4 pt-4 md:px-6">
        <PartnerStatus coupleId={coupleId} />
      </header>

      <div className={activeTab === "lists" || activeTab === "favorites" ? "mx-auto max-w-6xl" : "mx-auto max-w-2xl"}>
        {activeTab === "lists" && <ListPanel coupleId={coupleId} />}
        {activeTab === "favorites" && <ListPanel coupleId={coupleId} favoritesOnly />}
        {activeTab === "picker" && <PickerPage coupleId={coupleId} />}
        {activeTab === "stats" && <StatsPage coupleId={coupleId} />}
      </div>

      <BottomNav active={activeTab} setActive={handleTabChange} />
    </main>
  );
}
