import Link from "next/link";
import { listAllArticles } from "@/lib/articles";
import { listCategories, listPages } from "@/lib/cms";
import { connectDb } from "@/lib/db";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await connectDb();
  const [articles, categories, pages, users] = await Promise.all([
    listAllArticles(),
    listCategories(),
    listPages(),
    User.countDocuments(),
  ]);

  const cards = [
    {
      href: "/admin/articles",
      title: "Articles",
      count: articles.length,
      hint: "Create and publish news",
    },
    {
      href: "/admin/categories",
      title: "Categories",
      count: categories.length,
      hint: "Organize articles",
    },
    {
      href: "/admin/pages",
      title: "Pages",
      count: pages.length,
      hint: "Static site pages",
    },
    {
      href: "/admin/users",
      title: "Users",
      count: users,
      hint: "Roles and access",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">
        Manage portal content, navigation pages, and admin access.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border border-gray-200 bg-white p-5 transition hover:border-gray-400"
          >
            <p className="text-sm text-gray-500">{card.title}</p>
            <p className="mt-2 text-3xl font-semibold">{card.count}</p>
            <p className="mt-2 text-sm text-gray-600">{card.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
