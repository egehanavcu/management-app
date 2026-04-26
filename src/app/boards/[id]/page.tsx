import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { BoardClient } from "@/components/board/BoardClient";
import type { DndColumn, DndBoardMember } from "@/types/dnd";

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

  // Serialize to plain objects for the client component
  const initialColumns: DndColumn[] = board.columns.map((col) => ({
    id: col.id,
    title: col.title,
    position: col.position,
    boardId: col.boardId,
    cards: col.cards.map((card) => ({
      id: card.id,
      title: card.title,
      position: card.position,
      columnId: card.columnId,
      dueDate: card.dueDate,
      assignedUser: card.assignedUser
        ? {
            id: card.assignedUser.id,
            name: card.assignedUser.name,
            email: card.assignedUser.email,
          }
        : null,
      labels: card.labels.map((cl) => ({
        label: {
          id: cl.label.id,
          name: cl.label.name,
          color: cl.label.color,
        },
      })),
    })),
  }));

  const members: DndBoardMember[] = board.members.map((m) => ({
    id: m.id,
    role: m.role,
    user: { name: m.user.name, email: m.user.email },
  }));

  return (
    <BoardClient
      boardId={board.id}
      boardTitle={board.title}
      members={members}
      initialColumns={initialColumns}
      userRole={membership.role}
    />
  );
}
