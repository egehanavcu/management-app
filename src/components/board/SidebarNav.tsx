"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateBoardModal } from "./CreateBoardModal";
import { useMobileSidebar } from "./MobileSidebarProvider";
import { signOutAction } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma";

interface Board {
  id: string;
  title: string;
  role: Role;
}

interface SidebarUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export function SidebarNav({ boards, user }: { boards: Board[]; user: SidebarUser }) {
  const pathname                      = usePathname();
  const [createOpen, setCreateOpen]   = useState(false);
  const { open: sheetOpen, setOpen }  = useMobileSidebar();

  const initials = (user.name ?? user.email ?? "U")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  // Shared nav tree — used by both the desktop aside and the mobile Sheet.
  // `onLinkClick` closes the Sheet on mobile; undefined on desktop (no-op).
  function NavContent({ onLinkClick }: { onLinkClick?: () => void }) {
    return (
      <>
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-200 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
            </svg>
          </div>
          <span className="font-bold text-slate-900 text-[15px]">TaskFlow</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          <Link
            href="/boards"
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === "/boards"
                ? "bg-primary/10 text-primary"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
            All Boards
          </Link>

          {boards.length > 0 && (
            <div className="pt-3 pb-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                My Boards
              </p>
              {boards.map((board) => {
                const active = pathname === `/boards/${board.id}`;
                return (
                  <Link
                    key={board.id}
                    href={`/boards/${board.id}`}
                    onClick={onLinkClick}
                    title={board.title}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      active ? "bg-primary" : "bg-slate-300 group-hover:bg-slate-400"
                    )} />
                    <span className="truncate flex-1">{board.title}</span>
                    {active && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* New board */}
        <div className="px-2 py-3 border-t border-slate-200 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-slate-600 hover:text-slate-900"
            onClick={() => { onLinkClick?.(); setCreateOpen(true); }}
          >
            <Plus className="h-4 w-4" />
            New Board
          </Button>
        </div>

        {/* User row */}
        <div className="px-3 py-3 border-t border-slate-200 flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-slate-900 truncate">{user.name ?? "User"}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <form action={signOutAction} className="inline-flex">
                  <button
                    type="submit"
                    title="Sign out"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              }
            />
            <TooltipContent side="right" className="text-xs">Sign out</TooltipContent>
          </Tooltip>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ── Desktop sidebar (md+) ───────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 h-full bg-white border-r border-slate-200">
        <NavContent />
      </aside>

      {/* ── Mobile sheet (< md) ─────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-60 p-0 flex flex-col gap-0">
          {/* SheetTitle is required for accessibility but visually hidden */}
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <NavContent onLinkClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <CreateBoardModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
