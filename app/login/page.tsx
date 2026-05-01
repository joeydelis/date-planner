"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);

  useEffect(() => {
    const getPostAuthPath = () => {
      const pendingInvite = sessionStorage.getItem("pending-invite");
      return pendingInvite ? `/join/${pendingInvite}` : "/dashboard";
    };

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(getPostAuthPath());
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") router.replace(getPostAuthPath());
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  function getPostAuthRedirect() {
    const pendingInvite = sessionStorage.getItem("pending-invite");
    const path = pendingInvite ? `/join/${pendingInvite}` : "/dashboard";
    return `${window.location.origin}${path}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setCanResendConfirmation(false);

    const credentials = {
      email: email.trim(),
      password,
    };

    const response =
      mode === "signin"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp({
            ...credentials,
            options: {
              emailRedirectTo: getPostAuthRedirect(),
            },
          });

    setLoading(false);

    if (response.error) {
      setError(response.error.message);
      return;
    }

    if (mode === "signup" && !response.data.session) {
      setCanResendConfirmation(true);
      setMessage("Supabase created the account, but email confirmation is required before sign in.");
      return;
    }

    router.replace("/dashboard");
  }

  async function sendMagicLink() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email first.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setCanResendConfirmation(false);

    const { error: linkError } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: getPostAuthRedirect(),
      },
    });

    setLoading(false);

    if (linkError) {
      setError(linkError.message);
      return;
    }

    setMessage("Magic link sent. Check your email to continue.");
  }

  async function resendConfirmation() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter the email you used to sign up.");
      return;
    }

    setResending(true);
    setError(null);
    setMessage(null);

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: trimmedEmail,
      options: {
        emailRedirectTo: getPostAuthRedirect(),
      },
    });

    setResending(false);

    if (resendError) {
      setError(resendError.message);
      return;
    }

    setCanResendConfirmation(true);
    setMessage("Confirmation email resent. Check inbox, spam, and promotions.");
  }

  const isSignup = mode === "signup";

  return (
    <main className="flex min-h-screen items-center justify-center p-4 text-[#493343]">
      <section className="w-full max-w-sm rounded-lg border border-[#f3bfd0] bg-white/80 p-6 shadow-2xl shadow-[#e06f92]/15 backdrop-blur">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e06f92]">Welcome</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#3f2a39]">Our Date Planner</h1>
          <p className="mt-2 text-sm text-[#8b687e]">{isSignup ? "Create your account to start saving dates." : "Sign in to keep planning."}</p>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-lg border border-[#f3bfd0] bg-white/60 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setMessage(null);
            }}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${!isSignup ? "bg-[#ffe36e] text-[#4b3440]" : "text-[#9a7187] hover:bg-[#fff0f5]"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setMessage(null);
            }}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${isSignup ? "bg-[#ffe36e] text-[#4b3440]" : "text-[#9a7187] hover:bg-[#fff0f5]"}`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7187]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="mt-1 h-11 w-full rounded-lg border border-[#f3bfd0] bg-white/85 px-3 text-sm text-[#493343] outline-none transition placeholder:text-[#c9a7b8] focus:border-[#e06f92]"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7187]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={6}
              required
              className="mt-1 h-11 w-full rounded-lg border border-[#f3bfd0] bg-white/85 px-3 text-sm text-[#493343] outline-none transition placeholder:text-[#c9a7b8] focus:border-[#e06f92]"
              placeholder="At least 6 characters"
            />
          </label>

          {error && <p className="rounded-lg border border-[#f3bfd0] bg-[#fff0f5] px-3 py-2 text-sm text-[#c7466f]">{error}</p>}
          {message && <p className="rounded-lg border border-[#9ee7d0] bg-[#dffbf1] px-3 py-2 text-sm text-[#206b59]">{message}</p>}

          {canResendConfirmation && (
            <button
              type="button"
              onClick={resendConfirmation}
              disabled={resending}
              className="w-full rounded-lg border border-[#f3bfd0] bg-white/70 px-4 py-3 text-sm font-semibold text-[#8b687e] transition hover:bg-[#fff0f5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending ? "Resending..." : "Resend confirmation email"}
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded-lg bg-[#ff8fab] px-4 py-3 font-semibold text-white shadow-lg shadow-[#e06f92]/15 transition hover:bg-[#f7729b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Working..." : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={sendMagicLink}
          disabled={loading}
          className="mt-3 w-full rounded-lg border border-[#f3bfd0] bg-white/70 px-4 py-3 text-sm font-semibold text-[#8b687e] transition hover:bg-[#fff0f5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send magic link instead
        </button>
      </section>
    </main>
  );
}
