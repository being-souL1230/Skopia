import Link from "next/link";

export default function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-[15px] font-extrabold tracking-[0.28em]">
      <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full border border-ink">
        <span className="tri text-brass" style={{ transform: "scale(.7)" }} />
      </span>
      SKOPIA
    </Link>
  );
}
