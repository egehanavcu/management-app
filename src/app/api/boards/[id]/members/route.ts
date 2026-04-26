import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireOwner(boardId: string, userId: string) {
  const m = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
  });
  return m?.role === "OWNER" ? m : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: boardId } = await params;
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const members = await prisma.boardMember.findMany({
    where: { boardId },
    include: { user: { omit: { password: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(members);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: boardId } = await params;
  if (!(await requireOwner(boardId, session.user.id)))
    return NextResponse.json({ error: "Only owners can invite members" }, { status: 403 });

  const { email, role } = await req.json();
  if (!email?.trim() || !["EDITOR", "VIEWER"].includes(role))
    return NextResponse.json({ error: "Valid email and role (EDITOR | VIEWER) required" }, { status: 400 });

  const invitedUser = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!invitedUser) return NextResponse.json({ error: "No account found for that email" }, { status: 404 });

  const existing = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: invitedUser.id } },
  });
  if (existing) return NextResponse.json({ error: "User is already a member" }, { status: 409 });

  const member = await prisma.boardMember.create({
    data: { boardId, userId: invitedUser.id, role },
    include: { user: { omit: { password: true } } },
  });
  return NextResponse.json(member, { status: 201 });
}
