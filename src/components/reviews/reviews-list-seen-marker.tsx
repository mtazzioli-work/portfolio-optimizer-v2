"use client";

import { useEffect, useRef } from "react";
import { markReviewsListSeenAction } from "@/app/(app)/reviews/actions";

export function ReviewsListSeenMarker() {
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    void markReviewsListSeenAction();
  }, []);

  return null;
}
