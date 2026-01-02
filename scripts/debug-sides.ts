import * as dotenv from "dotenv";
import "dotenv/config";
dotenv.config({ path: "recipe-manager/.env" });

import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { recipes } from "../src/db/schema";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL missing");
  process.exit(1);
}

const client = createClient({ url, authToken });
const db = drizzle(client);

async function main() {
  console.log("Querying side dishes from Turso...");

  const sides = await db
    .select({
      id: recipes.id,
      nameIt: recipes.nameIt,
      category: recipes.category,
      isPublished: recipes.isPublished,
    })
    .from(recipes)
    .where(eq(recipes.category, "side_dish"));

  console.log(`Found ${sides.length} side dishes:`);
  sides.forEach((s) => {
    console.log(`  - ${s.nameIt} (published: ${s.isPublished})`);
  });
}

main().catch(console.error);
