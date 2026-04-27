"use client";

import { useState, useEffect, useTransition } from "react";
import { Loader2, UserPlus, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DndBoardMember } from "@/types/dnd";

type Role = "OWNER" | "EDITOR" | "VIEWER";

const ROLE_BADGE: Record<Role, string> = {
  OWNER:  "bg-amber-100  text-amber-700",
  EDITOR: "bg-blue-100   text-blue-700",
  VIEWER: "bg-slate-100  text-slate-600",
};

interface MembersDialogProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  currentUserId: string;
  initialMembers: DndBoardMember[];
  isOwner: boolean;
  onMembersChange: (members: DndBoardMember[]) => void;
  onSyncChange: (syncing: boolean) => void;
}

export function MembersDialog({
  open, onClose, boardId, currentUserId, initialMembers, isOwner,
  onMembersChange, onSyncChange,
}: MembersDialogProps) {
  const [members,     setMembers]     = useState<DndBoardMember[]>(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole,  setInviteRole]  = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [isPending,   startTransition] = useTransition();
  const [inviting,    setInviting]    = useState(false);
  const [removingId,  setRemovingId]  = useState<string | null>(null);

  useEffect(() => { if (open) setMembers(initialMembers); }, [open, initialMembers]);

  // ── Invite ────────────────────────────────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const res = await fetch(`/api/boards/${boardId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    setInviting(false);
    if (!res.ok) {
      const d = await res.json();
      toast.error(d.error ?? "Failed to invite member");
      return;
    }
    const m = await res.json();
    const updated = [
      ...members,
      { id: m.id, userId: m.user.id, role: m.role, user: { name: m.user.name, email: m.user.email } },
    ];
    setMembers(updated);
    onMembersChange(updated);
    setInviteEmail("");
    toast.success("Member invited");
  }

  // ── Role change — optimistic ──────────────────────────────────────────────
  function handleRoleChange(userId: string, newRole: Role) {
    const prev    = members;
    const updated = members.map((m) => m.userId === userId ? { ...m, role: newRole } : m);
    setMembers(updated);
    onMembersChange(updated);

    startTransition(async () => {
      onSyncChange(true);
      try {
        const res = await fetch(`/api/boards/${boardId}/members/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        });
        if (!res.ok) {
          toast.error("Failed to change role");
          setMembers(prev);
          onMembersChange(prev);
        }
      } finally {
        onSyncChange(false);
      }
    });
  }

  // ── Remove — pending-then-confirm, not optimistic ────────────────────────
  async function handleRemove(userId: string) {
    setRemovingId(userId);
    onSyncChange(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/members/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Failed to remove member");
        return;
      }
      const updated = members.filter((m) => m.userId !== userId);
      setMembers(updated);
      onMembersChange(updated);
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemovingId(null);
      onSyncChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Board Members
          </DialogTitle>
          <DialogDescription>
            {isOwner ? "Manage who has access to this board." : "View board members."}
          </DialogDescription>
        </DialogHeader>

        {/* Member list */}
        <ul className="space-y-2 mt-1 max-h-52 overflow-y-auto">
          {members.map((m) => {
            const isRemoving = removingId === m.userId;
            return (
              <li
                key={m.id}
                className={`flex items-center gap-2.5 transition-opacity duration-200 ${isRemoving ? "opacity-50" : ""}`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                  {(m.user.name ?? m.user.email ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{m.user.name ?? "—"}</p>
                  <p className="text-[11px] text-slate-500 truncate">{m.user.email}</p>
                </div>
                {isRemoving ? (
                  <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Removing…</span>
                  </div>
                ) : isOwner && m.userId !== currentUserId ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="relative">
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.userId, e.target.value as Role)}
                        disabled={isPending}
                        className={`text-xs border border-slate-200 rounded px-1.5 py-1 bg-white focus:outline-none transition-opacity ${isPending ? "opacity-50" : ""}`}
                      >
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      {isPending && (
                        <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-slate-400 pointer-events-none" />
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(m.userId)}
                      disabled={isPending || !!removingId}
                      className="p-1 text-slate-400 hover:text-destructive disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${ROLE_BADGE[m.role]}`}>
                    {m.role.toLowerCase()}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {/* Invite form — OWNER only */}
        {isOwner && (
          <form onSubmit={handleInvite} className="pt-3 border-t border-slate-100 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Invite by email
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="flex-1 h-9 text-sm"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "EDITOR" | "VIEWER")}
                className="text-sm border border-slate-200 rounded-lg px-2 bg-white focus:outline-none"
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <Button type="submit" size="sm" disabled={inviting} className="w-full">
              {inviting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {inviting ? "Inviting…" : "Send invite"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
