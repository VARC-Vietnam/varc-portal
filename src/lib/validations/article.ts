import { z } from "zod";
import { isEmptyHtml, sanitizeHtml } from "@/lib/html";
import { isSafePublicUrl } from "@/lib/safe-url";

const MAX_HTML_CHARS = 500_000;
const MAX_TEXT_CHARS = 5_000;
const MAX_PASSWORD_CHARS = 128;

const safeUrlSchema = z
  .string()
  .trim()
  .max(2_048)
  .refine(isSafePublicUrl, {
    message: "URL must be http(s) or a site-relative path",
  });

const articleLocaleSchema = z.object({
  title: z.string().trim().max(MAX_TEXT_CHARS),
  excerpt: z.string().trim().max(MAX_TEXT_CHARS),
  content: z.string().max(MAX_HTML_CHARS),
  metaTitle: z.string().trim().max(MAX_TEXT_CHARS),
  metaDescription: z.string().trim().max(MAX_TEXT_CHARS),
});

export const articleFormSchema = z
  .object({
    status: z.enum(["draft", "published"]),
    featured: z.boolean(),
    coverImageUrl: safeUrlSchema,
    coverImageFocus: z.object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      width: z.number().min(1).max(100),
      height: z.number().min(1).max(100),
    }),
    ogImageUrl: safeUrlSchema,
    categoryIds: z.array(z.string().max(64)).max(50),
    tags: z.array(z.string().trim().min(1).max(64)).max(30),
    /** ISO datetime string, or null when unset / draft. */
    publishedAt: z.string().datetime().nullable(),
    /** ISO datetime string, or null to keep server default. */
    createdAt: z.string().datetime().nullable(),
    locales: z.object({
      vi: articleLocaleSchema,
      en: articleLocaleSchema,
    }),
  })
  .superRefine((data, ctx) => {
    if (data.status !== "published") return;

    if (!data.locales.vi.title) {
      ctx.addIssue({
        code: "custom",
        message: "Vietnamese title is required to publish",
        path: ["locales", "vi", "title"],
      });
    }
    if (isEmptyHtml(data.locales.vi.content)) {
      ctx.addIssue({
        code: "custom",
        message: "Vietnamese content is required to publish",
        path: ["locales", "vi", "content"],
      });
    }
  })
  .transform((data) => ({
    ...data,
    locales: {
      vi: {
        ...data.locales.vi,
        content: sanitizeHtml(data.locales.vi.content),
      },
      en: {
        ...data.locales.en,
        content: sanitizeHtml(data.locales.en.content),
      },
    },
  }));

export type ArticleFormValues = z.input<typeof articleFormSchema>;

const categoryLocaleSchema = z.object({
  name: z.string().trim().max(MAX_TEXT_CHARS),
  description: z.string().trim().max(MAX_TEXT_CHARS),
});

export const categoryFormSchema = z
  .object({
    locales: z.object({
      vi: categoryLocaleSchema,
      en: categoryLocaleSchema,
    }),
  })
  .superRefine((data, ctx) => {
    if (!data.locales.vi.name) {
      ctx.addIssue({
        code: "custom",
        message: "Vietnamese name is required",
        path: ["locales", "vi", "name"],
      });
    }
  });

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const pageLocaleSchema = z.object({
  title: z.string().trim().max(MAX_TEXT_CHARS),
  content: z.string().max(MAX_HTML_CHARS),
  metaTitle: z.string().trim().max(MAX_TEXT_CHARS),
  metaDescription: z.string().trim().max(MAX_TEXT_CHARS),
});

const pageGalleryItemSchema = z.object({
  mediaId: z.string().trim().min(1).max(64),
  url: safeUrlSchema.refine((v) => v.length > 0, { message: "URL is required" }),
  alt: z.string().trim().max(MAX_TEXT_CHARS),
  originalName: z.string().trim().max(MAX_TEXT_CHARS),
});

export const pageFormSchema = z
  .object({
    status: z.enum(["draft", "published"]),
    template: z.enum(["default", "gallery"]),
    galleryItems: z.array(pageGalleryItemSchema).max(500),
    showInNav: z.boolean(),
    sortOrder: z.number().int().min(-10_000).max(10_000),
    locales: z.object({
      vi: pageLocaleSchema,
      en: pageLocaleSchema,
    }),
  })
  .superRefine((data, ctx) => {
    if (data.status !== "published") return;
    if (!data.locales.vi.title) {
      ctx.addIssue({
        code: "custom",
        message: "Vietnamese title is required to publish",
        path: ["locales", "vi", "title"],
      });
    }
    if (data.template === "gallery") {
      if (data.galleryItems.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Add at least one gallery image to publish",
          path: ["galleryItems"],
        });
      }
      return;
    }
    if (isEmptyHtml(data.locales.vi.content)) {
      ctx.addIssue({
        code: "custom",
        message: "Vietnamese content is required to publish",
        path: ["locales", "vi", "content"],
      });
    }
  })
  .transform((data) => ({
    ...data,
    locales: {
      vi: {
        ...data.locales.vi,
        content: sanitizeHtml(data.locales.vi.content),
      },
      en: {
        ...data.locales.en,
        content: sanitizeHtml(data.locales.en.content),
      },
    },
  }));

export type PageFormValues = z.input<typeof pageFormSchema>;
export type PageGalleryItemValues = z.infer<typeof pageGalleryItemSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Valid email is required").max(320),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(MAX_PASSWORD_CHARS, "Password is too long"),
  role: z.enum(["setup_admin", "administrator", "editor", "reader"]),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;

export const roleFormSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(200),
  description: z.string().trim().max(MAX_TEXT_CHARS),
  enabled: z.boolean(),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

const menuLocaleSchema = z.object({
  label: z.string().trim().max(MAX_TEXT_CHARS),
  url: safeUrlSchema,
});

export const menuItemFormSchema = z
  .object({
    location: z.enum(["navigation", "footer"]),
    type: z.enum(["page", "custom"]),
    pageId: z.string().nullable(),
    parentId: z.string().nullable().optional(),
    locales: z.object({
      vi: menuLocaleSchema,
      en: menuLocaleSchema,
    }),
    enabled: z.boolean(),
    openInNewTab: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "page") {
      if (!data.pageId) {
        ctx.addIssue({
          code: "custom",
          message: "Select a page for this menu item",
          path: ["pageId"],
        });
      }
      return;
    }

    if (!data.locales.vi.label) {
      ctx.addIssue({
        code: "custom",
        message: "Vietnamese label is required",
        path: ["locales", "vi", "label"],
      });
    }
    if (!data.locales.vi.url) {
      ctx.addIssue({
        code: "custom",
        message: "Vietnamese URL is required",
        path: ["locales", "vi", "url"],
      });
    }
  });

export type MenuItemFormValues = z.infer<typeof menuItemFormSchema>;

export const reorderMenuSchema = z.object({
  location: z.enum(["navigation", "footer"]),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        parentId: z.string().max(64).nullable(),
        sortOrder: z.number().int().nonnegative().max(10_000),
      }),
    )
    .min(1)
    .max(500),
});

const siteLocaleSchema = z.object({
  siteName: z.string().trim().max(MAX_TEXT_CHARS),
  siteTitle: z.string().trim().max(MAX_TEXT_CHARS),
  tagline: z.string().trim().max(MAX_TEXT_CHARS),
  copyright: z.string().trim().max(MAX_TEXT_CHARS),
  metaTitle: z.string().trim().max(MAX_TEXT_CHARS),
  metaDescription: z.string().trim().max(MAX_TEXT_CHARS),
});

export const siteSettingsFormSchema = z
  .object({
    logoUrl: safeUrlSchema,
    faviconUrl: safeUrlSchema,
    ogImageUrl: safeUrlSchema,
    locales: z.object({
      vi: siteLocaleSchema,
      en: siteLocaleSchema,
    }),
  })
  .superRefine((data, ctx) => {
    if (!data.locales.vi.siteName) {
      ctx.addIssue({
        code: "custom",
        message: "Vietnamese site name is required",
        path: ["locales", "vi", "siteName"],
      });
    }
  });

export type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;
