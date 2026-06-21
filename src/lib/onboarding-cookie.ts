import { cookies } from "next/headers";

export const REVIEWS_LIST_SEEN_COOKIE = "po_reviews_list_seen";

export async function hasReviewsListSeen(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(REVIEWS_LIST_SEEN_COOKIE)?.value === "1";
}

export async function markReviewsListSeen(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(REVIEWS_LIST_SEEN_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
