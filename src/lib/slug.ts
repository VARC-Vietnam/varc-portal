import slugify from "slugify";

export function makeSlug(input: string): string {
  const slug = slugify(input, {
    lower: true,
    strict: true,
    locale: "vi",
    trim: true,
  });
  return slug || "item";
}

/** Always derive slug from title; append -2, -3… when taken. */
export async function uniqueSlugFromTitle(
  title: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = makeSlug(title);
  if (!(await isTaken(base))) return base;

  let n = 2;
  while (await isTaken(`${base}-${n}`)) {
    n += 1;
  }
  return `${base}-${n}`;
}
