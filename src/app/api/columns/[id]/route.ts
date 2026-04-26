import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/types";
import type { UpdateColumnPayload } from "@/types";

async function getColumnAndMembership(columnId: string, userId: string) {
  const column = await prisma.column.findUnique({ where: { id: columnId } });
  if (!column) return { column: null, membership: null };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: column.boardId, userId } },
  });
  return { column, membership };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { column, membership } = await getColumnAndMembership(id, session.user.id);
  if (!column || !membership || !hasMinRole(membership.role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: UpdateColumnPayload = await req.json();
  const updated = await prisma.column.update({
    where: { id },
    data: { title: body.title, position: body.position },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { column, membership } = await getColumnAndMembership(id, session.user.id);
  if (!column || !membership || !hasMinRole(membership.role, "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.column.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
