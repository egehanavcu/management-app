import { Skeleton } from "@/components/ui/skeleton";

// ─── Card skeleton ────────────────────────────────────────────────────────────
// Matches CardItem exactly: bg-white rounded-lg shadow-sm px-3 py-2.5
// Props drive visual variety so the skeleton doesn't look uniform.

interface GhostCardProps {
  hasLabels?: boolean;
  titleLines?: 1 | 2;
  hasFooter?: boolean;
}

function GhostCard({ hasLabels, titleLines = 1, hasFooter }: GhostCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm px-3 py-2.5">
      {/* Label colour strips */}
      {hasLabels && (
        <div className="flex gap-1 mb-2">
          <div className="h-1.5 w-8 rounded-full bg-slate-200 animate-pulse" />
          <div className="h-1.5 w-8 rounded-full bg-slate-200 animate-pulse" />
        </div>
      )}
      {/* Title */}
      <Skeleton className="h-4 w-full bg-slate-200" />
      {titleLines === 2 && <Skeleton className="h-4 w-3/4 bg-slate-200 mt-1" />}
      {/* Footer: due date chip + assignee avatar */}
      {hasFooter && (
        <div className="flex items-center justify-between mt-2.5">
          <Skeleton className="h-5 w-16 rounded bg-slate-200" />
          <Skeleton className="h-6 w-6 rounded-full bg-slate-200" />
        </div>
      )}
    </div>
  );
}

// ─── Column skeleton ──────────────────────────────────────────────────────────
// Matches Column exactly: w-72 flex-shrink-0 flex flex-col rounded-xl bg-slate-100

interface GhostColumnProps {
  cards: GhostCardProps[];
}

function GhostColumn({ cards }: GhostColumnProps) {
  return (
    <div className="w-72 flex-shrink-0 flex flex-col rounded-xl bg-slate-100 shadow-sm">
      {/* Column header — matches px-3 py-2.5 with grip + title + count + menu */}
      <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* GripVertical icon placeholder */}
          <div className="h-3.5 w-3.5 rounded bg-slate-200 animate-pulse flex-shrink-0" />
          <Skeleton className="h-4 w-24 bg-slate-200" />
          {/* Count badge */}
          <Skeleton className="h-4 w-5 rounded-full bg-slate-200" />
        </div>
        {/* MoreHorizontal button — h-7 w-7 */}
        <Skeleton className="h-7 w-7 rounded bg-slate-200" />
      </div>

      {/* Cards area — matches px-2 space-y-2 pb-2 */}
      <div className="px-2 space-y-2 pb-2">
        {cards.map((props, i) => (
          <GhostCard key={i} {...props} />
        ))}
      </div>

      {/* Add-card footer — matches px-2 pb-2 h-8 */}
      <div className="px-2 pb-2">
        <Skeleton className="h-8 w-full rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────
// 4 columns with varied card layouts — matches a realistic board snapshot.

const GHOST_COLUMNS: GhostColumnProps[] = [
  {
    cards: [
      { hasLabels: true,  titleLines: 1, hasFooter: false },
      { hasLabels: false, titleLines: 2, hasFooter: true  },
      { hasLabels: true,  titleLines: 1, hasFooter: true  },
      { hasLabels: false, titleLines: 1, hasFooter: false },
    ],
  },
  {
    cards: [
      { hasLabels: false, titleLines: 1, hasFooter: true  },
      { hasLabels: true,  titleLines: 2, hasFooter: false },
      { hasLabels: false, titleLines: 1, hasFooter: false },
    ],
  },
  {
    cards: [
      { hasLabels: true,  titleLines: 1, hasFooter: true  },
      { hasLabels: false, titleLines: 1, hasFooter: false },
      { hasLabels: true,  titleLines: 2, hasFooter: true  },
      { hasLabels: false, titleLines: 1, hasFooter: true  },
      { hasLabels: false, titleLines: 1, hasFooter: false },
    ],
  },
  {
    cards: [
      { hasLabels: false, titleLines: 2, hasFooter: false },
      { hasLabels: true,  titleLines: 1, hasFooter: true  },
    ],
  },
];

// ─── Board loading ────────────────────────────────────────────────────────────
// Matches BoardClient's outer structure exactly:
//   flex flex-col h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800
// The gradient and exact header dimensions prevent any layout shift.

export default function BoardLoading() {
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      {/* ── Header skeleton ──────────────────────────────────────────────────
          Exact match of BoardClient header:
          flex items-center gap-4 px-5 py-3 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0
      */}
      <div className="flex items-center gap-3 px-5 py-2.5 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        {/* Left: title + description — matches flex-1 min-w-0 flex flex-col gap-0.5 */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="h-7 w-48 rounded-lg bg-white/25 animate-pulse" />
          {/* Description ghost — h-5 matches the fixed height in EditableBoardDescription */}
          <div className="h-5 w-64 rounded bg-white/15 animate-pulse" />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Member avatar stack — 3 spaced circles, matches gap-x-1 in real header */}
          <div className="flex items-center gap-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full bg-white/25 animate-pulse"
              />
            ))}
          </div>
          {/* Members button ghost — h-8 matches Button size="sm" */}
          <div className="h-8 w-[72px] rounded-md bg-white/20 animate-pulse" />
          {/* Activity button ghost */}
          <div className="h-8 w-[90px] rounded-md bg-white/20 animate-pulse" />
          {/* Role badge ghost */}
          <div className="h-6 w-14 rounded-full bg-white/20 animate-pulse" />
        </div>
      </div>

      {/* ── Columns area ─────────────────────────────────────────────────────
          Exact match of the flex-1 overflow area inside BoardClient:
          flex-1 overflow-x-auto overflow-y-hidden → flex gap-3 p-4 items-start
      */}
      <div className="flex-1 overflow-x-hidden overflow-y-hidden">
        <div className="flex gap-3 p-4 h-full items-start">
          {GHOST_COLUMNS.map((col, i) => (
            <GhostColumn key={i} {...col} />
          ))}

          {/* "Add column" ghost — matches the white/20 button */}
          <div className="w-72 flex-shrink-0 h-[46px] rounded-xl bg-white/15 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
