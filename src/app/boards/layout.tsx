import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/board/Sidebar";
import { SidebarSkeleton } from "@/components/board/SidebarSkeleton";

export default async function BoardsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-full overflow-hidden">
      {/*
       * Suspense around Sidebar lets the layout shell (and the page's loading.tsx
       * skeleton) render immediately on first paint, while the sidebar's board-list
       * query streams in independently. During client-side navigation the sidebar is
       * already mounted so this Suspense never triggers again.
       */}
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
