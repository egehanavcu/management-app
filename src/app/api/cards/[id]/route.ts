import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/types";
import type { UpdateCardPayload } from "@/types";

async function getCardAndMembership(cardId: string, userId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: true },
  });
  if (!card) return { card: null, membership: null };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: card.column.boardId, userId } },
  });
  return { card, membership };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { card, membership } = await getCardAndMembership(id, session.user.id);
  if (!card || !membership || !hasMinRole(membership.role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: UpdateCardPayload = await req.json();
  const updated = await prisma.card.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined,
    },
    include: {
      assignees: { include: { user: { omit: { password: true } } } },
      labels: { include: { label: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { card, membership } = await getCardAndMembership(id, session.user.id);
  if (!card || !membership || !hasMinRole(membership.role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.card.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
