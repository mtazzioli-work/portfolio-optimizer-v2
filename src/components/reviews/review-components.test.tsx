import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BulletText, toBulletItems } from "@/components/reviews/bullet-text";
import { RequestReviewButton } from "@/components/reviews/request-review-button";
import { ReviewsListSeenMarker } from "@/components/reviews/reviews-list-seen-marker";
import { INVESTMENT_PROFILE_REQUIRED_ERROR } from "@/lib/investment-profile-messages";

const { mockMarkSeen, mockPush, mockRefresh, mockToast } = vi.hoisted(() => ({
  mockMarkSeen: vi.fn(),
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
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
vi.mock("@/app/(app)/reviews/actions", () => ({
  markReviewsListSeenAction: mockMarkSeen,
}));

describe("review utility components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses strings into bullet items and renders single or list content", () => {
    expect(toBulletItems("- Reducir riesgo\n2. Comprar ETF")).toEqual([
      "Reducir riesgo",
      "Comprar ETF",
    ]);
    expect(toBulletItems(["", "Mantener liquidez"])).toEqual([
      "Mantener liquidez",
    ]);

    const { rerender } = render(<BulletText value="Texto único" />);
    expect(screen.getByText("Texto único").tagName).toBe("P");

    rerender(<BulletText value={"- Uno\n- Dos"} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("blocks review requests without a saved investment profile", () => {
    const requestReview = vi.fn();

    render(
      <RequestReviewButton
        snapshotId="snapshot_123"
        requestReview={requestReview}
        hasInvestmentProfile={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Solicitar review" })).toBeDisabled();
    expect(screen.getByText(INVESTMENT_PROFILE_REQUIRED_ERROR)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a perfil de inversión" })).toHaveAttribute(
      "href",
      "/settings/investment-profile",
    );
  });

  it("routes to new or existing reviews after request results", async () => {
    const requestReview = vi
      .fn()
      .mockResolvedValueOnce({ existingReviewId: "existing_1", error: "Ya existe" })
      .mockResolvedValueOnce({ reviewId: "review_1" });

    const { rerender } = render(
      <RequestReviewButton
        snapshotId="snapshot_123"
        requestReview={requestReview}
        label="Reintentar review"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reintentar review" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/reviews/existing_1"));
    expect(mockToast.error).toHaveBeenCalledWith("Ya existe");

    rerender(
      <RequestReviewButton
        snapshotId="snapshot_123"
        requestReview={requestReview}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Solicitar review" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/reviews/review_1"));
    expect(mockRefresh).toHaveBeenCalledOnce();
    expect(mockToast.success).toHaveBeenCalledWith("Review completada");
  });

  it("marks the reviews list as seen once", () => {
    const { rerender } = render(<ReviewsListSeenMarker />);

    rerender(<ReviewsListSeenMarker />);

    expect(mockMarkSeen).toHaveBeenCalledOnce();
  });
});
