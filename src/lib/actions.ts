"use server";

import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DndCard, DndColumn } from "@/types/dnd";

export type ActionState      = { error?: string; success?: boolean; boardId?: string };
export type CreateCardState  = { error?: string; success?: boolean; card?: DndCard };
export type CreateColumnState = { error?: string; success?: boolean; column?: DndColumn };

// ─── Board ────────────────────────────────────────────────────────────────────

export async function updateBoardTitle(
  boardId: string,
  title: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const trimmed = title.trim();
  if (!trimmed) return { success: false, error: "Board title cannot be empty" };

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Only editors and owners can rename boards" };

  try {
    await prisma.board.update({ where: { id: boardId }, data: { title: trimmed } });
    // Invalidate the board page AND the boards list (sidebar) so both reflect the new name.
    revalidatePath(`/boards/${boardId}`);
    revalidatePath("/boards");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to rename board. Please try again." };
  }
}

const DEFAULT_LABELS = [
  { name: "Bug",           color: "red"    },
  { name: "Feature",       color: "blue"   },
  { name: "Improvement",   color: "green"  },
  { name: "Documentation", color: "purple" },
  { name: "Priority",      color: "orange" },
  { name: "Question",      color: "yellow" },
];

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
        labels: { createMany: { data: DEFAULT_LABELS } },
      },
    });
    revalidatePath("/boards");
    return { success: true, boardId: board.id };
  } catch {
    return { error: "Failed to create board. Please try again." };
  }
}

export async function updateBoardDescription(
  boardId: string,
  description: string | null
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Only editors and owners can edit the description" };

  try {
    await prisma.board.update({
      where: { id: boardId },
      data: { description: description?.trim() || null },
    });
    revalidatePath(`/boards/${boardId}`);
    revalidatePath("/boards");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update description. Please try again." };
  }
}

export async function deleteBoardAction(boardId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "OWNER")) return { error: "Only owners can delete boards" };
  try {
    await prisma.board.delete({ where: { id: boardId } });
    revalidatePath("/boards");
  } catch { return { error: "Failed to delete board" }; }
  redirect("/boards");
}

// ─── Column ───────────────────────────────────────────────────────────────────

export async function renameColumn(
  columnId: string,
  title: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const trimmed = title.trim();
  if (!trimmed) return { success: false, error: "Column title cannot be empty" };

  const column = await prisma.column.findUnique({ where: { id: columnId } });
  if (!column) return { success: false, error: "Column not found" };

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: column.boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Only editors and owners can rename columns" };

  try {
    await prisma.column.update({ where: { id: columnId }, data: { title: trimmed } });
    revalidatePath(`/boards/${column.boardId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to rename column. Please try again." };
  }
}

export async function deleteColumn(
  columnId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const column = await prisma.column.findUnique({ where: { id: columnId } });
  if (!column) return { success: false, error: "Column not found" };

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: column.boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Only editors and owners can delete columns" };

  try {
    // Cascade deletes all cards (and their activities) via Prisma schema relations.
    await prisma.column.delete({ where: { id: columnId } });
    revalidatePath(`/boards/${column.boardId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete column. Please try again." };
  }
}

export async function createColumn(
  _prev: CreateColumnState,
  formData: FormData
): Promise<CreateColumnState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const boardId = formData.get("boardId") as string;
  const title   = (formData.get("title") as string)?.trim();
  if (!boardId || !title) return { error: "Column title is required" };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { error: "You don't have permission to add columns" };
  try {
    const last = await prisma.column.findFirst({ where: { boardId }, orderBy: { position: "desc" } });
    const col  = await prisma.column.create({
      data: { title, boardId, position: last ? last.position + 1 : 1 },
    });
    revalidatePath(`/boards/${boardId}`);
    return { success: true, column: { id: col.id, title: col.title, position: col.position, boardId: col.boardId, cards: [] } };
  } catch { return { error: "Failed to create column. Please try again." }; }
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export async function createCard(
  _prev: CreateCardState,
  formData: FormData
): Promise<CreateCardState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const columnId = formData.get("columnId") as string;
  const boardId  = formData.get("boardId") as string;
  const title    = (formData.get("title") as string)?.trim();
  if (!columnId || !boardId || !title) return { error: "Card title is required" };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { error: "You don't have permission to add cards" };
  try {
    const last = await prisma.card.findFirst({ where: { columnId }, orderBy: { position: "desc" } });
    const card = await prisma.card.create({
      data: { title, columnId, position: last ? last.position + 1 : 1 },
    });
    revalidatePath(`/boards/${boardId}`);
    return {
      success: true,
      card: { id: card.id, title: card.title, description: card.description, position: card.position, columnId: card.columnId, dueDate: card.dueDate, assignedUser: null, labels: [] },
    };
  } catch { return { error: "Failed to create card. Please try again." }; }
}

export type UpdateCardInput = {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  assignedUserId?: string | null;
};

export async function updateCard(
  cardId: string,
  data: UpdateCardInput
): Promise<{ success: boolean; error?: string; card?: DndCard }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const existing = await prisma.card.findUnique({ where: { id: cardId }, include: { column: true } });
  if (!existing) return { success: false, error: "Card not found" };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId: existing.column.boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Forbidden" };
  try {
    const updated = await prisma.card.update({
      where: { id: cardId },
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate !== undefined
          ? (data.dueDate ? new Date(data.dueDate) : null)
          : undefined,
        assignedUserId: data.assignedUserId !== undefined ? data.assignedUserId : undefined,
      },
      include: {
        assignedUser: { omit: { password: true } },
        labels: { include: { label: true } },
      },
    });
    revalidatePath(`/boards/${existing.column.boardId}`);
    return {
      success: true,
      card: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        position: updated.position,
        columnId: updated.columnId,
        dueDate: updated.dueDate,
        assignedUser: updated.assignedUser
          ? { id: updated.assignedUser.id, name: updated.assignedUser.name, email: updated.assignedUser.email }
          : null,
        labels: updated.labels.map((l) => ({ label: { id: l.label.id, name: l.label.name, color: l.label.color } })),
      },
    };
  } catch { return { success: false, error: "Failed to update card" }; }
}

export async function toggleCardLabel(
  cardId: string,
  labelId: string,
  add: boolean,
  boardId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: session.user.id } },
  });
  if (!membership || !hasMinRole(membership.role, "EDITOR"))
    return { success: false, error: "Forbidden" };
  try {
    if (add) {
      await prisma.cardLabel.upsert({
        where: { cardId_labelId: { cardId, labelId } },
        create: { cardId, labelId },
        update: {},
      });
    } else {
      await prisma.cardLabel.delete({ where: { cardId_labelId: { cardId, labelId } } });
    }
    return { success: true };
  } catch { return { success: false, error: "Failed to update label" }; }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
