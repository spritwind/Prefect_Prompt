"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

interface Props {
  url: string;
  triggerLabel?: string;
}

export function QRShare({ url, triggerLabel = "📲 Send to phone" }: Props) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, {
      width: 320,
      margin: 1,
      color: { dark: "#ededed", light: "#0a0a0a" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [url, open]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="bg-fg/10 text-fg px-4 py-3 rounded-md font-mono text-sm hover:bg-fg/20"
        >
          {triggerLabel}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-bg border border-fg/20 rounded-xl p-6 w-[min(90vw,360px)] flex flex-col items-center gap-4">
          <Dialog.Title className="font-mono text-sm">手機掃 QR 開啟</Dialog.Title>
          {dataUrl ? (
            <img src={dataUrl} alt="QR code" className="rounded bg-bg" width={320} height={320} />
          ) : (
            <div className="size-[320px] flex items-center justify-center text-muted text-sm">
              產生中…
            </div>
          )}
          <button
            type="button"
            onClick={copyUrl}
            className="flex items-center gap-2 text-xs font-mono text-muted hover:text-fg"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "已複製連結" : "複製連結"}
          </button>
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close"
              className="absolute top-2 right-2 p-2 text-muted hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
