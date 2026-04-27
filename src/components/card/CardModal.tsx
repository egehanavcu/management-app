"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, AlignLeft, Tag, User, Clock, Loader2, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { updateCard } from "@/lib/actions";
import { LABEL_COLORS, getLabelColor } from "@/lib/label-colors";
import type { DndCard, DndBoardMember, BoardLabel } from "@/types/dnd";

function fmt(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

type Activity = {
  id: string;
  action: string;
  createdAt: string;
  user: { name: string | null; email: string | null };
  fromColumn: { title: string } | null;
  toColumn:   { title: string } | null;
};

interface CardModalProps {
  card: DndCard;
  columnTitle: string;
  boardId: string;
  members: DndBoardMember[];
  labels: BoardLabel[];
  canEdit: boolean;
  onClose: () => void;
  onCardUpdated: (card: DndCard) => void;
  onLabelToggled: (labelId: string, add: boolean) => Promise<boolean>;
  onLabelCreated: (name: string, color: string) => Promise<boolean>;
}

export function CardModal({
  card, columnTitle, members, labels, canEdit,
  onClose, onCardUpdated, onLabelToggled, onLabelCreated,
}: CardModalProps) {
  const [title,          setTitle]          = useState(card.title);
  const [description,    setDescription]    = useState(card.description ?? "");
  const [dueDate,        setDueDate]        = useState(fmt(card.dueDate));
  const [assignedUserId, setAssignedUserId] = useState(card.assignedUser?.id ?? "");
  const [activeLabels,   setActiveLabels]   = useState<Set<string>>(
    new Set(card.labels.map((l) => l.label.id))
  );

  // Create-label inline form state
  const [showCreate,   setShowCreate]   = useState(false);
  const [newName,      setNewName]      = useState("");
  const [newColor,     setNewColor]     = useState<string>(LABEL_COLORS[4].key); // blue default
  const [creating,     setCreating]     = useState(false);

  const [activities, setActivities]  = useState<Activity[]>([]);
  const [actLoading, setActLoading]  = useState(true);
  const [saving,     setSaving]      = useState(false);

  useEffect(() => {
    setActLoading(true);
    fetch(`/api/cards/${card.id}/activity`)
      .then((r) => r.json())
      .then(setActivities)
      .catch(() => {})
      .finally(() => setActLoading(false));
  }, [card.id]);

  const save = useCallback(
    async (patch: Parameters<typeof updateCard>[1]) => {
      setSaving(true);
      const result = await updateCard(card.id, patch);
      setSaving(false);
      if (result.success && result.card) {
        onCardUpdated(result.card);
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    },
    [card.id, onCardUpdated]
  );

  async function handleLabelToggle(labelId: string) {
    if (!canEdit) return;
    const add = !activeLabels.has(labelId);
    setActiveLabels((prev) => {
      const next = new Set(prev);
      add ? next.add(labelId) : next.delete(labelId);
      return next;
    });
    const ok = await onLabelToggled(labelId, add);
    if (!ok) {
      setActiveLabels((prev) => {
        const next = new Set(prev);
        add ? next.delete(labelId) : next.add(labelId);
        return next;
      });
    }
  }

  async function handleCreateLabel() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    const ok = await onLabelCreated(name, newColor);
    setCreating(false);
    if (ok) {
      setShowCreate(false);
      setNewName("");
      setNewColor(LABEL_COLORS[4].key);
    }
  }

  function cancelCreate() {
    setShowCreate(false);
    setNewName("");
    setNewColor(LABEL_COLORS[4].key);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {columnTitle}
            </p>
            {canEdit ? (
              <input
                className="w-full text-lg font-semibold text-slate-900 bg-transparent outline-none border-b-2 border-transparent focus:border-primary transition-colors"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title.trim() && title !== card.title && save({ title: title.trim() })}
              />
            ) : (
              <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
            )}
          </div>
          {/* Save spinner — DialogContent renders the close button itself */}
          {saving && <Loader2 className="h-4 w-4 text-slate-400 animate-spin flex-shrink-0 mt-1 mr-6" />}
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="flex overflow-y-auto max-h-[70vh]">

          {/* Main: description + activity */}
          <div className="flex-1 min-w-0 px-6 py-4 space-y-6">

            {/* Description */}
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                <AlignLeft className="h-3.5 w-3.5" /> Description
              </h3>
              {canEdit ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => save({ description: description || null })}
                  placeholder="Add a description…"
                  rows={4}
                  className="resize-none text-sm bg-slate-50"
                />
              ) : description ? (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 rounded-lg p-3">
                  {description}
                </pre>
              ) : (
                <p className="text-sm text-slate-400 italic">No description.</p>
              )}
            </section>

            {/* Activity */}
            <section>
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                <Clock className="h-3.5 w-3.5" /> Activity
              </h3>
              {actLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : activities.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activities.map((a) => {
                    const actor = a.user.name ?? a.user.email ?? "Someone";
                    const when  = new Date(a.createdAt).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    });
                    const desc =
                      a.action === "MOVED"
                        ? `moved this card${a.fromColumn ? ` from "${a.fromColumn.title}"` : ""}${a.toColumn ? ` to "${a.toColumn.title}"` : ""}`
                        : a.action.toLowerCase() + " this card";
                    return (
                      <li key={a.id} className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-0.5">
                          {actor.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="text-sm leading-snug">
                          <span className="font-medium text-slate-800">{actor}</span>
                          <span className="text-slate-500"> {desc}</span>
                          <br />
                          <span className="text-[11px] text-slate-400">{when}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* ── Sidebar ───────────────────────────────────────────────── */}
          <div className="w-52 flex-shrink-0 border-l border-slate-100 px-4 py-4 space-y-5 bg-slate-50/50">

            {/* Due date */}
            <section>
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <Calendar className="h-3 w-3" /> Due Date
              </h3>
              {canEdit ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); save({ dueDate: e.target.value || null }); }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              ) : (
                <p className="text-sm text-slate-700">{dueDate || "—"}</p>
              )}
              {dueDate && canEdit && (
                <button
                  onClick={() => { setDueDate(""); save({ dueDate: null }); }}
                  className="mt-1 text-[11px] text-slate-400 hover:text-destructive transition-colors"
                >
                  Clear
                </button>
              )}
            </section>

            {/* Assignee */}
            <section>
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <User className="h-3 w-3" /> Assignee
              </h3>
              {canEdit ? (
                <select
                  value={assignedUserId}
                  onChange={(e) => { const v = e.target.value; setAssignedUserId(v); save({ assignedUserId: v || null }); }}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name ?? m.user.email}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-slate-700">
                  {card.assignedUser ? (card.assignedUser.name ?? card.assignedUser.email) : "—"}
                </p>
              )}
            </section>

            {/* ── Labels ──────────────────────────────────────────────── */}
            <section>
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                <Tag className="h-3 w-3" /> Labels
              </h3>

              {/* Toggle list */}
              {labels.length > 0 && (
                <div className="space-y-0.5 mb-1">
                  {labels.map((label) => {
                    const active = activeLabels.has(label.id);
                    const lc     = getLabelColor(label.color);
                    return (
                      <button
                        key={label.id}
                        disabled={!canEdit}
                        onClick={() => handleLabelToggle(label.id)}
                        className={[
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                          active
                            ? `${lc.subtle} ${lc.text}`
                            : "hover:bg-slate-100 text-slate-600",
                          canEdit ? "cursor-pointer" : "cursor-default",
                        ].join(" ")}
                      >
                        {/* Color swatch */}
                        <span className={`h-2.5 w-2.5 rounded-sm flex-shrink-0 ${lc.bg}`} />
                        <span className="flex-1 truncate text-left">{label.name}</span>
                        <Check
                          className={`h-3 w-3 flex-shrink-0 transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Create label form */}
              {canEdit && (
                showCreate ? (
                  <div className="mt-2 space-y-2 p-2 bg-white rounded-lg border border-slate-200">
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")  { e.preventDefault(); void handleCreateLabel(); }
                        if (e.key === "Escape") { e.preventDefault(); cancelCreate(); }
                      }}
                      placeholder="Label name…"
                      maxLength={30}
                      className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />

                    {/* Color grid: 4 × 2 */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {LABEL_COLORS.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          title={c.key}
                          onClick={() => setNewColor(c.key)}
                          className={[
                            `w-6 h-6 rounded-md ${c.bg} transition-transform`,
                            newColor === c.key
                              ? "ring-2 ring-offset-1 ring-slate-600 scale-110"
                              : "hover:scale-105 opacity-80 hover:opacity-100",
                          ].join(" ")}
                        />
                      ))}
                    </div>

                    <div className="flex gap-1.5 pt-0.5">
                      <button
                        onClick={() => void handleCreateLabel()}
                        disabled={!newName.trim() || creating}
                        className="flex-1 flex items-center justify-center gap-1 text-xs bg-primary text-white py-1 rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                      </button>
                      <button
                        onClick={cancelCreate}
                        className="text-xs text-slate-500 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mt-1 w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 py-1.5 rounded-md transition-colors"
                  >
                    <Plus className="h-3 w-3" /> New label
                  </button>
                )
              )}

              {/* Viewer: nothing if no labels assigned */}
              {!canEdit && labels.length === 0 && (
                <p className="text-xs text-slate-400 italic">No labels.</p>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
