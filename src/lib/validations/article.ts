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
    coverImageUrl: z.string().trim(),
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
  role: z.enum(["user", "administrator", "system_admin"]),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;
