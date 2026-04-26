import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/types";
import type { CreateCardPayload } from "@/types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: CreateCardPayload = await req.json();
  if (!body.columnId || !body.title?.trim()) {
    return NextResponse.json({ error: "columnId and title required" }, { status: 400 });
  }

  const column = await prisma.column.findUnique({ where: { id: body.columnId } });
  if (!column) return NextResponse.json({ error: "Column not found" }, { status: 404 });

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: column.boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const last = await prisma.card.findFirst({
    where: { columnId: body.columnId },
    orderBy: { position: "desc" },
  });

  const card = await prisma.card.create({
    data: {
      title: body.title.trim(),
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assignedUserId: body.assignedUserId,
      columnId: body.columnId,
      position: last ? last.position + 1 : 1,
    },
    include: {
      assignedUser: { omit: { password: true } },
      labels: { include: { label: true } },
    },
  });

  return NextResponse.json(card, { status: 201 });
}
