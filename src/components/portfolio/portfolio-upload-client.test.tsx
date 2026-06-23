import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PortfolioUploadClient } from "@/components/portfolio/portfolio-upload-client";

const { mockRefresh, mockPush, mockToast } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockPush: vi.fn(),
  mockToast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
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
vi.mock("sonner", () => ({ toast: mockToast }));

describe("PortfolioUploadClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps upload disabled without a file and validates non-CSV files", () => {
    render(
      <PortfolioUploadClient
        uploadSnapshotCsv={vi.fn()}
        uploadSnapshotText={vi.fn()}
        requestReview={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Subir snapshot" })).toBeDisabled();

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, {
      target: {
        files: [new File(["not csv"], "portfolio.txt", { type: "text/plain" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Subir snapshot" }));

    expect(mockToast.error).toHaveBeenCalledWith("Seleccioná un archivo CSV válido");
  });

  it("uploads CSV files and enables review requests", async () => {
    const uploadSnapshotCsv = vi
      .fn()
      .mockResolvedValue({ count: 2, snapshotId: "snapshot_123" });
    const requestReview = vi.fn().mockResolvedValue({ reviewId: "review_123" });

    render(
      <PortfolioUploadClient
        uploadSnapshotCsv={uploadSnapshotCsv}
        uploadSnapshotText={vi.fn()}
        requestReview={requestReview}
        hasUnsavedLiquidAssets
      />,
    );

    fireEvent.change(document.querySelector<HTMLInputElement>('input[type="file"]')!, {
      target: {
        files: [new File(["Symbol,Quantity"], "portfolio.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Subir snapshot" }));

    await waitFor(() => expect(uploadSnapshotCsv).toHaveBeenCalledOnce());
    expect(mockToast.success).toHaveBeenCalledWith("Snapshot creado con 2 posiciones");
    expect(mockRefresh).toHaveBeenCalledOnce();
    expect(
      screen.getByText("Snapshot creado con 2 posiciones"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tenés cambios sin guardar en activos líquidos/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Solicitar review" }));

    expect(requestReview).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      "Guardá tus activos líquidos antes de solicitar la review",
    );
  });

  it("uploads pasted CSV text and routes to completed reviews", async () => {
    const uploadSnapshotText = vi
      .fn()
      .mockResolvedValue({ count: 1, snapshotId: "snapshot_paste" });
    const requestReview = vi.fn().mockResolvedValue({ reviewId: "review_done" });

    render(
      <PortfolioUploadClient
        uploadSnapshotCsv={vi.fn()}
        uploadSnapshotText={uploadSnapshotText}
        requestReview={requestReview}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pegar CSV" }));
    fireEvent.change(screen.getByPlaceholderText("Pegá acá el contenido del CSV…"), {
      target: { value: "Symbol,Quantity\nAAPL,1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Subir snapshot" }));

    await waitFor(() => expect(uploadSnapshotText).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "Solicitar review" }));

    await waitFor(() => expect(requestReview).toHaveBeenCalledWith("snapshot_paste"));
    expect(mockToast.info).toHaveBeenCalledWith(
      "Ejecutando review… puede tardar 30–60 segundos",
    );
    expect(mockToast.success).toHaveBeenCalledWith("Review completada");
    expect(mockPush).toHaveBeenCalledWith("/reviews/review_done");
  });
});
