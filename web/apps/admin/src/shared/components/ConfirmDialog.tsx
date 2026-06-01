import { useCallback, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, cn } from "./ui";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "danger" | "default";
};

type ConfirmState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        confirmText: "Xác nhận",
        cancelText: "Hủy",
        tone: "default",
        ...options,
        resolve,
      });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    setState((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const dialog = state ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex gap-3 border-b border-slate-100 px-5 py-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              state.tone === "danger" ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600",
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-950">
              {state.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{state.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 bg-slate-50 px-5 py-4">
          <Button type="button" variant="outline" onClick={() => close(false)}>
            {state.cancelText}
          </Button>
          <Button
            type="button"
            variant={state.tone === "danger" ? "destructive" : "primary"}
            onClick={() => close(true)}
          >
            {state.confirmText}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, confirmDialog: dialog };
}
