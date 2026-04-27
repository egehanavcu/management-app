import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-amber-100 text-amber-700",
  EDITOR: "bg-blue-100 text-blue-700",
  VIEWER: "bg-slate-100 text-slate-600",
};

export default async function BoardsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await prisma.boardMember.findMany({
    where: { userId: session.user.id },
    include: {
      board: {
        include: {
          _count: { select: { columns: true, members: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Boards</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {memberships.length === 0
                ? "No boards yet — create one to get started"
                : `${memberships.length} board${memberships.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        {memberships.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <LayoutGrid className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">No boards yet</h2>
            <p className="text-sm text-slate-500 max-w-xs mb-6">
              Create your first board to start organizing tasks with your team.
            </p>
            <p className="text-sm text-slate-400">
              Click{" "}
              <span className="font-medium text-slate-600">&ldquo;New Board&rdquo;</span> in the
              sidebar to begin.
            </p>
          </div>
        ) : (
          /* Board grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberships.map(({ board, role }) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="group block bg-white rounded-xl border border-slate-200 p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                {/* Color strip */}
                <div className="h-1.5 -mx-5 -mt-5 mb-4 rounded-t-xl bg-gradient-to-r from-primary to-blue-400" />

                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="font-semibold text-slate-900 group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {board.title}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 ${ROLE_COLORS[role]}`}
                  >
                    {role.toLowerCase()}
                  </span>
                </div>

                {board.description ? (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                    {board.description}
                  </p>
                ) : (
                  <div className="mb-3" />
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    {board._count.columns} column{board._count.columns !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {board._count.members} member{board._count.members !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
