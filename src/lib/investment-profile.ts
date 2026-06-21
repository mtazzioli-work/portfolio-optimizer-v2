import { eq } from "drizzle-orm";
import { db } from "@/db";
import { investmentProfiles } from "@/db/schema";
import {
  DEFAULT_INVESTMENT_PROFILE,
  type InvestmentRules,
} from "@/lib/default-investment-profile";
import {
  getProfileEditorText,
  hasSavedProfileEditorText,
  toInvestmentRules,
} from "@/lib/investment-profile-text";

export async function getStoredInvestmentProfile(userId: string): Promise<{
  rules: InvestmentRules;
  profileEditorText: string;
  hasSavedText: boolean;
}> {
  const [profile] = await db
    .select()
    .from(investmentProfiles)
    .where(eq(investmentProfiles.userId, userId))
    .limit(1);

  if (!profile) {
    return {
      rules: DEFAULT_INVESTMENT_PROFILE,
      profileEditorText: "",
      hasSavedText: false,
    };
  }

  const rules = toInvestmentRules(profile.rulesJson);
  const hasSavedText = hasSavedProfileEditorText(profile.rulesJson);

  return {
    rules,
    profileEditorText: hasSavedText
      ? getProfileEditorText(profile.rulesJson, rules)
      : "",
    hasSavedText,
  };
}

export async function userHasSavedInvestmentProfile(
  userId: string,
): Promise<boolean> {
  const [profile] = await db
    .select({ rulesJson: investmentProfiles.rulesJson })
    .from(investmentProfiles)
    .where(eq(investmentProfiles.userId, userId))
    .limit(1);

  if (!profile) return false;
  return hasSavedProfileEditorText(profile.rulesJson);
}
