import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while <Sidebar /> (a Server Component) is streaming in.
 * Matches the sidebar's exact width (w-60) and layout structure so there is
 * no layout shift when the real sidebar replaces it.
 */
export function SidebarSkeleton() {
  return (
    <aside className="hidden md:flex flex-col w-60 flex-shrink-0 h-full bg-white border-r border-slate-200">
      {/* Brand row */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-200">
        <Skeleton className="w-7 h-7 rounded-lg" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {/* "All Boards" link */}
        <Skeleton className="h-9 w-full rounded-lg" />

        {/* Board list section */}
        <div className="pt-3 space-y-1">
          <Skeleton className="h-3 w-16 ml-3 mb-2" />
          {[44, 36, 52, 40].map((w, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2">
              <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
              <Skeleton className={`h-4 flex-1`} style={{ maxWidth: w * 2 }} />
            </div>
          ))}
        </div>
      </nav>

      {/* New Board button */}
      <div className="px-2 py-3 border-t border-slate-200">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>

      {/* User row */}
      <div className="px-3 py-3 border-t border-slate-200 flex items-center gap-2.5">
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="w-7 h-7 rounded-lg" />
      </div>
    </aside>
  );
}
