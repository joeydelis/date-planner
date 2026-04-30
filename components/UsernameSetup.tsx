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
    <main className="flex min-h-screen items-center justify-center px-4 text-[#493343]">
      <section className="w-full max-w-sm rounded-lg border border-[#f3bfd0] bg-white/80 p-6 shadow-2xl shadow-[#e06f92]/15 backdrop-blur">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#ffe36e] text-[#8a6514]">
          <AtSign size={21} />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.28em] text-[#e06f92]">Your username</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#3f2a39]">Pick a handle</h1>
        <p className="mt-2 text-sm leading-6 text-[#8b687e]">Friends can invite you to a date planner with this username.</p>

        <div className="mt-6 flex items-center rounded-lg border border-[#f3bfd0] bg-white/85 px-3">
          <span className="text-[#c77d9a]">@</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
            }}
            placeholder="datebuddy"
            className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-[#493343] outline-none placeholder:text-[#c9a7b8]"
          />
        </div>

        <button onClick={save} className="mt-4 w-full rounded-lg bg-[#ff8fab] px-4 py-3 font-semibold text-white shadow-lg shadow-[#ff8fab]/25 transition hover:bg-[#f7729b]">
          Save username
        </button>
        {status && <p className="mt-3 text-sm text-[#8b687e]">{status}</p>}
      </section>
    </main>
  );
}
