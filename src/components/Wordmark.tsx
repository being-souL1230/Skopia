import Link from "next/link";

export default function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5 text-[15px] font-extrabold tracking-[0.28em]">
      <img
        src="/skopia.webp?v=4"
        alt="Skopia logo"
        className="h-7 w-7 rounded-full object-cover shadow-sm transition-transform duration-200 group-hover:scale-110"
      />
      <span>SKOPIA</span>
    </Link>
  );
}
