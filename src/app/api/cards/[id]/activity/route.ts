import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cardId } = await params;
  const card = await prisma.card.findUnique({ where: { id: cardId }, include: { column: true } });
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.column.boardId, userId: session.user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activities = await prisma.activity.findMany({
    where: { cardId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user:       { select: { name: true, email: true } },
      fromColumn: { select: { title: true } },
      toColumn:   { select: { title: true } },
    },
  });

  return NextResponse.json(activities);
}
