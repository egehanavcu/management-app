import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Column } from "@/components/column/Column";
import { AddColumnButton } from "@/components/column/AddColumnButton";
import { Users } from "lucide-react";
import { hasMinRole } from "@/types";
import type { Role } from "@/generated/prisma";

function MemberAvatar({ name, email }: { name: string | null; email: string | null }) {
  const initials = (name ?? email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      title={name ?? email ?? "Member"}
      className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-semibold border-2 border-white -ml-1.5 first:ml-0"
    >
      {initials}
    </div>
  );
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: id, userId: session.user.id } },
  });
  if (!membership) notFound();

  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { omit: { password: true } } },
        take: 8,
      },
      columns: {
        orderBy: { position: "asc" },
        include: {
          cards: {
            orderBy: { position: "asc" },
            include: {
              assignedUser: { omit: { password: true } },
              labels: { include: { label: true } },
            },
          },
        },
      },
    },
  });

  if (!board) notFound();

  const canEdit = hasMinRole(membership.role, "EDITOR");

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      {/* Board header */}
      <div className="flex items-center gap-4 px-5 py-3 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <h1 className="text-lg font-bold text-white truncate">{board.title}</h1>

        {/* Member avatars */}
        <div className="flex items-center ml-auto flex-shrink-0">
          <div className="flex items-center">
            {board.members.map((m) => (
              <MemberAvatar
                key={m.id}
                name={m.user.name}
                email={m.user.email}
              />
            ))}
          </div>
          <span className="ml-3 flex items-center gap-1 text-xs text-white/70">
            <Users className="h-3.5 w-3.5" />
            {board.members.length}
          </span>
        </div>

        {/* Role badge */}
        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-white/20 text-white">
          {(membership.role as Role).toLowerCase()}
        </span>
      </div>

      {/* Columns scroll area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 p-4 h-full items-start min-w-max">
          {board.columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              boardId={board.id}
              canEdit={canEdit}
            />
          ))}

          {canEdit && <AddColumnButton boardId={board.id} />}
        </div>
      </div>
    </div>
  );
}
