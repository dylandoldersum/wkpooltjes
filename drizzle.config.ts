import type { Config } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocal = url.startsWith("file:");

export default (
  isLocal
    ? {
        schema: "./db/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: { url },
      }
    : {
        schema: "./db/schema.ts",
        out: "./drizzle",
        dialect: "turso",
        dbCredentials: { url, authToken },
      }
) satisfies Config;
