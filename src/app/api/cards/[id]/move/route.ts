import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { hasMinRole } from "@/types";
import type { MoveCardPayload } from "@/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const card = await prisma.card.findUnique({
    where: { id },
    include: { column: true },
  });
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.column.boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: MoveCardPayload = await req.json();
  if (!body.newColumnId || body.newPosition === undefined) {
    return NextResponse.json({ error: "newColumnId and newPosition required" }, { status: 400 });
  }

  const fromColumnId = card.columnId;

  // Wrap move + activity log in a transaction for consistency
  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const movedCard = await tx.card.update({
      where: { id },
      data: { columnId: body.newColumnId, position: body.newPosition },
    });

    await tx.activity.create({
      data: {
        action: "MOVED",
        cardId: id,
        userId: session.user.id,
        fromColumnId,
        toColumnId: body.newColumnId,
      },
    });

    return movedCard;
  });

  return NextResponse.json(updated);
}
