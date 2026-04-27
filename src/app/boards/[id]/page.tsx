import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { BoardClient } from "@/components/board/BoardClient";
import type { DndColumn, DndBoardMember, BoardLabel } from "@/types/dnd";

export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  // Run membership check and full board fetch in parallel — eliminates one
  // sequential DB round-trip and cuts response time roughly in half.
  const [membership, board] = await Promise.all([
    prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: id, userId: session.user.id } },
    }),
    prisma.board.findUnique({
      where: { id },
      include: {
        labels: { orderBy: { createdAt: "asc" } },
        members: { include: { user: { omit: { password: true } } } },
        columns: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              orderBy: { position: "asc" },
              include: {
                assignees: { include: { user: { omit: { password: true } } } },
                labels: { include: { label: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  // Both checks happen after the parallel await — no extra round-trip.
  if (!membership || !board) notFound();

  const initialColumns: DndColumn[] = board.columns.map((col) => ({
    id: col.id,
    title: col.title,
    position: col.position,
    boardId: col.boardId,
    cards: col.cards.map((card) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      position: card.position,
      columnId: card.columnId,
      dueDate: card.dueDate,
      assignees: card.assignees.map((a) => ({ id: a.user.id, name: a.user.name, email: a.user.email })),
      labels: card.labels.map((cl) => ({
        label: { id: cl.label.id, name: cl.label.name, color: cl.label.color },
      })),
    })),
  }));

  const members: DndBoardMember[] = board.members.map((m) => ({
    id: m.id,
    userId: m.user.id,
    role: m.role,
    user: { name: m.user.name, email: m.user.email },
  }));

  const labels: BoardLabel[] = board.labels.map((l) => ({
    id: l.id, name: l.name, color: l.color,
  }));

  return (
    <BoardClient
      boardId={board.id}
      boardTitle={board.title}
      boardDescription={board.description}
      members={members}
      labels={labels}
      initialColumns={initialColumns}
      userRole={membership.role}
    />
  );
}
