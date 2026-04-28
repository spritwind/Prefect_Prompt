import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <CommandPalette />
      {children}
    </ToastProvider>
  );
}
