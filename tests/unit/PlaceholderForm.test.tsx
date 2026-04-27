import { PlaceholderForm } from "@/components/prompt/PlaceholderForm";
import type { PlaceholderSchema } from "@/lib/placeholders/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const schema: Record<string, PlaceholderSchema> = {
  PHASE_N: { type: "number", label: "Phase", default: 9 },
  LANE_NAME: { type: "select", label: "Lane", options: ["A", "B"], default: "A" },
  ENABLE: { type: "boolean", label: "Enable", default: false },
};

describe("PlaceholderForm", () => {
  it("renders all defined placeholder fields", () => {
    render(<PlaceholderForm schema={schema} values={{}} onChange={() => {}} />);
    expect(screen.getByText("Phase")).toBeInTheDocument();
    expect(screen.getByText("Lane")).toBeInTheDocument();
    expect(screen.getByText("Enable")).toBeInTheDocument();
  });

  it("calls onChange when number input changes", () => {
    let captured: Record<string, unknown> = {};
    render(
      <PlaceholderForm
        schema={schema}
        values={{ PHASE_N: 9 }}
        onChange={(v) => {
          captured = v;
        }}
      />,
    );
    const input = screen.getByLabelText(/Phase/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "10" } });
    expect(captured.PHASE_N).toBe(10);
  });

  it("calls onChange when select changes", () => {
    let captured: Record<string, unknown> = {};
    render(
      <PlaceholderForm
        schema={schema}
        values={{ LANE_NAME: "A" }}
        onChange={(v) => {
          captured = v;
        }}
      />,
    );
    const select = screen.getByLabelText(/Lane/) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "B" } });
    expect(captured.LANE_NAME).toBe("B");
  });
});
