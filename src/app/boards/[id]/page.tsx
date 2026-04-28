import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { BoardClient } from "@/components/board/BoardClient";
import type { DndColumn, DndBoardMember, BoardLabel } from "@/types/dnd";

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Resolve route params first — these are fast JS thenables, no I/O.
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  // ── Zero-DB fast path ──────────────────────────────────────────────────────
  // A brand-new board is always empty. The layout already verified auth, so we
  // can return HTML immediately — no auth(), no Prisma, nothing to await.
  // startTransition in CreateBoardModal suppresses loading.tsx; together they
  // make the page swap feel instant.
  if (sp.new === "1") {
    const title = typeof sp.title === "string" ? decodeURIComponent(sp.title) : "";
    const desc  = typeof sp.desc  === "string" ? decodeURIComponent(sp.desc)  : null;
    return (
      <BoardClient
        boardId={id}
        boardTitle={title}
        boardDescription={desc || null}
        members={[]}
        labels={[]}
        initialColumns={[]}
        userRole="OWNER"
        isNewBoard
      />
    );
  }

  // ── Standard path for existing boards ─────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
