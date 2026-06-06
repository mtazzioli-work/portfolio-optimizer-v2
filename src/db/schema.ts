import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const accessStatusEnum = pgEnum("access_status", [
  "pending",
  "active",
  "denied",
  "paused",
]);

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  email: text("email").notNull(),
  accessStatus: accessStatusEnum("access_status").notNull().default("pending"),
  role: userRoleEnum("role").notNull().default("user"),
  monthlyReviewLimit: integer("monthly_review_limit"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const portfolios = pgTable("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.clerkUserId, { onDelete: "cascade" }),
  currentSnapshotId: uuid("current_snapshot_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  portfolioId: uuid("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  source: text("source").notNull(), // "csv" | "text" | "image"
  totalValueUsd: real("total_value_usd"),
  label: text("label"),
});

export const positions = pgTable("positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  snapshotId: uuid("snapshot_id")
    .notNull()
    .references(() => portfolioSnapshots.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  isin: text("isin"),
  currency: text("currency"),
  assetCategory: text("asset_category"),
  subCategory: text("sub_category"),
  issuerCountryCode: text("issuer_country_code"),
  position: real("position"),
  markPrice: real("mark_price"),
  positionValue: real("position_value"),
  costBasisPrice: real("cost_basis_price"),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  snapshotId: uuid("snapshot_id")
    .notNull()
    .references(() => portfolioSnapshots.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.clerkUserId, { onDelete: "cascade" }),
  claudeInvoked: boolean("claude_invoked").notNull().default(false),
  status: text("status").notNull().default("pending"), // pending | processing | done | error
  rulesSnapshot: jsonb("rules_snapshot"),
  result: jsonb("result"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const investmentProfiles = pgTable("investment_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.clerkUserId, { onDelete: "cascade" }),
  label: text("label").notNull().default("My Investment Strategy"),
  rulesJson: jsonb("rules_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const liquidAssets = pgTable("liquid_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.clerkUserId, { onDelete: "cascade" }),
  category: text("category").notNull(),
  label: text("label").notNull(),
  amountUsd: real("amount_usd").notNull(),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AccessStatus = User["accessStatus"];
export type UserRole = User["role"];
export type Portfolio = typeof portfolios.$inferSelect;
export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type InvestmentProfile = typeof investmentProfiles.$inferSelect;
export type LiquidAsset = typeof liquidAssets.$inferSelect;
