import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireOwner(boardId: string, sessionUserId: string) {
  const m = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: sessionUserId } },
  });
  return m?.role === "OWNER" ? m : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: boardId, userId } = await params;
  if (!(await requireOwner(boardId, session.user.id)))
    return NextResponse.json({ error: "Only owners can change roles" }, { status: 403 });
  if (userId === session.user.id)
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  const { role } = await req.json();
  if (!["EDITOR", "VIEWER"].includes(role))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  const updated = await prisma.boardMember.update({
    where: { boardId_userId: { boardId, userId } },
    data: { role },
    include: { user: { omit: { password: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: boardId, userId } = await params;
  if (!(await requireOwner(boardId, session.user.id)))
    return NextResponse.json({ error: "Only owners can remove members" }, { status: 403 });
  if (userId === session.user.id)
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  await prisma.boardMember.delete({ where: { boardId_userId: { boardId, userId } } });
  return new NextResponse(null, { status: 204 });
}
