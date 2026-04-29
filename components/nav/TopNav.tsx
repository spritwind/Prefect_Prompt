"use client";

import { Menu, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { MenuDrawer } from "./MenuDrawer";

interface Props {
  username?: string;
}

export function TopNav({ username }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  function openSearch() {
    window.dispatchEvent(new Event("open-command-palette"));
  }

  return (
    <>
      <header
        className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-fg/10"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={"/" as Route}
            className="font-mono text-sm tracking-tight flex items-center gap-1.5"
          >
            <span className="text-accent">⌘</span>
            <span>Prompt Hub</span>
          </Link>
          <div className="flex items-center gap-2">
            {username && (
              <span className="hidden sm:inline font-mono text-xs text-muted">@{username}</span>
            )}
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search"
              className="size-9 rounded-md flex items-center justify-center hover:bg-fg/10 transition"
            >
              <Search className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="size-9 rounded-md flex items-center justify-center hover:bg-fg/10 transition"
            >
              <Menu className="size-4" />
            </button>
          </div>
        </div>
      </header>
      <MenuDrawer open={menuOpen} onOpenChange={setMenuOpen} username={username} />
    </>
  );
}
