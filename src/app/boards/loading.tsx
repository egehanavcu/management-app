import { Skeleton } from "@/components/ui/skeleton";

function BoardCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 overflow-hidden">
      {/* Colour strip — exact match of the real card's gradient strip */}
      <div className="h-1.5 -mx-5 -mt-5 mb-4 rounded-t-xl bg-slate-200 animate-pulse" />
      {/* Title + role badge row */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <Skeleton className="h-5 w-36 bg-slate-200" />
        <Skeleton className="h-5 w-14 rounded-full bg-slate-200" />
      </div>
      {/* Stats row */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-20 bg-slate-200" />
        <Skeleton className="h-4 w-20 bg-slate-200" />
      </div>
    </div>
  );
}

export default function BoardsDashboardLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-32 bg-slate-200" />
            <Skeleton className="h-4 w-20 bg-slate-200" />
          </div>
        </div>

        {/* Board grid — same grid as the real page */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <BoardCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
