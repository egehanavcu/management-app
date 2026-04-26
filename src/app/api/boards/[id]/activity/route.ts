import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId } = await params;
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activities = await prisma.activity.findMany({
    where: { card: { column: { boardId } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user:       { select: { name: true, email: true } },
      card:       { select: { title: true } },
      fromColumn: { select: { title: true } },
      toColumn:   { select: { title: true } },
    },
  });

  return NextResponse.json(activities);
}
