// Env vars via `node --env-file=.env.local`
import { db, schema } from "../db/client";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  const email = "dylan@brandeniers.nl";
  const password = process.argv[2] ?? "test123!";

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user) {
    console.log("User niet gevonden");
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log(`Email: ${user.email}`);
  console.log(`Wachtwoord getest: "${password}"`);
  console.log(`Lengte wachtwoord: ${password.length}`);
  console.log(`Match: ${ok ? "✓ JA" : "✗ NEE"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
