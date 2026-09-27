import { redirect } from "next/navigation";
import Wordmark from "@/components/Wordmark";
import SideNav from "@/components/SideNav";
import { getUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <div className="mx-auto flex min-h-screen max-w-[1200px] flex-col px-6 md:flex-row md:gap-12">
      <aside className="shrink-0 border-b border-rule py-5 md:sticky md:top-0 md:h-screen md:w-48 md:border-b-0 md:border-r md:py-8 md:pr-6">
        <div className="flex items-center justify-between md:block">
          <Wordmark href="/app" />
          <form action={logoutAction} className="md:hidden"><button className="text-xs text-mute hover:text-ink">Sign out</button></form>
        </div>
        <div className="mt-5 md:mt-10"><SideNav /></div>
        <div className="mt-10 hidden border-t border-rule pt-5 md:block">
          <div className="flex items-center gap-2.5">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-8 w-8 rounded-full border border-rule object-cover" />
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-brass text-xs font-bold">{user.name[0]}</span>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate font-mono text-[11px] text-mute" title={user.githubUsername ? `@${user.githubUsername}` : user.email}>
                {user.githubUsername ? `@${user.githubUsername}` : user.email}
              </div>
            </div>
          </div>
          <form action={logoutAction}><button className="mt-4 text-xs text-mute hover:text-ink">Sign out ↗</button></form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 py-8">{children}</main>
    </div>
  );
}
