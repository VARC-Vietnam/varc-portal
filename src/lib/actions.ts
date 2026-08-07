"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { auth, signOut } from "@/auth";
import { connectDb } from "@/lib/db";
import {
  canChangeUserRole,
  canManageArticles,
  canManageCategories,
  canManageSite,
  canManageUsers,
  isAdminRole,
  isSystemAdmin,
  normalizeRoleKey,
  type Role,
} from "@/lib/roles";
import { uniqueSlugFromTitle } from "@/lib/slug";
import { normalizeCoverFocus } from "@/lib/cover-focus";
import {
  ensureUncategorizedCategory,
  notDeletedFilter,
  deletedFilter,
  UNCATEGORIZED_KEY,
} from "@/lib/soft-delete";
import {
  articleFormSchema,
  categoryFormSchema,
  createUserSchema,
  menuItemFormSchema,
  pageFormSchema,
  reorderCategoriesSchema,
  reorderMenuSchema,
  roleFormSchema,
  siteSettingsFormSchema,
} from "@/lib/validations/article";
import {
  pageTemplateFormSchema,
  templateLayoutSchema,
} from "@/lib/blocks/types";
import { makeSlug } from "@/lib/slug";
import { PageTemplate } from "@/models/PageTemplate";
import {
  ensureSystemTemplates,
  getPageTemplateById,
  HOME_PAGE_KEY,
} from "@/lib/blocks/templates";
import { ensureDefaultRoles, isValidRoleKey } from "@/lib/app-roles";
import {
  MAX_MENU_DEPTH,
  canPlaceUnderParent,
} from "@/lib/menu-tree";
import { AppRole } from "@/models/AppRole";
import { Article } from "@/models/Article";
import { Category } from "@/models/Category";
import { Media } from "@/models/Media";
import { MenuItem } from "@/models/MenuItem";
import { Page } from "@/models/Page";
import { SITE_SETTINGS_KEY, SiteSettings } from "@/models/SiteSettings";
import { User } from "@/models/User";
import { deleteObject } from "@/lib/media/storage";
import { failAction, logServerError } from "@/lib/safe-error";
import {
  CmsCacheTags,
  invalidateCmsTags,
  type CmsCacheTag,
} from "@/lib/cache/cms-cache";

async function loadMenuParentRefs(location: "navigation" | "footer") {
  const docs = await MenuItem.find({ location, ...notDeletedFilter })
    .select("_id parentId")
    .lean();
  return docs.map((doc) => ({
    id: String(doc._id),
    parentId: doc.parentId ? String(doc.parentId) : null,
  }));
}

async function loadCategoryParentRefs() {
  const docs = await Category.find(notDeletedFilter)
    .select("_id parentId")
    .lean();
  return docs.map((doc) => ({
    id: String(doc._id),
    parentId: doc.parentId ? String(doc.parentId) : null,
  }));
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function requireSystemAdmin() {
  const session = await requireAdmin();
  if (!isSystemAdmin(session.user.role)) {
    throw new Error("Forbidden");
  }
  return session;
}

async function requireUserManager() {
  const session = await requireAdmin();
  if (!canManageUsers(session.user.role)) {
    throw new Error("Forbidden");
  }
  return session;
}

async function requireArticleManager() {
  const session = await requireAdmin();
  if (!canManageArticles(session.user.role)) {
    throw new Error("Forbidden");
  }
  return session;
}

async function requireCategoryManager() {
  const session = await requireAdmin();
  if (!canManageCategories(session.user.role)) {
    throw new Error("Forbidden");
  }
  return session;
}

async function requireSiteManager() {
  const session = await requireAdmin();
  if (!canManageSite(session.user.role)) {
    throw new Error("Forbidden");
  }
  return session;
}

async function markNavigationMenuInitialized() {
  await SiteSettings.findOneAndUpdate(
    { key: SITE_SETTINGS_KEY },
    { $set: { menuNavImported: true } },
    { upsert: true },
  );
}

/** Next.js path revalidation + Valkey tag flush for public CMS reads. */
async function refreshPortal(...extraTags: CmsCacheTag[]) {
  // Flush all public CMS tags so no write path can leave stale portal data.
  await invalidateCmsTags(
    CmsCacheTags.branding,
    CmsCacheTags.settings,
    CmsCacheTags.menus,
    CmsCacheTags.pages,
    CmsCacheTags.articles,
    CmsCacheTags.categories,
    CmsCacheTags.templates,
    ...extraTags,
  );
  revalidatePath("/", "layout");
  revalidatePath("/vi", "layout");
  revalidatePath("/en", "layout");
  revalidatePath("/vi/pages", "layout");
  revalidatePath("/en/pages", "layout");
  revalidatePath("/vi/news", "layout");
  revalidatePath("/en/news", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/menu");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/media");
}

async function articleSlugTaken(
  locale: "vi" | "en",
  slug: string,
  excludeId?: string | null,
) {
  const filter: Record<string, unknown> = {
    ...notDeletedFilter,
    [`locales.${locale}.slug`]: slug,
  };
  if (excludeId && mongoose.isValidObjectId(excludeId)) {
    filter._id = { $ne: excludeId };
  }
  const found = await Article.exists(filter);
  return Boolean(found);
}

async function categorySlugTaken(
  locale: "vi" | "en",
  slug: string,
  excludeId?: string | null,
) {
  const filter: Record<string, unknown> = {
    ...notDeletedFilter,
    [`locales.${locale}.slug`]: slug,
  };
  if (excludeId && mongoose.isValidObjectId(excludeId)) {
    filter._id = { $ne: excludeId };
  }
  return Boolean(await Category.exists(filter));
}

async function pageSlugTaken(
  locale: "vi" | "en",
  slug: string,
  excludeId?: string | null,
) {
  const filter: Record<string, unknown> = {
    ...notDeletedFilter,
    [`locales.${locale}.slug`]: slug,
  };
  if (excludeId && mongoose.isValidObjectId(excludeId)) {
    filter._id = { $ne: excludeId };
  }
  return Boolean(await Page.exists(filter));
}

export async function saveArticleAction(
  id: string | null,
  raw: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const session = await requireArticleManager();
    const parsed = articleFormSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const data = parsed.data;
    await connectDb();

    const viTitle = data.locales.vi.title.trim();
    const enTitle = data.locales.en.title.trim();

    const locales = {
      vi: {
        title: viTitle,
        slug: viTitle
          ? await uniqueSlugFromTitle(viTitle, (slug) =>
              articleSlugTaken("vi", slug, id),
            )
          : "",
        excerpt: data.locales.vi.excerpt.trim(),
        content: data.locales.vi.content,
        metaTitle: data.locales.vi.metaTitle.trim(),
        metaDescription: data.locales.vi.metaDescription.trim(),
      },
      en: {
        title: enTitle,
        slug: enTitle
          ? await uniqueSlugFromTitle(enTitle, (slug) =>
              articleSlugTaken("en", slug, id),
            )
          : "",
        excerpt: data.locales.en.excerpt.trim(),
        content: data.locales.en.content,
        metaTitle: data.locales.en.metaTitle.trim(),
        metaDescription: data.locales.en.metaDescription.trim(),
      },
    };

    const categoryIds = data.categoryIds
      .filter((value) => mongoose.isValidObjectId(value))
      .map((value) => new mongoose.Types.ObjectId(value));

    const tags = Array.from(
      new Map(
        data.tags
          .map((tag) => tag.trim().replace(/\s+/g, " "))
          .filter(Boolean)
          .map((tag) => [tag.toLowerCase(), tag] as const),
      ).values(),
    );

    if (id) {
      const existing = await Article.findById(id);
      if (!existing) return { ok: false, error: "Article not found" };

      existing.status = data.status;
      existing.featured = data.featured;
      existing.coverImageUrl = data.coverImageUrl.trim();
      existing.coverImageFocus = normalizeCoverFocus(data.coverImageFocus);
      existing.ogImageUrl = data.ogImageUrl.trim();
      existing.categoryIds = categoryIds;
      existing.tags = tags;
      existing.locales = locales;
      if (data.publishedAt) {
        existing.publishedAt = new Date(data.publishedAt);
      } else if (data.status === "published") {
        // No date chosen → stamp the moment Publish was saved.
        existing.publishedAt = new Date();
      } else {
        existing.publishedAt = null;
      }
      if (data.createdAt) {
        existing.set("createdAt", new Date(data.createdAt));
      }
      await existing.save();
      await refreshPortal();
      return { ok: true, id: String(existing._id) };
    }

    const created = await Article.create({
      status: data.status,
      featured: data.featured,
      coverImageUrl: data.coverImageUrl.trim(),
      coverImageFocus: normalizeCoverFocus(data.coverImageFocus),
      ogImageUrl: data.ogImageUrl.trim(),
      categoryIds,
      tags,
      locales,
      authorId: session.user.id,
      publishedAt: data.publishedAt
        ? new Date(data.publishedAt)
        : data.status === "published"
          ? new Date()
          : null,
      ...(data.createdAt ? { createdAt: new Date(data.createdAt) } : {}),
    });
    await refreshPortal();
    return { ok: true, id: String(created._id) };
  } catch (error) {
    const failed = failAction(error, "Failed to save article");
    if (failed.error === "A duplicate value already exists") {
      return { ok: false, error: "Slug already exists for a locale" };
    }
    return failed;
  }
}

export async function cloneArticleAction(
  id: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const session = await requireArticleManager();
    await connectDb();

    const source = await Article.findOne({ _id: id, ...notDeletedFilter });
    if (!source) return { ok: false, error: "Article not found" };

    const viTitle = (source.locales?.vi?.title ?? "").trim();
    const enTitle = (source.locales?.en?.title ?? "").trim();
    const viCopyTitle = viTitle ? `${viTitle} (copy)` : "";
    const enCopyTitle = enTitle ? `${enTitle} (copy)` : "";

    const created = await Article.create({
      status: "draft",
      featured: false,
      publishedAt: null,
      authorId: session.user.id,
      categoryIds: source.categoryIds ?? [],
      tags: source.tags ?? [],
      coverImageUrl: source.coverImageUrl ?? "",
      coverImageFocus: normalizeCoverFocus(source.coverImageFocus),
      ogImageUrl: source.ogImageUrl ?? "",
      locales: {
        vi: {
          title: viCopyTitle,
          slug: viCopyTitle
            ? await uniqueSlugFromTitle(viCopyTitle, (slug) =>
                articleSlugTaken("vi", slug),
              )
            : "",
          excerpt: source.locales?.vi?.excerpt ?? "",
          content: source.locales?.vi?.content ?? "",
          metaTitle: source.locales?.vi?.metaTitle ?? "",
          metaDescription: source.locales?.vi?.metaDescription ?? "",
        },
        en: {
          title: enCopyTitle,
          slug: enCopyTitle
            ? await uniqueSlugFromTitle(enCopyTitle, (slug) =>
                articleSlugTaken("en", slug),
              )
            : "",
          excerpt: source.locales?.en?.excerpt ?? "",
          content: source.locales?.en?.content ?? "",
          metaTitle: source.locales?.en?.metaTitle ?? "",
          metaDescription: source.locales?.en?.metaDescription ?? "",
        },
      },
    });

    await refreshPortal();
    return { ok: true, id: String(created._id) };
  } catch (error) {
    return failAction(error, "Failed to clone article");
  }
}

export async function deleteArticleAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireArticleManager();
    await connectDb();
    const existing = await Article.findOne({ _id: id, ...notDeletedFilter });
    if (!existing) return { ok: false, error: "Article not found" };
    existing.deletedAt = new Date();
    await existing.save();
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to delete");
  }
}

export async function restoreArticleAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireArticleManager();
    await connectDb();
    const existing = await Article.findById(id);
    if (!existing?.deletedAt) {
      return { ok: false, error: "Deleted article not found" };
    }
    existing.deletedAt = null;
    await existing.save();
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to restore");
  }
}

export async function permanentlyDeleteArticleAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireArticleManager();
    await connectDb();
    const existing = await Article.findOne({ _id: id, ...deletedFilter });
    if (!existing) {
      return { ok: false, error: "Trashed article not found" };
    }
    await Article.findByIdAndDelete(id);
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to delete permanently");
  }
}

export async function emptyArticlesTrashAction(): Promise<
  { ok: true; deleted: number } | { ok: false; error: string }
> {
  try {
    await requireArticleManager();
    await connectDb();
    const result = await Article.deleteMany(deletedFilter);
    await refreshPortal();
    return { ok: true, deleted: result.deletedCount };
  } catch (error) {
    return failAction(error, "Failed to empty trash");
  }
}

export async function saveCategoryAction(
  id: string | null,
  raw: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireCategoryManager();
    const parsed = categoryFormSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const data = parsed.data;
    await connectDb();

    const viName = data.locales.vi.name.trim();
    const enName = data.locales.en.name.trim();

    const locales = {
      vi: {
        name: viName,
        slug: viName
          ? await uniqueSlugFromTitle(viName, (slug) =>
              categorySlugTaken("vi", slug, id),
            )
          : "",
        description: data.locales.vi.description.trim(),
      },
      en: {
        name: enName,
        slug: enName
          ? await uniqueSlugFromTitle(enName, (slug) =>
              categorySlugTaken("en", slug, id),
            )
          : "",
        description: data.locales.en.description.trim(),
      },
    };

    if (id) {
      const existing = await Category.findById(id);
      if (!existing) return { ok: false, error: "Category not found" };
      if (existing.deletedAt) {
        return { ok: false, error: "Restore this category before editing" };
      }

      let nextParentId: mongoose.Types.ObjectId | null = existing.parentId
        ? new mongoose.Types.ObjectId(String(existing.parentId))
        : null;

      if (data.parentId !== undefined) {
        if (data.parentId === id) {
          return { ok: false, error: "A category cannot be its own parent" };
        }
        if (
          existing.isSystem ||
          existing.key === UNCATEGORIZED_KEY
        ) {
          if (data.parentId) {
            return {
              ok: false,
              error: "Built-in categories must stay at the top level",
            };
          }
          nextParentId = null;
        } else if (data.parentId) {
          const parent = await Category.findOne({
            _id: data.parentId,
            ...notDeletedFilter,
          });
          if (!parent) {
            return { ok: false, error: "Parent category not found" };
          }
          const refs = await loadCategoryParentRefs();
          if (!canPlaceUnderParent(id, data.parentId, refs)) {
            return {
              ok: false,
              error: `Categories can nest at most ${MAX_MENU_DEPTH} levels deep`,
            };
          }
          nextParentId = new mongoose.Types.ObjectId(data.parentId);
        } else {
          nextParentId = null;
        }
      }

      existing.locales = locales;
      existing.parentId = nextParentId;
      await existing.save();
      await refreshPortal();
      return { ok: true, id: String(existing._id) };
    }

    let parentId: mongoose.Types.ObjectId | null = null;
    if (data.parentId) {
      const parent = await Category.findOne({
        _id: data.parentId,
        ...notDeletedFilter,
      });
      if (!parent) {
        return { ok: false, error: "Parent category not found" };
      }
      const provisionalId = new mongoose.Types.ObjectId().toString();
      const refs = await loadCategoryParentRefs();
      if (
        !canPlaceUnderParent(provisionalId, data.parentId, [
          ...refs,
          { id: provisionalId, parentId: null },
        ])
      ) {
        return {
          ok: false,
          error: `Categories can nest at most ${MAX_MENU_DEPTH} levels deep`,
        };
      }
      parentId = new mongoose.Types.ObjectId(data.parentId);
    }

    const siblingFilter = parentId
      ? { ...notDeletedFilter, parentId }
      : {
          ...notDeletedFilter,
          $or: [{ parentId: null }, { parentId: { $exists: false } }],
        };
    const lastSibling = await Category.findOne(siblingFilter)
      .sort({ sortOrder: -1 })
      .select("sortOrder")
      .lean();
    const sortOrder = (Number(lastSibling?.sortOrder) || 0) + 1;

    const created = await Category.create({
      locales,
      parentId,
      sortOrder,
    });
    await refreshPortal();
    return { ok: true, id: String(created._id) };
  } catch (error) {
    return failAction(error, "Failed to save category");
  }
}

export async function deleteCategoryAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireCategoryManager();
    await connectDb();
    const existing = await Category.findOne({ _id: id, ...notDeletedFilter });
    if (!existing) return { ok: false, error: "Category not found" };
    if (existing.isSystem || existing.key === UNCATEGORIZED_KEY) {
      return {
        ok: false,
        error: "The Uncategorized category cannot be deleted",
      };
    }

    const uncategorized = await ensureUncategorizedCategory();
    const categoryOid = existing._id;
    const uncategorizedOid = uncategorized._id;

    const affectedIds = await Article.find({
      ...notDeletedFilter,
      categoryIds: categoryOid,
    }).distinct("_id");

    if (affectedIds.length > 0) {
      await Article.updateMany(
        { _id: { $in: affectedIds } },
        { $pull: { categoryIds: categoryOid } },
      );
      await Article.updateMany(
        { _id: { $in: affectedIds }, categoryIds: { $size: 0 } },
        { $set: { categoryIds: [uncategorizedOid] } },
      );
    }

    existing.deletedAt = new Date();
    await existing.save();
    // Reparent children under the deleted category's parent (or top-level).
    await Category.updateMany(
      { parentId: existing._id, ...notDeletedFilter },
      {
        $set: {
          parentId: existing.parentId
            ? new mongoose.Types.ObjectId(String(existing.parentId))
            : null,
        },
      },
    );
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to delete category");
  }
}

export async function restoreCategoryAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireCategoryManager();
    await connectDb();
    const existing = await Category.findById(id);
    if (!existing?.deletedAt) {
      return { ok: false, error: "Deleted category not found" };
    }
    existing.deletedAt = null;
    await existing.save();
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to restore category");
  }
}

export async function permanentlyDeleteCategoryAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireCategoryManager();
    await connectDb();
    const existing = await Category.findOne({ _id: id, ...deletedFilter });
    if (!existing) {
      return { ok: false, error: "Trashed category not found" };
    }
    if (existing.isSystem || existing.key === UNCATEGORIZED_KEY) {
      return {
        ok: false,
        error: "The Uncategorized category cannot be deleted permanently",
      };
    }
    await Category.updateMany(
      { parentId: existing._id },
      {
        $set: {
          parentId: existing.parentId
            ? new mongoose.Types.ObjectId(String(existing.parentId))
            : null,
        },
      },
    );
    await Category.findByIdAndDelete(id);
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to delete permanently");
  }
}

export async function reorderCategoriesAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireCategoryManager();
    const parsed = reorderCategoriesSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid data",
      };
    }

    const { items: nextItems } = parsed.data;
    await connectDb();

    const ids = nextItems.map((item) => item.id);
    const existing = await Category.find({
      _id: { $in: ids },
      ...notDeletedFilter,
    });
    if (existing.length !== ids.length) {
      return { ok: false, error: "One or more categories were not found" };
    }

    const byId = new Map(existing.map((item) => [String(item._id), item]));
    const proposedRefs = nextItems.map((entry) => ({
      id: entry.id,
      parentId: entry.parentId ?? null,
    }));

    for (const entry of nextItems) {
      const doc = byId.get(entry.id);
      if (!doc) continue;

      if (
        (doc.isSystem || doc.key === UNCATEGORIZED_KEY) &&
        entry.parentId
      ) {
        return {
          ok: false,
          error: "Built-in categories must stay at the top level",
        };
      }

      if (entry.parentId === entry.id) {
        return { ok: false, error: "A category cannot be its own parent" };
      }
      if (entry.parentId) {
        const parentEntry = nextItems.find((item) => item.id === entry.parentId);
        const parentDoc = byId.get(entry.parentId);
        if (!parentEntry || !parentDoc) {
          return { ok: false, error: "Parent category not found" };
        }
        if (!canPlaceUnderParent(entry.id, entry.parentId, proposedRefs)) {
          return {
            ok: false,
            error: `Categories can nest at most ${MAX_MENU_DEPTH} levels deep`,
          };
        }
      }
    }

    await Promise.all(
      nextItems.map((entry) =>
        Category.updateOne(
          { _id: entry.id },
          {
            $set: {
              parentId: entry.parentId
                ? new mongoose.Types.ObjectId(entry.parentId)
                : null,
              sortOrder: entry.sortOrder,
            },
          },
        ),
      ),
    );
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to reorder categories");
  }
}

export async function emptyCategoriesTrashAction(): Promise<
  { ok: true; deleted: number } | { ok: false; error: string }
> {
  try {
    await requireCategoryManager();
    await connectDb();
    const result = await Category.deleteMany({
      ...deletedFilter,
      key: { $ne: UNCATEGORIZED_KEY },
      isSystem: { $ne: true },
    });
    await refreshPortal();
    return { ok: true, deleted: result.deletedCount };
  } catch (error) {
    return failAction(error, "Failed to empty trash");
  }
}

export async function savePageAction(
  id: string | null,
  raw: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireSiteManager();
    const parsed = pageFormSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const data = parsed.data;
    await connectDb();

    const templateKey = data.templateKey.trim();
    const legacyTemplate = templateKey === "gallery" ? "gallery" : "default";

    let layoutOverride = null as ReturnType<
      typeof templateLayoutSchema.parse
    > | null;
    if (data.layoutOverride != null) {
      const layoutParsed = templateLayoutSchema.safeParse(data.layoutOverride);
      if (!layoutParsed.success) {
        return { ok: false, error: "Invalid layout override" };
      }
      layoutOverride = layoutParsed.data;
    }

    const viTitle = data.locales.vi.title.trim();
    const enTitle = data.locales.en.title.trim();

    const locales = {
      vi: {
        title: viTitle,
        slug: viTitle
          ? await uniqueSlugFromTitle(viTitle, (slug) =>
              pageSlugTaken("vi", slug, id),
            )
          : "",
        content: data.locales.vi.content,
        metaTitle: data.locales.vi.metaTitle.trim(),
        metaDescription: data.locales.vi.metaDescription.trim(),
      },
      en: {
        title: enTitle,
        slug: enTitle
          ? await uniqueSlugFromTitle(enTitle, (slug) =>
              pageSlugTaken("en", slug, id),
            )
          : "",
        content: data.locales.en.content,
        metaTitle: data.locales.en.metaTitle.trim(),
        metaDescription: data.locales.en.metaDescription.trim(),
      },
    };

    if (id) {
      const existing = await Page.findById(id);
      if (!existing) return { ok: false, error: "Page not found" };
      existing.status = data.status;
      existing.template = legacyTemplate;
      existing.templateKey = templateKey;
      existing.layoutOverride = layoutOverride;
      existing.galleryItems = data.galleryItems;
      existing.showInNav = data.showInNav;
      existing.sortOrder = data.sortOrder;
      existing.locales = locales;
      await existing.save();
      await refreshPortal();
      return { ok: true, id: String(existing._id) };
    }

    const created = await Page.create({
      status: data.status,
      template: legacyTemplate,
      templateKey,
      layoutOverride,
      galleryItems: data.galleryItems,
      showInNav: data.showInNav,
      sortOrder: data.sortOrder,
      locales,
    });
    await refreshPortal();
    return { ok: true, id: String(created._id) };
  } catch (error) {
    return failAction(error, "Failed to save page");
  }
}

export async function deletePageAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSiteManager();
    await connectDb();
    const existing = await Page.findOne({ _id: id, ...notDeletedFilter });
    if (!existing) return { ok: false, error: "Page not found" };
    if (existing.key === HOME_PAGE_KEY) {
      return { ok: false, error: "The Home page cannot be moved to trash" };
    }
    existing.deletedAt = new Date();
    await existing.save();
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to delete page");
  }
}

export async function restorePageAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSiteManager();
    await connectDb();
    const existing = await Page.findById(id);
    if (!existing?.deletedAt) {
      return { ok: false, error: "Deleted page not found" };
    }
    existing.deletedAt = null;
    await existing.save();
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to restore page");
  }
}

export async function permanentlyDeletePageAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSiteManager();
    await connectDb();
    const existing = await Page.findOne({ _id: id, ...deletedFilter });
    if (!existing) {
      return { ok: false, error: "Trashed page not found" };
    }
    if (existing.key === HOME_PAGE_KEY) {
      return { ok: false, error: "The Home page cannot be deleted" };
    }
    await Page.findByIdAndDelete(id);
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to delete permanently");
  }
}

export async function emptyPagesTrashAction(): Promise<
  { ok: true; deleted: number } | { ok: false; error: string }
> {
  try {
    await requireSiteManager();
    await connectDb();
    const result = await Page.deleteMany({
      ...deletedFilter,
      key: { $ne: HOME_PAGE_KEY },
    });
    // Ensure system home is restored if it was trashed somehow.
    await Page.updateMany(
      { key: HOME_PAGE_KEY, deletedAt: { $ne: null } },
      { $set: { deletedAt: null, status: "published" } },
    );
    await refreshPortal();
    return { ok: true, deleted: result.deletedCount };
  } catch (error) {
    return failAction(error, "Failed to empty trash");
  }
}

export async function saveMenuItemAction(
  id: string | null,
  raw: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireSiteManager();
    const parsed = menuItemFormSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const data = parsed.data;
    await connectDb();

    if (data.type === "page" && data.pageId) {
      const page = await Page.findById(data.pageId);
      if (!page) return { ok: false, error: "Page not found" };
    }

    if (data.type === "category" && data.categoryId) {
      const category = await Category.findOne({
        _id: data.categoryId,
        ...notDeletedFilter,
      });
      if (!category) return { ok: false, error: "Category not found" };
    }

    const locales = {
      vi: {
        label: data.locales.vi.label.trim(),
        url: data.locales.vi.url.trim(),
      },
      en: {
        label: data.locales.en.label.trim(),
        url: data.locales.en.url.trim(),
      },
    };

    if (id) {
      const existing = await MenuItem.findById(id);
      if (!existing) return { ok: false, error: "Menu item not found" };
      if (existing.deletedAt) {
        return { ok: false, error: "Restore this menu item before editing" };
      }
      if (existing.location !== data.location) {
        return { ok: false, error: "Cannot change menu location" };
      }

      let nextParentId: mongoose.Types.ObjectId | null = existing.parentId
        ? new mongoose.Types.ObjectId(String(existing.parentId))
        : null;
      if (data.parentId !== undefined) {
        if (data.parentId === id) {
          return { ok: false, error: "A menu item cannot be its own parent" };
        }
        if (data.parentId) {
          const parent = await MenuItem.findOne({
            _id: data.parentId,
            location: data.location,
            ...notDeletedFilter,
          });
          if (!parent) return { ok: false, error: "Parent menu item not found" };
          const refs = await loadMenuParentRefs(data.location);
          if (!canPlaceUnderParent(id, data.parentId, refs)) {
            return {
              ok: false,
              error: `Menu items can nest at most ${MAX_MENU_DEPTH} levels deep`,
            };
          }
          nextParentId = new mongoose.Types.ObjectId(data.parentId);
        } else {
          nextParentId = null;
        }
      }

      existing.type = data.type;
      existing.pageId =
        data.type === "page" && data.pageId
          ? new mongoose.Types.ObjectId(data.pageId)
          : null;
      existing.categoryId =
        data.type === "category" && data.categoryId
          ? new mongoose.Types.ObjectId(data.categoryId)
          : null;
      existing.parentId = nextParentId;
      existing.locales = locales;
      existing.enabled = data.enabled;
      existing.openInNewTab = data.openInNewTab;
      await existing.save();
      if (data.location === "navigation") {
        await markNavigationMenuInitialized();
      }
      await refreshPortal();
      return { ok: true, id: String(existing._id) };
    }

    let parentId: mongoose.Types.ObjectId | null = null;
    if (data.parentId) {
      const parent = await MenuItem.findOne({
        _id: data.parentId,
        location: data.location,
        ...notDeletedFilter,
      });
      if (!parent) return { ok: false, error: "Parent menu item not found" };
      const refs = await loadMenuParentRefs(data.location);
      // New item has no subtree; treat as a temporary id for cycle checks only.
      const provisionalId = "__new__";
      if (
        !canPlaceUnderParent(provisionalId, data.parentId, [
          ...refs,
          { id: provisionalId, parentId: null },
        ])
      ) {
        return {
          ok: false,
          error: `Menu items can nest at most ${MAX_MENU_DEPTH} levels deep`,
        };
      }
      parentId = new mongoose.Types.ObjectId(data.parentId);
    }

    const max = await MenuItem.find({
      location: data.location,
      parentId,
      ...notDeletedFilter,
    })
      .sort({ sortOrder: -1 })
      .limit(1)
      .lean();
    const nextOrder = (max[0]?.sortOrder ?? -1) + 1;

    const created = await MenuItem.create({
      location: data.location,
      type: data.type,
      pageId:
        data.type === "page" && data.pageId
          ? new mongoose.Types.ObjectId(data.pageId)
          : null,
      categoryId:
        data.type === "category" && data.categoryId
          ? new mongoose.Types.ObjectId(data.categoryId)
          : null,
      parentId: parentId ?? null,
      locales,
      enabled: data.enabled,
      openInNewTab: data.openInNewTab,
      sortOrder: nextOrder,
    });

    // Belt-and-suspenders: ensure parentId is stored even if a stale schema
    // previously stripped it during create.
    if (parentId) {
      await MenuItem.updateOne(
        { _id: created._id },
        { $set: { parentId } },
      );
    }
    if (data.location === "navigation") {
      await markNavigationMenuInitialized();
    }
    await refreshPortal();
    return { ok: true, id: String(created._id) };
  } catch (error) {
    return failAction(error, "Failed to save menu item");
  }
}

export async function deleteMenuItemAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSiteManager();
    await connectDb();
    const existing = await MenuItem.findOne({ _id: id, ...notDeletedFilter });
    if (!existing) return { ok: false, error: "Menu item not found" };
    existing.deletedAt = new Date();
    await existing.save();
    // Reparent children under the deleted item's parent (or top-level).
    await MenuItem.updateMany(
      { parentId: existing._id, ...notDeletedFilter },
      {
        $set: {
          parentId: existing.parentId
            ? new mongoose.Types.ObjectId(String(existing.parentId))
            : null,
        },
      },
    );
    if (existing.location === "navigation") {
      await markNavigationMenuInitialized();
    }
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to delete menu item");
  }
}

export async function restoreMenuItemAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSiteManager();
    await connectDb();
    const existing = await MenuItem.findById(id);
    if (!existing?.deletedAt) {
      return { ok: false, error: "Deleted menu item not found" };
    }
    existing.deletedAt = null;
    await existing.save();
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to restore menu item");
  }
}

export async function permanentlyDeleteMenuItemAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSiteManager();
    await connectDb();
    const existing = await MenuItem.findOne({ _id: id, ...deletedFilter });
    if (!existing) {
      return { ok: false, error: "Trashed menu item not found" };
    }
    if (existing.location === "navigation") {
      await markNavigationMenuInitialized();
    }
    await MenuItem.updateMany(
      { parentId: existing._id },
      {
        $set: {
          parentId: existing.parentId
            ? new mongoose.Types.ObjectId(String(existing.parentId))
            : null,
        },
      },
    );
    await MenuItem.findByIdAndDelete(id);
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to delete permanently");
  }
}

export async function emptyMenuTrashAction(): Promise<
  { ok: true; deleted: number } | { ok: false; error: string }
> {
  try {
    await requireSiteManager();
    await connectDb();
    const hadNavTrash = await MenuItem.exists({
      location: "navigation",
      ...deletedFilter,
    });
    if (hadNavTrash) {
      await markNavigationMenuInitialized();
    }
    const result = await MenuItem.deleteMany(deletedFilter);
    await refreshPortal();
    return { ok: true, deleted: result.deletedCount };
  } catch (error) {
    return failAction(error, "Failed to empty trash");
  }
}

export async function reorderMenuItemsAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSiteManager();
    const parsed = reorderMenuSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const { location, items: nextItems } = parsed.data;
    await connectDb();

    const ids = nextItems.map((item) => item.id);
    const existing = await MenuItem.find({
      location,
      _id: { $in: ids },
      ...notDeletedFilter,
    });
    if (existing.length !== ids.length) {
      return { ok: false, error: "One or more menu items were not found" };
    }

    const byId = new Map(existing.map((item) => [String(item._id), item]));
    const proposedRefs = nextItems.map((entry) => ({
      id: entry.id,
      parentId: entry.parentId ?? null,
    }));

    for (const entry of nextItems) {
      if (entry.parentId === entry.id) {
        return { ok: false, error: "A menu item cannot be its own parent" };
      }
      if (entry.parentId) {
        const parentEntry = nextItems.find((item) => item.id === entry.parentId);
        const parentDoc = byId.get(entry.parentId);
        if (!parentEntry || !parentDoc) {
          return { ok: false, error: "Parent menu item not found" };
        }
        if (!canPlaceUnderParent(entry.id, entry.parentId, proposedRefs)) {
          return {
            ok: false,
            error: `Menu items can nest at most ${MAX_MENU_DEPTH} levels deep`,
          };
        }
      }
    }

    await Promise.all(
      nextItems.map((entry) =>
        MenuItem.updateOne(
          { _id: entry.id, location },
          {
            $set: {
              parentId: entry.parentId
                ? new mongoose.Types.ObjectId(entry.parentId)
                : null,
              sortOrder: entry.sortOrder,
            },
          },
        ),
      ),
    );
    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to reorder menu items");
  }
}

export async function updateUserRoleAction(
  userId: string,
  role: Role,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await requireUserManager();
    const nextRole = normalizeRoleKey(role);
    if (!isValidRoleKey(nextRole)) {
      return { ok: false, error: "Invalid role" };
    }

    await connectDb();
    await ensureDefaultRoles();
    const user = await User.findById(userId);
    if (!user) return { ok: false, error: "User not found" };

    const current = normalizeRoleKey(user.role);
    if (
      !canChangeUserRole({
        actorRole: session.user.role,
        actorUserId: session.user.id,
        targetUserId: userId,
        targetCurrentRole: current,
        nextRole,
      })
    ) {
      return { ok: false, error: "You cannot change this user's role" };
    }

    if (current === "setup_admin" && nextRole !== "setup_admin") {
      const count = await User.countDocuments({
        role: { $in: ["setup_admin", "system_admin"] },
      });
      if (count <= 1) {
        return { ok: false, error: "Cannot demote the last Setup Admin" };
      }
    }

    user.role = nextRole;
    await user.save();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to update role");
  }
}

export async function createUserAction(
  raw: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireSystemAdmin();
    const parsed = createUserSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const data = parsed.data;
    await connectDb();

    const email = data.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) return { ok: false, error: "Email already exists" };

    const passwordHash = await bcrypt.hash(data.password, 12);
    const created = await User.create({
      email,
      name: data.name,
      passwordHash,
      role: normalizeRoleKey(data.role),
    });
    return { ok: true, id: String(created._id) };
  } catch (error) {
    return failAction(error, "Failed to create user");
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function saveSiteSettingsAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSiteManager();
    const parsed = siteSettingsFormSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const data = parsed.data;
    await connectDb();

    const locales = {
      vi: {
        siteName: data.locales.vi.siteName.trim(),
        siteTitle: data.locales.vi.siteTitle.trim(),
        tagline: data.locales.vi.tagline.trim(),
        copyright: data.locales.vi.copyright.trim(),
        metaTitle: data.locales.vi.metaTitle.trim(),
        metaDescription: data.locales.vi.metaDescription.trim(),
      },
      en: {
        siteName: data.locales.en.siteName.trim(),
        siteTitle: data.locales.en.siteTitle.trim(),
        tagline: data.locales.en.tagline.trim(),
        copyright: data.locales.en.copyright.trim(),
        metaTitle: data.locales.en.metaTitle.trim(),
        metaDescription: data.locales.en.metaDescription.trim(),
      },
    };

    await SiteSettings.findOneAndUpdate(
      { key: SITE_SETTINGS_KEY },
      {
        $set: {
          key: SITE_SETTINGS_KEY,
          logoUrl: data.logoUrl.trim(),
          faviconUrl: data.faviconUrl.trim(),
          ogImageUrl: data.ogImageUrl.trim(),
          homePageId:
            data.homePageId && mongoose.isValidObjectId(data.homePageId)
              ? data.homePageId
              : null,
          homeTemplateKey: data.homeTemplateKey.trim() || "home",
          articleTemplateKey: data.articleTemplateKey.trim() || "article",
          categoryTemplateKey: data.categoryTemplateKey.trim() || "category",
          locales,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await refreshPortal();
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to save site settings");
  }
}

export async function saveRoleAction(
  id: string,
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSystemAdmin();
    const parsed = roleFormSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    await connectDb();
    await ensureDefaultRoles();
    const role = await AppRole.findById(id);
    if (!role) return { ok: false, error: "Role not found" };

    // Setup Admin must stay enabled
    if (role.key === "setup_admin" && !parsed.data.enabled) {
      return { ok: false, error: "Setup Admin cannot be disabled" };
    }

    role.label = parsed.data.label.trim();
    role.description = parsed.data.description.trim();
    role.enabled = parsed.data.enabled;
    await role.save();
    revalidatePath("/admin/roles");
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to save role");
  }
}

export async function updateMediaAltAction(
  id: string,
  alt: string,
): Promise<{ ok: true; alt: string } | { ok: false; error: string }> {
  try {
    await requireArticleManager();
    await connectDb();
    const existing = await Media.findOne({ _id: id, ...notDeletedFilter });
    if (!existing) return { ok: false, error: "Media not found" };
    existing.alt = alt
      .trim()
      .replace(/<[^>]*>/g, "")
      .slice(0, 500);
    await existing.save();
    revalidatePath("/admin/media");
    return { ok: true, alt: existing.alt };
  } catch (error) {
    return failAction(error, "Failed to update media");
  }
}

export async function deleteMediaAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireArticleManager();
    await connectDb();
    const existing = await Media.findOne({ _id: id, ...notDeletedFilter });
    if (!existing) return { ok: false, error: "Media not found" };
    existing.deletedAt = new Date();
    await existing.save();
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to delete");
  }
}

export async function restoreMediaAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireArticleManager();
    await connectDb();
    const existing = await Media.findById(id);
    if (!existing?.deletedAt) {
      return { ok: false, error: "Deleted media not found" };
    }
    existing.deletedAt = null;
    await existing.save();
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to restore");
  }
}

export async function permanentlyDeleteMediaAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireArticleManager();
    await connectDb();
    const existing = await Media.findOne({ _id: id, ...deletedFilter });
    if (!existing) {
      return { ok: false, error: "Trashed media not found" };
    }
    try {
      await deleteObject(existing.key);
    } catch (error) {
      logServerError("media delete storage", error);
    }
    await Media.findByIdAndDelete(id);
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to delete permanently");
  }
}

export async function emptyMediaTrashAction(): Promise<
  { ok: true; deleted: number } | { ok: false; error: string }
> {
  try {
    await requireArticleManager();
    await connectDb();
    const trashed = await Media.find(deletedFilter).select("key").lean();
    for (const item of trashed) {
      try {
        await deleteObject(item.key);
      } catch (error) {
        logServerError("media empty trash storage", error);
      }
    }
    const result = await Media.deleteMany(deletedFilter);
    revalidatePath("/admin/media");
    return { ok: true, deleted: result.deletedCount };
  } catch (error) {
    return failAction(error, "Failed to empty trash");
  }
}

async function uniqueTemplateKey(base: string, excludeId?: string) {
  const root = makeSlug(base) || "template";
  let candidate = root;
  let n = 2;
  while (true) {
    const existing = await PageTemplate.findOne({
      key: candidate,
      ...notDeletedFilter,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).select("_id");
    if (!existing) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
  }
}

export async function savePageTemplateAction(
  id: string | null,
  raw: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireSiteManager();
    const parsed = pageTemplateFormSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }
    await connectDb();
    await ensureSystemTemplates();

    const name = parsed.data.name.trim();
    const description = parsed.data.description.trim();
    const layout = parsed.data.layout;

    if (id) {
      const existing = await PageTemplate.findOne({ _id: id, ...notDeletedFilter });
      if (!existing) return { ok: false, error: "Template not found" };
      existing.name = name;
      existing.description = description;
      existing.layout = layout;
      await existing.save();
      await refreshPortal();
      revalidatePath("/admin/templates");
      return { ok: true, id: String(existing._id) };
    }

    const key = await uniqueTemplateKey(name);
    const created = await PageTemplate.create({
      key,
      name,
      description,
      isSystem: false,
      layout,
    });
    await refreshPortal();
    revalidatePath("/admin/templates");
    return { ok: true, id: String(created._id) };
  } catch (error) {
    return failAction(error, "Failed to save template");
  }
}

export async function duplicatePageTemplateAction(
  id: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireSiteManager();
    await connectDb();
    const source = await getPageTemplateById(id);
    if (!source) return { ok: false, error: "Template not found" };

    const key = await uniqueTemplateKey(`${source.key}-copy`);
    const created = await PageTemplate.create({
      key,
      name: `${source.name} (copy)`,
      description: source.description ?? "",
      isSystem: false,
      layout: source.layout,
    });
    await refreshPortal();
    revalidatePath("/admin/templates");
    return { ok: true, id: String(created._id) };
  } catch (error) {
    return failAction(error, "Failed to duplicate template");
  }
}

export async function deletePageTemplateAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSiteManager();
    await connectDb();
    const existing = await PageTemplate.findOne({ _id: id, ...notDeletedFilter });
    if (!existing) return { ok: false, error: "Template not found" };
    if (existing.isSystem) {
      return { ok: false, error: "System templates cannot be deleted" };
    }
    existing.deletedAt = new Date();
    await existing.save();
    await refreshPortal();
    revalidatePath("/admin/templates");
    return { ok: true };
  } catch (error) {
    return failAction(error, "Failed to delete template");
  }
}
