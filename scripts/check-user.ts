// Env vars via `node --env-file=.env.local`
import { db, schema } from "../db/client";
import { eq, sql } from "drizzle-orm";

async function main() {
  const email = process.argv[2] ?? "dylan@brandeniers.nl";

  // 1. Hoeveel users staan er totaal in de DB?
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users);
  console.log(`Totaal aantal users in DB: ${count}`);

  // 2. Lijst ze allemaal (alleen email + naam, geen wachtwoord-hash)
  const all = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      isAdmin: schema.users.isAdmin,
    })
    .from(schema.users);
  console.log("Alle users:", JSON.stringify(all, null, 2));

  // 3. Specifiek zoeken naar de email
  const r = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      isAdmin: schema.users.isAdmin,
      hashPrefix: sql<string>`substr(${schema.users.passwordHash}, 1, 10)`,
    })
    .from(schema.users)
    .where(eq(schema.users.email, email));
  console.log(`\nZoeken naar "${email}":`, JSON.stringify(r, null, 2));

  // 4. Welke DB praat 'tie tegen?
  console.log(
    `\nDB URL: ${process.env.TURSO_DATABASE_URL?.slice(0, 50)}...`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
