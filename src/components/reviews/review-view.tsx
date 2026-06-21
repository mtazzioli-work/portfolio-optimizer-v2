import { REVIEW_PRESENTATION_VERSION } from "@/db/schema";
import { type AnalysisResult } from "@/lib/claude-analysis";
import type { LiquidSummary } from "@/lib/analysis-prompt";
import type { Position } from "@/db/schema";
import {
  ReviewViewLegacy,
  type LegacyAnalysisResult,
} from "@/components/reviews/review-view-legacy";
import { ReviewViewV2 } from "@/components/reviews/review-view-v2";

type Props = {
  result: AnalysisResult | LegacyAnalysisResult;
  presentationVersion: number;
  liquidSummary?: LiquidSummary;
  snapshotCapturedAt?: Date | null;
  snapshotTotalValueUsd?: number | null;
  positions?: Position[];
  reviewCreatedAt?: Date;
};

export function ReviewView({
  result,
  presentationVersion,
  liquidSummary,
  snapshotCapturedAt = null,
  snapshotTotalValueUsd = null,
  positions = [],
  reviewCreatedAt = new Date(),
}: Props) {
  if (presentationVersion >= REVIEW_PRESENTATION_VERSION && liquidSummary) {
    return (
      <ReviewViewV2
        result={result as AnalysisResult}
        liquidSummary={liquidSummary}
        snapshotCapturedAt={snapshotCapturedAt}
        snapshotTotalValueUsd={snapshotTotalValueUsd}
        positions={positions}
        reviewCreatedAt={reviewCreatedAt}
      />
    );
  }

  return <ReviewViewLegacy result={result as LegacyAnalysisResult} />;
}
