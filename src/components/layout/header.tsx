"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { name: string; href: string }[] = [];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const name = segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ name, href: currentPath });
  }

  return breadcrumbs;
}

export function Header() {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  return (
    <header className="flex h-14 items-center border-b px-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
        </Link>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium">{crumb.name}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.name}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </header>
  );
}
