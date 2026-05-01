"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const THEME_KEY = "our-date-planner-theme";

export default function ThemeToggle() {
  const [nightMode, setNightMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const startsNight = savedTheme === "night";
    setNightMode(startsNight);
    document.documentElement.dataset.theme = startsNight ? "night" : "day";
    document.body.classList.toggle("night-mode", startsNight);
  }, []);

  function toggleTheme() {
    const nextNightMode = !nightMode;
    setNightMode(nextNightMode);
    localStorage.setItem(THEME_KEY, nextNightMode ? "night" : "day");
    document.documentElement.dataset.theme = nextNightMode ? "night" : "day";
    document.body.classList.toggle("night-mode", nextNightMode);
  }

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#f3bfd0] bg-white/70 text-[#8b687e] shadow-sm transition hover:border-[#e06f92] hover:bg-[#fff0f5] hover:text-[#c7466f]"
      aria-label={nightMode ? "Switch to day mode" : "Switch to night mode"}
      title={nightMode ? "Day mode" : "Night mode"}
    >
      {nightMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
