"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Library" },
  { href: "/discover", label: "Discover" },
  { href: "/debate", label: "Debate" },
  { href: "/practice", label: "Practice" },
  { href: "/vocab", label: "Vocabulary" },
  { href: "/import", label: "Import" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      <Link href="/" className="brand">
        Ling<span>o</span>
      </Link>
      <span className="spacer" />
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={path === l.href ? "active" : ""}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
