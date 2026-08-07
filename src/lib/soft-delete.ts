import { connectDb } from "@/lib/db";
import { Category, type CategoryDocument } from "@/models/Category";

export const UNCATEGORIZED_KEY = "uncategorized";

/** Active (not soft-deleted) documents. Matches missing deletedAt too. */
export const notDeletedFilter = { deletedAt: null } as const;

export const deletedFilter = { deletedAt: { $ne: null } } as const;

const UNCATEGORIZED_LOCALES = {
  vi: {
    name: "Chưa phân loại",
    slug: "chua-phan-loai",
    description: "Danh mục mặc định cho bài viết không có chuyên mục.",
  },
  en: {
    name: "Uncategorized",
    slug: "uncategorized",
    description: "Default category for articles without a category.",
  },
} as const;

/**
 * Ensures the built-in Uncategorized category exists and is not soft-deleted.
 * Adopts an existing category with the same VI/EN slug if it was created manually.
 */
export async function ensureUncategorizedCategory(): Promise<CategoryDocument> {
  await connectDb();

  let category = await Category.findOne({ key: UNCATEGORIZED_KEY });

  if (!category) {
    category = await Category.findOne({
      $or: [
        { "locales.vi.slug": UNCATEGORIZED_LOCALES.vi.slug },
        { "locales.en.slug": UNCATEGORIZED_LOCALES.en.slug },
      ],
    });
  }

  if (!category) {
    category = await Category.create({
      key: UNCATEGORIZED_KEY,
      isSystem: true,
      deletedAt: null,
      parentId: null,
      sortOrder: 0,
      locales: UNCATEGORIZED_LOCALES,
    });
  } else {
    let dirty = false;
    if (category.key !== UNCATEGORIZED_KEY) {
      category.key = UNCATEGORIZED_KEY;
      dirty = true;
    }
    if (!category.isSystem) {
      category.isSystem = true;
      dirty = true;
    }
    if (category.deletedAt) {
      category.deletedAt = null;
      dirty = true;
    }
    if (category.parentId) {
      category.parentId = null;
      dirty = true;
    }
    if (dirty) await category.save();
  }

  return category.toObject() as CategoryDocument;
}
