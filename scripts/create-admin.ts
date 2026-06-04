// Env vars worden geladen via `node --env-file=.env.local` (zie package.json scripts)
import { db, schema } from "../db/client";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function main() {
  const rl = createInterface({ input, output });
  const email = (await rl.question("Email: ")).trim().toLowerCase();
  const name = (await rl.question("Naam: ")).trim();
  const password = (await rl.question("Wachtwoord: ")).trim();
  rl.close();

  if (!email || !name || !password) {
    console.error("Alle velden zijn verplicht.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing.length > 0) {
    await db
      .update(schema.users)
      .set({ name, passwordHash: hash, isAdmin: true })
      .where(eq(schema.users.email, email));
    console.log(`Updated bestaande gebruiker ${email} naar admin.`);
  } else {
    await db.insert(schema.users).values({ email, name, passwordHash: hash, isAdmin: true });
    console.log(`Admin aangemaakt: ${email}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
