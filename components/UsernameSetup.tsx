"use client";

import { AtSign } from "lucide-react";
import { useState } from "react";
import { saveMyUsername } from "@/lib/profiles";

type Props = {
  onSaved: (username: string) => void;
};

export default function UsernameSetup({ onSaved }: Props) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    try {
      setStatus("Saving...");
      const saved = await saveMyUsername(username);
      onSaved(saved);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save username.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-white">
      <section className="w-full max-w-sm rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-300/10 text-teal-200">
          <AtSign size={21} />
        </div>
        <p className="mt-5 text-xs font-medium uppercase tracking-[0.28em] text-teal-200/70">Your username</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pick a handle</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Friends can invite you to a date planner with this username.</p>

        <div className="mt-6 flex items-center rounded-lg border border-white/10 bg-zinc-950/70 px-3">
          <span className="text-zinc-500">@</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
            }}
            placeholder="datebuddy"
            className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>

        <button onClick={save} className="mt-4 w-full rounded-lg bg-teal-300 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-teal-200">
          Save username
        </button>
        {status && <p className="mt-3 text-sm text-zinc-400">{status}</p>}
      </section>
    </main>
  );
}
