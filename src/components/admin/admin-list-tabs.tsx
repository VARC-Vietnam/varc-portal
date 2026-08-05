import Link from "next/link";

export function AdminListTabs({
  basePath,
  active,
  activeCount,
  trashCount,
}: {
  basePath: string;
  active: "active" | "trash";
  activeCount: number;
  trashCount: number;
}) {
  const tabs = [
    { id: "active" as const, label: "Active", href: basePath, count: activeCount },
    {
      id: "trash" as const,
      label: "Trash",
      href: `${basePath}?tab=trash`,
      count: trashCount,
    },
  ];

  return (
    <div className="mt-6 flex gap-1 border-b border-gray-200">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              selected
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
                selected ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {tab.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
