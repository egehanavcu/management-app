"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createColumn, type CreateColumnState } from "@/lib/actions";
import type { DndColumn } from "@/types/dnd";

const initial: CreateColumnState = {};

interface AddColumnButtonProps {
  boardId: string;
  onColumnAdded: (column: DndColumn) => void;
}

export function AddColumnButton({ boardId, onColumnAdded }: AddColumnButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(createColumn, initial);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (state.success && state.column) {
      onColumnAdded(state.column);  // update BoardClient local state immediately
      router.refresh();              // sync Next.js RSC cache in background
      formRef.current?.reset();
      setOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-72 flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors text-sm font-medium"
      >
        <Plus className="h-4 w-4" />
        Add column
      </button>
    );
  }

  return (
    <div className="w-72 flex-shrink-0 rounded-xl bg-slate-100 p-3 shadow-sm">
      <form ref={formRef} action={formAction} className="space-y-2">
        <input type="hidden" name="boardId" value={boardId} />
        <Input
          ref={inputRef}
          name="title"
          placeholder="Column title…"
          required
          className="h-9 bg-white text-sm"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        />

        {state.error && (
          <p className="text-xs text-destructive">{state.error}</p>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={isPending} className="h-8">
            {isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
            Add column
          </Button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
