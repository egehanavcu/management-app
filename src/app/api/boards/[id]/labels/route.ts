import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: id, userId: session.user.id } },
  });
  if (!membership)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const labels = await prisma.label.findMany({
    where: { boardId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, color: true },
  });

  return NextResponse.json(labels);
}
