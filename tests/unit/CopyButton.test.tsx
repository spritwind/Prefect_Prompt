import { CopyButton } from "@/components/prompt/CopyButton";
import { ToastProvider } from "@/components/ui/Toast";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("CopyButton", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      vibrate: vi.fn(),
    });
  });

  it("copies the text on click and shows toast", async () => {
    render(
      <ToastProvider>
        <CopyButton text="hello world" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello world"));
    expect(navigator.vibrate).toHaveBeenCalledWith(10);
  });

  it("shows char count in label", () => {
    render(
      <ToastProvider>
        <CopyButton text="abcde" />
      </ToastProvider>,
    );
    expect(screen.getByRole("button", { name: /5\s*字/ })).toBeInTheDocument();
  });
});
