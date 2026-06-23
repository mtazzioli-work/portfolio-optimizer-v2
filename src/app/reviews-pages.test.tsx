import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReviewsPage from "@/app/(app)/reviews/page";
import ReviewDetailPage from "@/app/(app)/reviews/[id]/page";

const {
  mockGetCurrentSnapshotReviewState,
  mockGetCurrentUser,
  mockGetQuotaUsage,
  mockGetReviewDetailContext,
  mockHasInvestmentProfile,
  mockListReviewsForUser,
  mockNotFound,
} = vi.hoisted(() => ({
  mockGetCurrentSnapshotReviewState: vi.fn(),
  mockGetCurrentUser: vi.fn(),
  mockGetQuotaUsage: vi.fn(),
  mockGetReviewDetailContext: vi.fn(),
  mockHasInvestmentProfile: vi.fn(),
  mockListReviewsForUser: vi.fn(),
  mockNotFound: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ notFound: mockNotFound }));
vi.mock("@/components/reviews/request-review-button", () => ({
  RequestReviewButton: ({
    label = "Solicitar review",
    snapshotId,
  }: {
    label?: string;
    snapshotId: string;
  }) => <button data-snapshot-id={snapshotId}>{label}</button>,
}));
vi.mock("@/components/reviews/reviews-list-seen-marker", () => ({
  ReviewsListSeenMarker: () => <div data-testid="seen-marker" />,
}));
vi.mock("@/components/reviews/review-view", () => ({
  ReviewView: ({ presentationVersion }: { presentationVersion: number }) => (
    <div data-presentation-version={presentationVersion} data-testid="review-view" />
  ),
}));
vi.mock("@/lib/users", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/reviews", () => ({
  getCurrentSnapshotReviewState: mockGetCurrentSnapshotReviewState,
  getReviewDetailContext: mockGetReviewDetailContext,
  listReviewsForUser: mockListReviewsForUser,
}));
vi.mock("@/lib/quota", () => ({ getQuotaUsage: mockGetQuotaUsage }));
vi.mock("@/lib/investment-profile", () => ({
  userHasSavedInvestmentProfile: mockHasInvestmentProfile,
}));
vi.mock("@/app/(app)/reviews/actions", () => ({
  requestReviewAction: vi.fn(),
}));

const user = {
  id: "user_1",
  email: "user@example.com",
  accessStatus: "active",
  role: "user",
};

describe("reviews pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotFound.mockImplementation(() => {
      throw new Error("not-found");
    });
    mockGetCurrentUser.mockResolvedValue(user);
    mockListReviewsForUser.mockResolvedValue([]);
    mockGetCurrentSnapshotReviewState.mockResolvedValue(null);
    mockGetQuotaUsage.mockResolvedValue({
      used: 1,
      limit: 3,
      remaining: 2,
      totalTokens: 1200,
      totalCostUsd: 0.42,
    });
    mockHasInvestmentProfile.mockResolvedValue(true);
  });

  it("renders null for anonymous reviews visitors", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(ReviewsPage()).resolves.toBeNull();
  });

  it("renders quota, current snapshot action, and review history", async () => {
    mockGetCurrentSnapshotReviewState.mockResolvedValue({
      currentSnapshotId: "snapshot_1",
      doneReview: null,
      failedReview: null,
    });
    mockListReviewsForUser.mockResolvedValue([
      {
        id: "review_1",
        status: "done",
        createdAt: new Date("2026-01-15T12:00:00.000Z"),
        totalValueUsd: 50_000,
        totalTokens: 1500,
        estimatedCostUsd: 0.5,
      },
    ]);

    render(await ReviewsPage());

    expect(screen.getByTestId("seen-marker")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Revisiones" })).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 3 reviews usadas/)).toBeInTheDocument();
    expect(screen.getByText("Snapshot actual sin review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Solicitar review" })).toHaveAttribute(
      "data-snapshot-id",
      "snapshot_1",
    );
    expect(screen.getByRole("link", { name: /Completada/ })).toHaveAttribute(
      "href",
      "/reviews/review_1",
    );
  });

  it("renders done snapshot and exhausted quota states", async () => {
    mockGetCurrentSnapshotReviewState.mockResolvedValueOnce({
      currentSnapshotId: "snapshot_1",
      doneReview: { id: "review_done", createdAt: new Date("2026-01-16T00:00:00.000Z") },
      failedReview: null,
    });

    const { rerender } = render(await ReviewsPage());
    expect(screen.getByText("Snapshot actual ya revisado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver review" })).toHaveAttribute(
      "href",
      "/reviews/review_done",
    );

    mockGetQuotaUsage.mockResolvedValue({
      used: 3,
      limit: 3,
      remaining: 0,
      totalTokens: 0,
      totalCostUsd: 0,
    });
    mockGetCurrentSnapshotReviewState.mockResolvedValueOnce({
      currentSnapshotId: "snapshot_2",
      doneReview: null,
      failedReview: null,
    });
    rerender(await ReviewsPage());
    expect(screen.getByText("Cuota mensual agotada.")).toBeInTheDocument();
  });

  it("renders review detail status branches", async () => {
    mockGetReviewDetailContext.mockResolvedValueOnce(null);
    await expect(
      ReviewDetailPage({ params: Promise.resolve({ id: "missing" }) }),
    ).rejects.toThrow("not-found");

    mockGetReviewDetailContext.mockResolvedValueOnce({
      review: {
        id: "review_error",
        snapshotId: "snapshot_1",
        status: "error",
        errorMessage: "Falló Claude",
        createdAt: new Date("2026-01-15T12:00:00.000Z"),
        result: null,
        presentationVersion: 1,
        rulesSnapshot: null,
      },
      snapshotCapturedAt: null,
      snapshotTotalValueUsd: null,
      positions: [],
    });
    const { rerender } = render(
      await ReviewDetailPage({ params: Promise.resolve({ id: "review_error" }) }),
    );
    expect(screen.getByText("La review falló")).toBeInTheDocument();
    expect(screen.getByText("Falló Claude")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar review" })).toHaveAttribute(
      "data-snapshot-id",
      "snapshot_1",
    );

    mockGetReviewDetailContext.mockResolvedValueOnce({
      review: {
        id: "review_processing",
        snapshotId: "snapshot_2",
        status: "processing",
        createdAt: new Date("2026-01-15T12:00:00.000Z"),
        result: null,
        presentationVersion: 1,
        rulesSnapshot: null,
      },
      snapshotCapturedAt: null,
      snapshotTotalValueUsd: null,
      positions: [],
    });
    rerender(
      await ReviewDetailPage({ params: Promise.resolve({ id: "review_processing" }) }),
    );
    expect(screen.getByText(/La review está en progreso/)).toBeInTheDocument();

    mockGetReviewDetailContext.mockResolvedValueOnce({
      review: {
        id: "review_done",
        snapshotId: "snapshot_3",
        status: "done",
        createdAt: new Date("2026-01-15T12:00:00.000Z"),
        totalTokens: 2000,
        inputTokens: 1000,
        outputTokens: 1000,
        estimatedCostUsd: 0.75,
        result: { overallAssessment: "ok" },
        presentationVersion: 2,
        rulesSnapshot: { liquidSummary: { liquidForInvesting: 1000 } },
      },
      snapshotCapturedAt: new Date("2026-01-14T00:00:00.000Z"),
      snapshotTotalValueUsd: 40_000,
      positions: [],
    });
    rerender(await ReviewDetailPage({ params: Promise.resolve({ id: "review_done" }) }));
    expect(screen.getByText(/Costo del análisis/)).toBeInTheDocument();
    expect(screen.getByTestId("review-view")).toHaveAttribute(
      "data-presentation-version",
      "2",
    );
  });
});
