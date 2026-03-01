"use client";

import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/counseling", label: "Counseling", icon: "💬" },
  { href: "/battle", label: "Battle", icon: "⚔️" },
  { href: "/game", label: "전장", icon: "🗺️" },
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/settings", label: "Settings", icon: "🔑" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.role === "admin") setIsAdmin(true);
        });
    });
  }, []);

  const navItems = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", label: "Admin", icon: "⚙️" }]
    : NAV_ITEMS;

  // Don't show nav on auth pages or landing
  if (pathname.startsWith("/auth") || pathname === "/") return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2">
        {/* Logo */}
        <a href="/dashboard" className="text-lg font-bold text-text">
          Agent<span className="text-primary">opia</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <a
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-text-muted hover:bg-surface-hover hover:text-text"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover sm:hidden"
          aria-label="Menu"
          aria-expanded={open}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            {open ? (
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <>
                <path d="M3 5H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="border-t border-border bg-bg px-4 py-2 sm:hidden">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-text-muted hover:bg-surface-hover hover:text-text"
                }`}
              >
                {item.icon} {item.label}
              </a>
            );
          })}
        </div>
      )}
    </nav>
  );
}
