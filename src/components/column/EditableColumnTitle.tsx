"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface EditableColumnTitleProps {
  /** Current committed title — driven by parent / columns state */
  title: string;
  /** Controlled by Column; set true to activate editing from the outside (e.g. dropdown "Rename") */
  isEditing: boolean;
  onEditingChange: (v: boolean) => void;
  /** Called with the trimmed new title when the user saves.
   *  Returns true on success, false on failure (so the draft rolls back). */
  onCommit: (newTitle: string) => Promise<boolean>;
  canEdit: boolean;
}

export function EditableColumnTitle({
  title,
  isEditing,
  onEditingChange,
  onCommit,
  canEdit,
}: EditableColumnTitleProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft,  setDraft]  = useState(title);
  const [saving, setSaving] = useState(false);

  // Sync draft when entering edit mode (from either click or dropdown "Rename")
  useEffect(() => {
    if (isEditing) {
      setDraft(title);
      // Defer focus so the input is fully mounted inside the DOM
      requestAnimationFrame(() => {
        inputRef.current?.select();
      });
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  async function commit() {
    const trimmed = draft.trim();

    // No-op cases: empty → revert, unchanged → just close
    if (!trimmed) { cancel(); return; }
    if (trimmed === title) { onEditingChange(false); return; }

    const prev = title;
    setSaving(true);
    onEditingChange(false); // close input immediately (optimistic feel)

    const success = await onCommit(trimmed);
    setSaving(false);

    if (!success) {
      // onCommit already rolled back the parent columns state — reset draft too
      setDraft(prev);
    }
  }

  function cancel() {
    setDraft(title);
    onEditingChange(false);
  }

  // ── Editing mode ───────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        aria-label="Column title"
        value={draft}
        maxLength={80}
        onChange={(e) => setDraft(e.target.value)}
        // Stop the drag-handle's pointerDown from firing when clicking the input
        onPointerDown={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter")  { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        className={[
          "text-sm font-semibold text-slate-800",
          "bg-transparent outline-none",
          "border-b border-slate-400 focus:border-slate-700",
          "transition-colors duration-100",
          "w-full min-w-0",
          "placeholder:text-slate-400",
        ].join(" ")}
        placeholder="Column title…"
      />
    );
  }

  // ── Display mode ───────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-1 min-w-0">
      {canEdit ? (
        <h3
          title="Click to rename"
          onPointerDown={(e) => e.stopPropagation()} // prevent column drag on click
          onClick={() => onEditingChange(true)}
          className="text-sm font-semibold text-slate-800 truncate cursor-pointer select-none hover:text-slate-600 transition-colors"
        >
          {title}
        </h3>
      ) : (
        <h3 className="text-sm font-semibold text-slate-800 truncate">{title}</h3>
      )}

      {/* Saving indicator — visible only while the rename API is in flight */}
      {saving && (
        <Loader2
          className="h-3 w-3 text-slate-400 animate-spin flex-shrink-0"
          aria-label="Saving…"
        />
      )}
    </div>
  );
}
