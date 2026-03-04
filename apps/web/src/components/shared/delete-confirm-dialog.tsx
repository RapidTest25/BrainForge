'use client';

import { Loader2, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemLabel?: string;
  description?: string;
  isPending?: boolean;
}

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  itemLabel,
  description,
  isPending,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-card max-w-sm">
        <div className="flex flex-col items-center text-center py-2">
          <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
            <Trash2 className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
          {itemLabel && (
            <p className="text-sm text-muted-foreground mb-1">
              Are you sure you want to delete <span className="font-medium text-foreground">&ldquo;{itemLabel}&rdquo;</span>?
            </p>
          )}
          <p className="text-xs text-muted-foreground/70">{description || 'This action cannot be undone.'}</p>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-foreground bg-muted hover:bg-accent rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
