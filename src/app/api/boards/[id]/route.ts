import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/types";
import type { UpdateBoardPayload } from "@/types";

async function getMembership(boardId: string, userId: string) {
  return prisma.boardMember.findUnique({ where: { boardId_userId: { boardId, userId } } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await getMembership(id, session.user.id);
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      members: { include: { user: { omit: { password: true } } } },
      columns: {
        orderBy: { position: "asc" },
        include: {
          cards: {
            orderBy: { position: "asc" },
            include: {
              labels: { include: { label: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(board);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await getMembership(id, session.user.id);
  if (!membership || !hasMinRole(membership.role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: UpdateBoardPayload = await req.json();
  const board = await prisma.board.update({
    where: { id },
    data: { title: body.title, description: body.description },
  });

  return NextResponse.json(board);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await getMembership(id, session.user.id);
  if (!membership || !hasMinRole(membership.role, "OWNER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.board.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
