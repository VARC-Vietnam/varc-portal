import { z } from "zod";
import { isEmptyHtml } from "@/lib/html";

const articleLocaleSchema = z.object({
  title: z.string().trim(),
  excerpt: z.string().trim(),
  content: z.string(),
  metaTitle: z.string().trim(),
  metaDescription: z.string().trim(),
});

export const articleFormSchema = z
  .object({
    status: z.enum(["draft", "published"]),
    featured: z.boolean(),
    coverImageUrl: z.string().trim(),
    coverImageFocus: z.object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      width: z.number().min(1).max(100),
      height: z.number().min(1).max(100),
    }),
    ogImageUrl: z.string().trim(),
    categoryIds: z.array(z.string()),
    tags: z.array(z.string().trim().min(1)).max(30),
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
  });

export type ArticleFormValues = z.infer<typeof articleFormSchema>;

const categoryLocaleSchema = z.object({
  name: z.string().trim(),
  description: z.string().trim(),
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
  title: z.string().trim(),
  content: z.string(),
  metaTitle: z.string().trim(),
  metaDescription: z.string().trim(),
});

export const pageFormSchema = z
  .object({
    status: z.enum(["draft", "published"]),
    showInNav: z.boolean(),
    sortOrder: z.number().int(),
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
    if (isEmptyHtml(data.locales.vi.content)) {
      ctx.addIssue({
        code: "custom",
        message: "Vietnamese content is required to publish",
        path: ["locales", "vi", "content"],
      });
    }
  });

export type PageFormValues = z.infer<typeof pageFormSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["setup_admin", "administrator", "editor", "reader"]),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;

export const roleFormSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  description: z.string().trim(),
  enabled: z.boolean(),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;


const menuLocaleSchema = z.object({
  label: z.string().trim(),
  url: z.string().trim(),
});

export const menuItemFormSchema = z
  .object({
    location: z.enum(["navigation", "footer"]),
    type: z.enum(["page", "custom"]),
    pageId: z.string().nullable(),
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
  orderedIds: z.array(z.string().min(1)).min(1),
});

const siteLocaleSchema = z.object({
  siteName: z.string().trim(),
  siteTitle: z.string().trim(),
  tagline: z.string().trim(),
  copyright: z.string().trim(),
  metaTitle: z.string().trim(),
  metaDescription: z.string().trim(),
});

export const siteSettingsFormSchema = z
  .object({
    logoUrl: z.string().trim(),
    faviconUrl: z.string().trim(),
    ogImageUrl: z.string().trim(),
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
