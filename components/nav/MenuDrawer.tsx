"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Bookmark, Home, LogOut, type LucideIcon, Plus, Settings, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  username?: string;
}

interface NavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
}

const items: NavItem[] = [
  { href: "/" as Route, label: "Library", icon: Home },
  { href: "/upload" as Route, label: "New Prompt", icon: Plus },
  { href: "/presets" as Route, label: "My Presets", icon: Bookmark },
  { href: "/settings" as Route, label: "Settings", icon: Settings },
];

export function MenuDrawer({ open, onOpenChange, username }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 bg-bg border-l border-fg/10 w-72 flex flex-col"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div className="flex items-center justify-between p-4 border-b border-fg/10">
            <Dialog.Title className="flex flex-col">
              <span className="font-mono text-sm">Menu</span>
              {username && <span className="font-mono text-[11px] text-muted">@{username}</span>}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close menu"
                className="size-8 rounded flex items-center justify-center hover:bg-fg/10"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          <nav className="flex flex-col p-2 gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-fg/5 text-sm"
              >
                <item.icon className="size-4 text-muted" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto p-2 border-t border-fg/10">
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-red-500/10 text-sm text-red-400"
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
