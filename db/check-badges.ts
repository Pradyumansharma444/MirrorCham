import { getDb } from "../api/queries/connection";
import { badges } from "./schema";

async function check() {
  const db = getDb();
  const result = await db.select().from(badges);
  console.log(`Found ${result.length} badges`);
  if (result.length > 0) {
    console.log("First 3:", result.slice(0, 3).map(b => b.badgeId));
  }
  process.exit(0);
}

check().catch((err) => {
  console.error(err);
  process.exit(1);
});
