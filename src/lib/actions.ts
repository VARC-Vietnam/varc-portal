"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { auth, signOut } from "@/auth";
import { connectDb } from "@/lib/db";
import { isAdminRole, isSystemAdmin, type Role } from "@/lib/roles";
import { uniqueSlugFromTitle } from "@/lib/slug";
import {
  articleFormSchema,
  categoryFormSchema,
  createUserSchema,
  menuItemFormSchema,
  pageFormSchema,
  reorderMenuSchema,
  siteSettingsFormSchema,
} from "@/lib/validations/article";
import { Article } from "@/models/Article";
import { Category } from "@/models/Category";
import { MenuItem } from "@/models/MenuItem";
import { Page } from "@/models/Page";
import { SITE_SETTINGS_KEY, SiteSettings } from "@/models/SiteSettings";
import { User } from "@/models/User";

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

function revalidatePortal() {
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
}

async function articleSlugTaken(
  locale: "vi" | "en",
  slug: string,
  excludeId?: string | null,
) {
  const filter: Record<string, unknown> = {
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
    const session = await requireAdmin();
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
      existing.ogImageUrl = data.ogImageUrl.trim();
      existing.categoryIds = categoryIds;
      existing.tags = tags;
      existing.locales = locales;
      if (data.status === "published") {
        existing.publishedAt = existing.publishedAt ?? new Date();
      } else {
        existing.publishedAt = null;
      }
      await existing.save();
      revalidatePortal();
      return { ok: true, id: String(existing._id) };
    }

    const created = await Article.create({
      status: data.status,
      featured: data.featured,
      coverImageUrl: data.coverImageUrl.trim(),
      ogImageUrl: data.ogImageUrl.trim(),
      categoryIds,
      tags,
      locales,
      authorId: session.user.id,
      publishedAt: data.status === "published" ? new Date() : null,
    });
    revalidatePortal();
    return { ok: true, id: String(created._id) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save article";
    if (message.includes("E11000")) {
      return { ok: false, error: "Slug already exists for a locale" };
    }
    return { ok: false, error: message };
  }
}

export async function deleteArticleAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await connectDb();
    await Article.findByIdAndDelete(id);
    revalidatePortal();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete",
    };
  }
}

export async function saveCategoryAction(
  id: string | null,
  raw: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
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
      existing.locales = locales;
      await existing.save();
      revalidatePortal();
      return { ok: true, id: String(existing._id) };
    }

    const created = await Category.create({ locales });
    revalidatePortal();
    return { ok: true, id: String(created._id) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save category",
    };
  }
}

export async function deleteCategoryAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await connectDb();
    await Article.updateMany(
      { categoryIds: id },
      { $pull: { categoryIds: id } },
    );
    await Category.findByIdAndDelete(id);
    revalidatePortal();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete category",
    };
  }
}

export async function savePageAction(
  id: string | null,
  raw: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const parsed = pageFormSchema.safeParse(raw);
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
      existing.showInNav = data.showInNav;
      existing.sortOrder = data.sortOrder;
      existing.locales = locales;
      await existing.save();
      revalidatePortal();
      return { ok: true, id: String(existing._id) };
    }

    const created = await Page.create({
      status: data.status,
      showInNav: data.showInNav,
      sortOrder: data.sortOrder,
      locales,
    });
    revalidatePortal();
    return { ok: true, id: String(created._id) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save page",
    };
  }
}

export async function deletePageAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await connectDb();
    await Page.findByIdAndDelete(id);
    revalidatePortal();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete page",
    };
  }
}

export async function saveMenuItemAction(
  id: string | null,
  raw: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
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
      if (existing.location !== data.location) {
        return { ok: false, error: "Cannot change menu location" };
      }
      existing.type = data.type;
      existing.pageId =
        data.type === "page" && data.pageId
          ? new mongoose.Types.ObjectId(data.pageId)
          : null;
      existing.locales = locales;
      existing.enabled = data.enabled;
      existing.openInNewTab = data.openInNewTab;
      await existing.save();
      revalidatePortal();
      return { ok: true, id: String(existing._id) };
    }

    const max = await MenuItem.find({ location: data.location })
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
      locales,
      enabled: data.enabled,
      openInNewTab: data.openInNewTab,
      sortOrder: nextOrder,
    });
    revalidatePortal();
    return { ok: true, id: String(created._id) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save menu item",
    };
  }
}

export async function deleteMenuItemAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await connectDb();
    await MenuItem.findByIdAndDelete(id);
    revalidatePortal();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to delete menu item",
    };
  }
}

export async function reorderMenuItemsAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const parsed = reorderMenuSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const { location, orderedIds } = parsed.data;
    await connectDb();

    const items = await MenuItem.find({
      location,
      _id: { $in: orderedIds },
    });
    if (items.length !== orderedIds.length) {
      return { ok: false, error: "One or more menu items were not found" };
    }

    await Promise.all(
      orderedIds.map((itemId, index) =>
        MenuItem.updateOne(
          { _id: itemId, location },
          { $set: { sortOrder: index } },
        ),
      ),
    );
    revalidatePortal();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to reorder menu items",
    };
  }
}

export async function updateUserRoleAction(
  userId: string,
  role: Role,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSystemAdmin();
    if (!["user", "administrator", "system_admin"].includes(role)) {
      return { ok: false, error: "Invalid role" };
    }

    await connectDb();
    const user = await User.findById(userId);
    if (!user) return { ok: false, error: "User not found" };

    if (user.role === "system_admin" && role !== "system_admin") {
      const count = await User.countDocuments({ role: "system_admin" });
      if (count <= 1) {
        return { ok: false, error: "Cannot demote the last system_admin" };
      }
    }

    user.role = role;
    await user.save();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update role",
    };
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
      role: data.role,
    });
    return { ok: true, id: String(created._id) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create user",
    };
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function saveSiteSettingsAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
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
          locales,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    revalidatePortal();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to save site settings",
    };
  }
}
