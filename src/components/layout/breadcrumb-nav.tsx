"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

export function BreadcrumbNav() {
  const pathname = usePathname();

  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map((seg, idx, arr) => ({
      label: seg
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      href: "/" + arr.slice(0, idx + 1).join("/"),
      isLast: idx === arr.length - 1,
    }));

  if (pathname === "/") return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((segment) => (
        <React.Fragment key={segment.href}>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          {segment.isLast ? (
            <span className="font-medium text-foreground">{segment.label}</span>
          ) : (
            <Link
              href={segment.href}
              className="hover:text-foreground transition-colors"
            >
              {segment.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
