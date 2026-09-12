"use client";

import type { ReactNode } from "react";

export type BottomNavTab = "home" | "discover" | "sell" | "chats" | "profile";

export interface BottomNavProps {
  active?: BottomNavTab;
  onNavigate?: (tab: BottomNavTab) => void;
  className?: string;
  labels?: Partial<Record<BottomNavTab, string>>;
}

const DEFAULT_LABELS: Record<BottomNavTab, string> = {
  home: "Home",
  discover: "Discover",
  sell: "SELL",
  chats: "Chats",
  profile: "Profile",
};

const TABS: BottomNavTab[] = ["home", "discover", "sell", "chats", "profile"];

function TabIcon({ tab }: { tab: BottomNavTab }): ReactNode {
  const common = "w-5 h-5";
  switch (tab) {
    case "home":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "discover":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
          <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case "sell":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
        </svg>
      );
    case "chats":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 18l1.2-3.2A7.5 7.5 0 1 1 12 19.5H7.5L5 18z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "profile":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M5.5 19c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export function BottomNav({
  active = "home",
  onNavigate,
  className = "",
  labels = {},
}: BottomNavProps) {
  const resolved = { ...DEFAULT_LABELS, ...labels };

  return (
    <nav
      aria-label="Primary"
      className={[
        "fixed bottom-0 inset-x-0 z-40",
        "border-t border-[var(--rw-border)] bg-[var(--rw-bg-elevated)]",
        "pb-[env(safe-area-inset-bottom)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around px-2 pt-1">
        {TABS.map((tab) => {
          const isSell = tab === "sell";
          const isActive = active === tab;
          return (
            <li key={tab} className={isSell ? "-mt-5" : ""}>
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                aria-label={resolved[tab]}
                onClick={() => onNavigate?.(tab)}
                className={[
                  "relative flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rw-accent)] rounded-lg",
                  isSell
                    ? "rounded-full bg-[var(--rw-accent)] text-white shadow-[var(--rw-shadow-sell)] w-14 h-14 justify-center -translate-y-1"
                    : isActive
                      ? "text-[var(--rw-accent)]"
                      : "text-[var(--rw-ink-muted)] hover:text-[var(--rw-ink)]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <TabIcon tab={tab} />
                {!isSell ? <span>{resolved[tab]}</span> : (
                  <span className="sr-only">{resolved[tab]}</span>
                )}
                {isSell ? (
                  <span className="absolute -bottom-5 text-[10px] font-semibold tracking-wide text-[var(--rw-accent)]">
                    {resolved[tab]}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
