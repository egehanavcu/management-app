import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CreateBoardPayload } from "@/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const boards = await prisma.board.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: { members: true, _count: { select: { columns: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(boards);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: CreateBoardPayload = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const board = await prisma.board.create({
    data: {
      title: body.title.trim(),
      description: body.description,
      members: { create: { userId: session.user.id, role: "OWNER" } },
    },
    include: { members: true },
  });

  return NextResponse.json(board, { status: 201 });
}
