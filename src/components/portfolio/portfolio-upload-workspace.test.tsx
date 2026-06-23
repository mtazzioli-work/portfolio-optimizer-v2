import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortfolioUploadWorkspace } from "@/components/portfolio/portfolio-upload-workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

describe("PortfolioUploadWorkspace", () => {
  it("renders liquid assets and snapshot sections with shared dirty state", async () => {
    const uploadSnapshotCsv = vi
      .fn()
      .mockResolvedValue({ count: 1, snapshotId: "snapshot_1" });

    render(
      <PortfolioUploadWorkspace
        editorKey="default"
        editorText="ARS: 100000"
        canEditLiquid
        uploadSnapshotCsv={uploadSnapshotCsv}
        uploadSnapshotText={vi.fn()}
        saveLiquidAssets={vi.fn()}
        requestReview={vi.fn()}
        hasInvestmentProfile={false}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "1. Activos líquidos" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "2. Snapshot del portfolio" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "ARS: 120000" },
    });
    fireEvent.change(document.querySelector<HTMLInputElement>('input[type="file"]')!, {
      target: {
        files: [new File(["Symbol,Quantity"], "portfolio.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Subir snapshot" }));

    await waitFor(() => expect(uploadSnapshotCsv).toHaveBeenCalledOnce());
    expect(
      screen.getByText(/Guardalos antes de solicitar la review/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Completá y guardá tu perfil de inversión/),
    ).toBeInTheDocument();
  });
});
