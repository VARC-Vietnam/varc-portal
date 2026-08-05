"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const STORAGE_KEY = "varc-article-section-aside-expanded";
const ASIDE_EVENT = "varc-article-section-aside";

export const ARTICLE_ASIDE_WIDTH_EXPANDED = "w-72";
export const ARTICLE_ASIDE_WIDTH_COLLAPSED = "w-[4.5rem]";
export const ARTICLE_ASIDE_PAD_EXPANDED = "lg:pr-80";
export const ARTICLE_ASIDE_PAD_COLLAPSED = "lg:pr-24";

export type ArticleSideSectionId = "category" | "images" | "seo" | "datetime";

type SectionItem = {
  id: ArticleSideSectionId;
  label: string;
  icon: ReactNode;
};

function Icon({
  children,
  className = "h-5 w-5 shrink-0",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const ARTICLE_SIDE_SECTIONS: SectionItem[] = [
  {
    id: "category",
    label: "Category",
    icon: (
      <Icon>
        <path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
      </Icon>
    ),
  },
  {
    id: "images",
    label: "Images",
    icon: (
      <Icon>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m21 16-4.5-4.5L8 20" />
      </Icon>
    ),
  },
  {
    id: "seo",
    label: "SEO",
    icon: (
      <Icon>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-3.5-3.5" />
      </Icon>
    ),
  },
  {
    id: "datetime",
    label: "Date Time",
    icon: (
      <Icon>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 11h18" />
      </Icon>
    ),
  },
];

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(ASIDE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(ASIDE_EVENT, onStoreChange);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

function getServerSnapshot() {
  return true;
}

function setExpandedPreference(next: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(ASIDE_EVENT));
}

export function useArticleSectionAsideExpanded() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

type Props = {
  openSection: ArticleSideSectionId | null;
  onOpenSectionChange: (section: ArticleSideSectionId | null) => void;
  panels: Record<ArticleSideSectionId, ReactNode>;
};

export function ArticleSectionAside({
  openSection,
  onOpenSectionChange,
  panels,
}: Props) {
  const railExpanded = useArticleSectionAsideExpanded();

  function toggleStack(id: ArticleSideSectionId) {
    if (!railExpanded) {
      setExpandedPreference(true);
      onOpenSectionChange(id);
      return;
    }
    onOpenSectionChange(openSection === id ? null : id);
  }

  function openFromCollapsed(id: ArticleSideSectionId) {
    setExpandedPreference(true);
    onOpenSectionChange(id);
  }

  const renderStack = (keyPrefix: string) => (
    <div className="flex min-h-0 flex-1 flex-col">
      {ARTICLE_SIDE_SECTIONS.map((item) => {
        const open = openSection === item.id;
        return (
          <div
            key={`${keyPrefix}-${item.id}`}
            className={`flex min-h-0 flex-col border-b border-gray-200 last:border-b-0 ${
              open ? "min-h-0 flex-1" : "shrink-0"
            }`}
          >
            <button
              type="button"
              onClick={() => toggleStack(item.id)}
              aria-expanded={open}
              className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-3 text-left text-sm transition ${
                open
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-800 hover:bg-gray-50"
              }`}
            >
              {item.icon}
              <span className="min-w-0 flex-1 truncate font-medium">
                {item.label}
              </span>
              <Icon className="h-4 w-4 shrink-0 opacity-70">
                {open ? (
                  <path d="m6 14 6-6 6 6" />
                ) : (
                  <path d="m6 10 6 6 6-6" />
                )}
              </Icon>
            </button>
            {open ? (
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/80 p-3">
                <div className="mx-auto w-full max-w-full min-w-0">
                  {panels[item.id]}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile: accordion under main content */}
      <div className="mt-6 border-t border-gray-200 bg-white lg:hidden">
        {renderStack("mobile")}
      </div>

      {/* Desktop: fixed to the right screen edge */}
      <aside
        className={`fixed inset-y-0 right-0 z-30 hidden h-[100dvh] flex-col border-l border-gray-200 bg-white transition-[width] duration-200 ease-out lg:flex ${
          railExpanded
            ? ARTICLE_ASIDE_WIDTH_EXPANDED
            : ARTICLE_ASIDE_WIDTH_COLLAPSED
        }`}
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b border-gray-200 px-3 ${
            railExpanded ? "justify-between gap-2" : "justify-center"
          }`}
        >
          {railExpanded ? (
            <p className="truncate text-sm font-semibold tracking-tight">
              Details
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setExpandedPreference(!railExpanded)}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
            aria-label={railExpanded ? "Collapse details" : "Expand details"}
            title={railExpanded ? "Collapse" : "Expand"}
          >
            <Icon>
              {railExpanded ? (
                <path d="m9 6 6 6-6 6" />
              ) : (
                <path d="M15 6 9 12l6 6" />
              )}
            </Icon>
          </button>
        </div>

        {railExpanded ? (
          renderStack("desktop")
        ) : (
          <nav
            aria-label="Article side sections"
            className="space-y-1 overflow-y-auto p-2"
          >
            {ARTICLE_SIDE_SECTIONS.map((item) => {
              const active = openSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={() => openFromCollapsed(item.id)}
                  className={`flex w-full cursor-pointer items-center justify-center rounded-md px-2.5 py-2.5 text-sm transition ${
                    active
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {item.icon}
                </button>
              );
            })}
          </nav>
        )}
      </aside>
    </>
  );
}
