"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
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
  const router  = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(createBoard, initial);
  const [titleValue, setTitleValue] = useState("");
  const [descValue,  setDescValue]  = useState("");

  // Track which boardId we've already navigated to so the effect is a no-op
  // if it re-fires because onClose changed reference (new arrow fn each render).
  const navigatedTo = useRef<string | null>(null);

  useEffect(() => {
    if (state.success && state.boardId && state.boardId !== navigatedTo.current) {
      navigatedTo.current = state.boardId;
      const encodedTitle = encodeURIComponent(titleValue.trim());
      const encodedDesc  = encodeURIComponent(descValue.trim());
      setTitleValue("");
      setDescValue("");
      formRef.current?.reset();
      onClose();
      // startTransition tells Next.js to skip the loading.tsx skeleton — the
      // current page stays visible while the new route renders in the background.
      startTransition(() => {
        router.push(`/boards/${state.boardId}?new=1&title=${encodedTitle}&desc=${encodedDesc}`);
      });
    }
    // Deliberately omit onClose/router — they're stable enough and including them
    // is what caused the loop (new onClose ref on every SidebarNav re-render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.boardId]);

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
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
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
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
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
