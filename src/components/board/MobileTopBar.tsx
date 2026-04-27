"use client";

import { Menu } from "lucide-react";
import { useMobileSidebar } from "./MobileSidebarProvider";

export function MobileTopBar() {
  const { setOpen } = useMobileSidebar();
  return (
    <div className="flex md:hidden items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0">
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="p-0.5 text-slate-500 hover:text-slate-700 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="font-bold text-slate-900 text-[15px]">TaskFlow</span>
    </div>
  );
}
