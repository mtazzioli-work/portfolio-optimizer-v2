import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiquidAssetsEditor } from "@/components/portfolio/liquid-assets-editor";

const { mockUseFormStatus } = vi.hoisted(() => ({
  mockUseFormStatus: vi.fn(),
}));

vi.mock("react-dom", async (importActual) => {
  const actual = await importActual<typeof import("react-dom")>();
  return {
    ...actual,
    useFormStatus: mockUseFormStatus,
  };
});

describe("LiquidAssetsEditor", () => {
  beforeEach(() => {
    mockUseFormStatus.mockReturnValue({ pending: false });
  });

  it("syncs hidden text, reports dirty state, and discards edits", () => {
    const onDirtyChange = vi.fn();
    const { container } = render(
      <LiquidAssetsEditor
        initialText="ARS: 100000"
        canEdit
        saveLiquidAssets={vi.fn()}
        onDirtyChange={onDirtyChange}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "USD: 1000" },
    });

    expect(
      container.querySelector<HTMLInputElement>('input[name="liquidAssetsText"]')
        ?.value,
    ).toBe("USD: 1000");
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));

    expect(screen.getByRole("textbox")).toHaveValue("ARS: 100000");
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it("renders read-only and pending states", () => {
    const { rerender } = render(
      <LiquidAssetsEditor
        initialText="ARS: 100000"
        canEdit={false}
        saveLiquidAssets={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveAttribute("readonly");
    expect(screen.getByText("Solo lectura")).toBeInTheDocument();

    mockUseFormStatus.mockReturnValue({ pending: true });
    rerender(
      <LiquidAssetsEditor
        initialText="ARS: 100000"
        canEdit
        saveLiquidAssets={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });
});
