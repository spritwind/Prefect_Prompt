import { ToastProvider } from "@/components/ui/Toast";
import { CommandPalette } from "@/components/command-palette/CommandPalette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <CommandPalette />
      {children}
    </ToastProvider>
  );
}
