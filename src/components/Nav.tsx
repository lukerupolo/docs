"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Library" },
  { href: "/vocab", label: "Vocabulary" },
  { href: "/review", label: "Review" },
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
