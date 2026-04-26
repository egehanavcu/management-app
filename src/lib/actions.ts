"use server";

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionState = { error?: string; success?: boolean; boardId?: string };

export async function createBoard(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Board title is required" };

  try {
    const board = await prisma.board.create({
      data: {
        title,
        description: (formData.get("description") as string)?.trim() || undefined,
        members: { create: { userId: session.user.id, role: "OWNER" } },
      },
    });
    revalidatePath("/boards");
    return { success: true, boardId: board.id };
  } catch {
    return { error: "Failed to create board. Please try again." };
  }
}

export async function createColumn(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const boardId = formData.get("boardId") as string;
  const title = (formData.get("title") as string)?.trim();
  if (!boardId || !title) return { error: "Column title is required" };

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR")) {
    return { error: "You don't have permission to add columns" };
  }

  try {
    const last = await prisma.column.findFirst({
      where: { boardId },
      orderBy: { position: "desc" },
    });
    await prisma.column.create({
      data: { title, boardId, position: last ? last.position + 1 : 1 },
    });
    revalidatePath(`/boards/${boardId}`);
    return { success: true };
  } catch {
    return { error: "Failed to create column. Please try again." };
  }
}

export async function createCard(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const columnId = formData.get("columnId") as string;
  const boardId = formData.get("boardId") as string;
  const title = (formData.get("title") as string)?.trim();
  if (!columnId || !boardId || !title) return { error: "Card title is required" };

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR")) {
    return { error: "You don't have permission to add cards" };
  }

  try {
    const last = await prisma.card.findFirst({
      where: { columnId },
      orderBy: { position: "desc" },
    });
    await prisma.card.create({
      data: { title, columnId, position: last ? last.position + 1 : 1 },
    });
    revalidatePath(`/boards/${boardId}`);
    return { success: true };
  } catch {
    return { error: "Failed to create card. Please try again." };
  }
}

export async function deleteBoardAction(boardId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "OWNER")) {
    return { error: "Only board owners can delete boards" };
  }

  try {
    await prisma.board.delete({ where: { id: boardId } });
    revalidatePath("/boards");
  } catch {
    return { error: "Failed to delete board" };
  }

  redirect("/boards");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
