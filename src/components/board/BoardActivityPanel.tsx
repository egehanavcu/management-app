"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

// ── Types ─────────────────────────────────────────────────────────────────────

type Activity = {
  id: string;
  action: string;
  createdAt: string;
  metadata:   string | null;
  user:       { name: string | null; email: string | null };
  card:       { title: string } | null;
  fromColumn: { title: string } | null;
  toColumn:   { title: string } | null;
  targetUser: { name: string | null; email: string | null } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseCardTitle(a: Activity): string {
  if (a.card?.title) return a.card.title;
  if (a.metadata) {
    try { return JSON.parse(a.metadata).cardTitle ?? "unknown card"; } catch { /* */ }
  }
  return "unknown card";
}

function describeActivity(a: Activity): string {
  const cardTitle = parseCardTitle(a);
  const target    = a.targetUser?.name ?? a.targetUser?.email ?? "someone";

  switch (a.action) {
    case "CREATED":
      return `created "${cardTitle}"`;
    case "UPDATED": {
      if (a.metadata) {
        try {
          const m = JSON.parse(a.metadata);
          if (m.type === "description") return `updated the description of "${cardTitle}"`;
          if (m.oldTitle && m.newTitle)  return `renamed "${m.oldTitle}" to "${m.newTitle}"`;
        } catch { /* */ }
      }
      return `updated "${cardTitle}"`;
    }
    case "DELETED":
      return `deleted card "${cardTitle}"`;
    case "MOVED":
      return `moved "${cardTitle}"${a.fromColumn ? ` from "${a.fromColumn.title}"` : ""}${a.toColumn ? ` to "${a.toColumn.title}"` : ""}`;
    case "ASSIGNED":
      return `assigned ${target} to "${cardTitle}"`;
    case "UNASSIGNED":
      return `removed ${target} from "${cardTitle}"`;
    case "DUE_DATE_UPDATE": {
      if (a.metadata) {
        try {
          const { date } = JSON.parse(a.metadata);
          if (date) {
            const d = new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            return `set the due date of "${cardTitle}" to ${d}`;
          }
          return `removed the due date from "${cardTitle}"`;
        } catch { /* */ }
      }
      return `updated the due date of "${cardTitle}"`;
    }
    case "LABEL_ADD": {
      if (a.metadata) {
        try { const { labelName } = JSON.parse(a.metadata); return `added the "${labelName}" label to "${cardTitle}"`; } catch { /* */ }
      }
      return `added a label to "${cardTitle}"`;
    }
    case "LABEL_REMOVE": {
      if (a.metadata) {
        try { const { labelName } = JSON.parse(a.metadata); return `removed the "${labelName}" label from "${cardTitle}"`; } catch { /* */ }
      }
      return `removed a label from "${cardTitle}"`;
    }
    case "COLUMN_UPDATE": {
      if (a.metadata) {
        try {
          const { oldTitle, newTitle } = JSON.parse(a.metadata);
          if (oldTitle && newTitle) return `renamed column from "${oldTitle}" to "${newTitle}"`;
        } catch { /* */ }
      }
      return "renamed a column";
    }
    case "BOARD_UPDATE": {
      if (a.metadata) {
        try {
          const m = JSON.parse(a.metadata);
          if (m.type === "title" && m.oldTitle && m.newTitle)
            return `renamed the board from "${m.oldTitle}" to "${m.newTitle}"`;
          if (m.type === "description")
            return "updated the board description";
        } catch { /* */ }
      }
      return "updated the board";
    }
    case "COLUMN_CREATE": {
      if (a.metadata) {
        try { const { columnTitle } = JSON.parse(a.metadata); return `created column "${columnTitle}"`; } catch { /* */ }
      }
      return "created a column";
    }
    case "COLUMN_DELETE": {
      if (a.metadata) {
        try { const { columnTitle } = JSON.parse(a.metadata); return `deleted column "${columnTitle}"`; } catch { /* */ }
      }
      return "deleted a column";
    }
    default:
      return `${a.action.toLowerCase()} "${cardTitle}"`;
  }
}

// ── Animation variants ────────────────────────────────────────────────────────

const listVariants: Variants = {
  visible: { transition: { staggerChildren: 0.04 } },
};

const itemVariants: Variants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

// ── useIsDesktop ──────────────────────────────────────────────────────────────

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

// ── Shared panel content ──────────────────────────────────────────────────────

function PanelContent({
  activities,
  loading,
  onClose,
}: {
  activities: Activity[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-800">Board Activity</h2>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 pt-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading activity…
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-slate-400 italic pt-4">No activity recorded yet.</p>
        ) : (
          <motion.ul
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <AnimatePresence initial={false}>
              {activities.map((a) => {
                const actor = a.user.name ?? a.user.email ?? "Someone";
                const when  = new Date(a.createdAt).toLocaleString("en-US", {
                  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                });
                return (
                  <motion.li
                    key={a.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
                    layout="position"
                    className="flex gap-2.5"
                  >
                    <div className={[
                      "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-0.5",
                      a.action === "BOARD_UPDATE"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-primary/15 text-primary",
                    ].join(" ")}>
                      {actor.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-sm leading-snug min-w-0">
                      <span className="font-medium text-slate-800">{actor}</span>{" "}
                      <span className="text-slate-500">{describeActivity(a)}</span>
                      <br />
                      <span className="text-[11px] text-slate-400">{when}</span>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export function BoardActivityPanel({
  boardId,
  open,
  onClose,
  refreshKey = 0,
}: {
  boardId: string;
  open: boolean;
  onClose: () => void;
  refreshKey?: number;
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading,    setLoading]    = useState(true);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/boards/${boardId}/activity`)
      .then((r) => r.json())
      .then(setActivities)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [boardId, open, refreshKey]);

  const content = (
    <PanelContent activities={activities} loading={loading} onClose={onClose} />
  );

  // ── Desktop: absolute overlay, slides in from the right ────────────────────
  // position:absolute so it overlays the board without claiming flex space —
  // this prevents the layout shift / "blue block" that transform alone causes.
  if (isDesktop) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0,      opacity: 1 }}
            exit={{   x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="absolute right-0 top-0 bottom-0 w-80 z-20 bg-white/95 backdrop-blur-sm border-l border-white/20 flex flex-col shadow-2xl"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ── Mobile: Sheet sliding from the right ────────────────────────────────────
  // showCloseButton={false} suppresses SheetContent's built-in X icon so
  // only the one inside PanelContent is visible.
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-sm p-0 flex flex-col gap-0 bg-white"
      >
        <SheetTitle className="sr-only">Board Activity</SheetTitle>
        {content}
      </SheetContent>
    </Sheet>
  );
}
