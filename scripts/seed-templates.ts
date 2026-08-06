import { connectDb } from "@/lib/db";
import {
  ensureDefaultHomePage,
  ensureSystemTemplates,
  migrateLegacyPageTemplates,
} from "@/lib/blocks/templates";

async function main() {
  await connectDb();
  const created = await ensureSystemTemplates();
  const migrated = await migrateLegacyPageTemplates();
  const home = await ensureDefaultHomePage();
  console.log(
    `Templates ready. Created ${created} system templates. Migrated ${migrated} pages.`,
  );
  console.log(
    `Home page ready: ${String(home._id)} (vi=${home.locales.vi.slug}, en=${home.locales.en.slug}, template=${home.templateKey})`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seed failed");
  process.exit(1);
});
