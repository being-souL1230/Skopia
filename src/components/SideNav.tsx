"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app", label: "Overview" },
  { href: "/app/analyze", label: "Analyze" },
  { href: "/app/projects", label: "Projects" },
  { href: "/docs", label: "Rules & scoring" },
];

export default function SideNav() {
  const p = usePathname();
  return (
    <nav className="flex gap-5 overflow-x-auto md:flex-col md:gap-1">
      {items.map((i) => {
        const active = i.href === "/app" ? p === "/app" : p.startsWith(i.href) || (i.href === "/app/projects" && p.startsWith("/app/scans"));
        return (
          <Link key={i.href} href={i.href} className={`group flex items-center gap-3 whitespace-nowrap py-1.5 text-sm transition-colors ${active ? "font-bold text-ink" : "text-mute hover:text-ink"}`}>
            <span className={`tri-r transition-opacity ${active ? "text-brass opacity-100" : "opacity-0 group-hover:opacity-40"}`} />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
