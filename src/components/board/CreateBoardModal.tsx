"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBoard } from "@/lib/actions";

const initial = { error: undefined, success: false };

export function CreateBoardModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(createBoard, initial);

  useEffect(() => {
    if (state.success && state.boardId) {
      onClose();
      formRef.current?.reset();
      router.push(`/boards/${state.boardId}`);
    }
  }, [state.success, state.boardId, onClose, router]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new board</DialogTitle>
          <DialogDescription>
            Give your board a name to get started. You can always change it later.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label htmlFor="board-title" className="text-sm font-medium text-slate-700">
              Board name <span className="text-destructive">*</span>
            </label>
            <Input
              id="board-title"
              name="title"
              required
              placeholder="e.g. Q2 Product Roadmap"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="board-desc" className="text-sm font-medium text-slate-700">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Textarea
              id="board-desc"
              name="description"
              placeholder="What is this board for?"
              rows={3}
              className="resize-none"
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {state.error}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Creating…" : "Create board"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
