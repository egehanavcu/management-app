"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateBoardTitle } from "@/lib/actions";

interface EditableBoardTitleProps {
  boardId: string;
  initialTitle: string;
  canEdit: boolean;
  syncing?: boolean;
}

export function EditableBoardTitle({ boardId, initialTitle, canEdit, syncing = false }: EditableBoardTitleProps) {
  const router    = useRouter();
  const inputRef  = useRef<HTMLInputElement>(null);

  // `title`  — the committed (last-saved) value shown in display mode
  // `draft`  — the value being typed in the input right now
  // `editing`— whether the input is visible
  // `saving` — API in flight
  const [title,   setTitle]   = useState(initialTitle);
  const [draft,   setDraft]   = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);

  // Auto-select the text when the input appears so the user can type immediately
  useEffect(() => {
    if (editing) {
      // requestAnimationFrame ensures the input is fully mounted before we focus
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing]);

  const startEditing = useCallback(() => {
    if (!canEdit || saving) return;
    setDraft(title);
    setEditing(true);
  }, [canEdit, saving, title]);

  const cancel = useCallback(() => {
    setDraft(title);
    setEditing(false);
  }, [title]);

  const commit = useCallback(async () => {
    const trimmed = draft.trim();

    // No-op: empty or unchanged
    if (!trimmed) { cancel(); return; }
    if (trimmed === title) { setEditing(false); return; }

    const prev = title;          // capture for rollback
    setTitle(trimmed);           // optimistic update — header shows new name immediately
    setEditing(false);
    setSaving(true);

    const result = await updateBoardTitle(boardId, trimmed);
    setSaving(false);

    if (!result.success) {
      // Rollback the optimistic update and surface the error
      setTitle(prev);
      setDraft(prev);
      toast.error(result.error ?? "Failed to rename board");
    } else {
      // Refresh RSC tree so the sidebar (a Server Component) gets the updated name
      router.refresh();
    }
  }, [boardId, draft, title, cancel, router]);

  // ── Viewer / non-editable ──────────────────────────────────────────────────
  if (!canEdit) {
    return (
      <h1 className="text-lg font-bold text-white truncate min-w-0 max-w-[320px]">
        {title}
      </h1>
    );
  }

  // ── Editing mode ───────────────────────────────────────────────────────────
  if (editing) {
    return (
      <input
        ref={inputRef}
        aria-label="Board title"
        value={draft}
        maxLength={100}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter")  { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        className={[
          // Typography matches the static h1 exactly
          "text-lg font-bold text-white",
          // Transparent background, border only at the bottom
          "bg-transparent outline-none",
          "border-b-2 border-white/50 focus:border-white",
          "transition-colors duration-150",
          // Layout — constrain so it doesn't push the action buttons off-screen
          "min-w-0 w-64 max-w-[320px]",
          // Placeholder colour
          "placeholder:text-white/40",
        ].join(" ")}
        placeholder="Board title…"
      />
    );
  }

  // ── Display mode ───────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-2 group min-w-0">
      <h1
        role="button"
        tabIndex={0}
        title="Click to rename"
        onClick={startEditing}
        onKeyDown={(e) => e.key === "Enter" && startEditing()}
        className={[
          "text-lg font-bold text-white truncate min-w-0 max-w-[320px]",
          "cursor-pointer select-none",
          "hover:opacity-90 transition-opacity",
          "rounded px-0.5 -mx-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        ].join(" ")}
      >
        {title}
      </h1>

      {/* Spinner slot — shown for local title saves and global background syncs */}
      {saving || syncing ? (
        <Loader2 className="h-4 w-4 text-white/60 animate-spin flex-shrink-0" aria-label="Syncing…" />
      ) : (
        <Pencil
          aria-hidden
          className="h-3.5 w-3.5 text-white/0 group-hover:text-white/50 flex-shrink-0 transition-colors duration-150"
        />
      )}
    </div>
  );
}
