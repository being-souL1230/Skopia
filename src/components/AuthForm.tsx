"use client";
import { useActionState } from "react";
import Link from "next/link";
import { loginAction, registerAction, type AuthState } from "@/app/actions";

export default function AuthForm({ mode, oauthError }: { mode: "login" | "register"; oauthError?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? loginAction : registerAction, undefined);
  const displayError = state?.error || oauthError;

  return (
    <div className="space-y-6">
      <a
        href="/api/auth/github"
        className="group flex w-full items-center justify-center gap-3 rounded-full border border-ink py-3 text-sm font-semibold transition-colors hover:bg-ink hover:text-canvas"
      >
        <svg className="h-4 w-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
        <span>Continue with GitHub</span>
      </a>

      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-faint">
        <span className="h-px flex-1 bg-rule" />
        <span>or with email</span>
        <span className="h-px flex-1 bg-rule" />
      </div>

      <form action={action} className="space-y-6">
        {mode === "register" && (
          <label className="block"><span className="text-xs uppercase tracking-[0.16em] text-mute">Name</span><input name="name" className="field" required /></label>
        )}
        <label className="block"><span className="text-xs uppercase tracking-[0.16em] text-mute">Email</span>
          <input name="email" type="email" className="field" required defaultValue={mode === "login" ? "demo@skopia.dev" : ""} /></label>
        <label className="block"><span className="text-xs uppercase tracking-[0.16em] text-mute">Password</span>
          <input name="password" type="password" className="field" required defaultValue={mode === "login" ? "demo1234" : ""} /></label>
        {displayError && <p className="flex items-center gap-2 text-sm"><span className="tri text-ochre" />{displayError}</p>}
        <div className="flex items-center justify-between pt-2">
          <button disabled={pending} className="link-act text-lg disabled:opacity-50">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink">{pending ? <span className="h-3 w-3 rounded-full border border-ink border-t-transparent orbit" /> : <span className="tri-r" />}</span>
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
          <Link href={mode === "login" ? "/register" : "/login"} className="text-sm text-mute hover:text-ink">
            {mode === "login" ? "New here? Register" : "Have an account? Sign in"}
          </Link>
        </div>
        {mode === "login" && <p className="border-t border-rule pt-4 text-xs text-mute">Demo account prefilled — <span className="font-mono">demo@skopia.dev / demo1234</span></p>}
      </form>
    </div>
  );
}
