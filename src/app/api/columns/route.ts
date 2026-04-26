import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/types";
import type { CreateColumnPayload } from "@/types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: CreateColumnPayload = await req.json();
  if (!body.boardId || !body.title?.trim()) {
    return NextResponse.json({ error: "boardId and title required" }, { status: 400 });
  }

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: body.boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const last = await prisma.column.findFirst({
    where: { boardId: body.boardId },
    orderBy: { position: "desc" },
  });

  const column = await prisma.column.create({
    data: {
      title: body.title.trim(),
      boardId: body.boardId,
      position: last ? last.position + 1 : 1,
    },
  });

  return NextResponse.json(column, { status: 201 });
}
