"use client";

import { search } from "@/lib/search/client";
import type { SearchDoc } from "@/lib/search/types";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePullToOpen } from "./usePullToOpen";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchDoc[]>([]);

  usePullToOpen(() => setOpen(true));

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("open-command-palette", onOpen);
    return () => window.removeEventListener("open-command-palette", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    search(q)
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [q, open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed inset-x-0 top-0 z-50 bg-bg border-b border-fg/10 max-h-[80vh] flex flex-col"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <Dialog.Title className="sr-only">Search prompts</Dialog.Title>
          <div className="flex items-center gap-2 p-3 border-b border-fg/10">
            <Search className="size-4 text-muted" />
            <input
              // biome-ignore lint/a11y/noAutofocus: command palette is opened intentionally and focus must land in the search input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜尋 prompt / preset..."
              className="flex-1 bg-transparent font-mono text-sm focus:outline-none"
            />
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="text-muted">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          <ul className="overflow-y-auto">
            {results.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/prompts/${r.slug}` as Route}
                  onClick={() => setOpen(false)}
                  className="flex flex-col px-4 py-3 hover:bg-fg/5 font-mono text-sm"
                >
                  <span>{r.title}</span>
                  <span className="text-xs text-muted">{r.category}</span>
                </Link>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-4 py-6 text-center text-muted text-sm font-mono">無結果</li>
            )}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
