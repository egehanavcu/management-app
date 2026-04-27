"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface EditableBoardDescriptionProps {
  boardId: string;
  initialDescription: string | null;
  canEdit: boolean;
  onDescriptionChanged: (newDescription: string | null) => Promise<boolean>;
}

export function EditableBoardDescription({
  initialDescription,
  canEdit,
  onDescriptionChanged,
}: EditableBoardDescriptionProps) {
  const textareaRef               = useRef<HTMLTextAreaElement>(null);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [draft,       setDraft]       = useState(initialDescription ?? "");
  const [editing,     setEditing]     = useState(false);

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      });
    }
  }, [editing]);

  const startEditing = useCallback(() => {
    if (!canEdit) return;
    setDraft(description);
    setEditing(true);
  }, [canEdit, description]);

  const cancel = useCallback(() => {
    setDraft(description);
    setEditing(false);
  }, [description]);

  const commit = useCallback(async () => {
    const trimmed = draft.trim();
    if (trimmed === description.trim()) { setEditing(false); return; }

    const prev = description;
    setDescription(trimmed);  // optimistic
    setEditing(false);

    const ok = await onDescriptionChanged(trimmed || null);
    if (!ok) setDescription(prev);  // rollback; toast is shown by the parent
  }, [draft, description, onDescriptionChanged]);

  // ── Viewer / read-only ─────────────────────────────────────────────────────
  if (!canEdit) {
    if (!description) return null;
    return <p className="text-xs text-white/55 truncate max-w-sm leading-5 h-5">{description}</p>;
  }

  // ── Editing mode ───────────────────────────────────────────────────────────
  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={draft}
        maxLength={500}
        rows={1}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape")               { e.preventDefault(); cancel(); }
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void commit(); }
        }}
        placeholder="Add a description…"
        className={[
          "h-5 text-xs text-white/80 placeholder:text-white/35 leading-5",
          "bg-white/10 rounded px-2 py-0",
          "border border-white/20 focus:border-white/50 outline-none",
          "w-full max-w-sm resize-none overflow-hidden transition-colors duration-150",
        ].join(" ")}
      />
    );
  }

  // ── Display mode ───────────────────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={startEditing}
      title="Click to edit description"
      className={[
        "h-5 leading-5 text-left text-xs max-w-sm truncate transition-colors duration-150",
        description
          ? "text-white/55 hover:text-white/80"
          : "text-white/30 hover:text-white/50 italic",
      ].join(" ")}
    >
      {description || "Add a description…"}
    </button>
  );
}
