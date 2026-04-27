"use client";

import * as RT from "@radix-ui/react-toast";
import { type ReactNode, createContext, useContext, useState } from "react";

interface ToastItem {
  id: number;
  message: string;
}
interface Ctx {
  show: (msg: string) => void;
}
const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = (message: string) => {
    const id = Date.now();
    setItems((prev) => [...prev, { id, message }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 1500);
  };
  return (
    <ToastContext.Provider value={{ show }}>
      <RT.Provider swipeDirection="down">
        {children}
        {items.map((i) => (
          <RT.Root
            key={i.id}
            open
            className="bg-accent text-bg font-mono text-sm px-4 py-2 rounded-md"
          >
            <RT.Description>{i.message}</RT.Description>
          </RT.Root>
        ))}
        <RT.Viewport className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 outline-none" />
      </RT.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
