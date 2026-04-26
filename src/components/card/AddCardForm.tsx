"use client";

import { useActionState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createCard } from "@/lib/actions";

const initial = { error: undefined, success: false };

interface AddCardFormProps {
  columnId: string;
  boardId: string;
  onClose: () => void;
}

export function AddCardForm({ columnId, boardId, onClose }: AddCardFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(createCard, initial);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onClose();
    }
  }, [state.success, onClose]);

  return (
    <div className="rounded-lg bg-white shadow-sm p-2.5 space-y-2">
      <form ref={formRef} action={formAction} className="space-y-2">
        <input type="hidden" name="columnId" value={columnId} />
        <input type="hidden" name="boardId" value={boardId} />

        <Textarea
          ref={textareaRef}
          name="title"
          placeholder="Enter a title for this card…"
          rows={2}
          required
          className="resize-none text-sm border-0 shadow-none focus-visible:ring-1 bg-slate-50 p-2"
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />

        {state.error && (
          <p className="text-xs text-destructive">{state.error}</p>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={isPending} className="h-8">
            {isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
            Add card
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
