"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  getSmartSheetHistoryStatus,
  redoSmartSheet,
  undoSmartSheet,
} from "@/app/app/smart-sheets/[id]/actions";

type Props = {
  sheetId: string;
};

export default function SmartSheetUndoRedo({ sheetId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const busyRef = useRef(false);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const status = await getSmartSheetHistoryStatus({ sheetId });

    if (status.ok) {
      setCanUndo(Boolean(status.canUndo));
      setCanRedo(Boolean(status.canRedo));
    }
  }, [sheetId]);

  useEffect(() => {
    void refreshStatus();

    const refresh = () => {
      window.setTimeout(() => {
        void refreshStatus();
      }, 120);
    };

    window.addEventListener("samzy:smart-sheet-edit-committed", refresh);
    window.addEventListener("samzy:smart-sheet-batch-pasted", refresh);
    window.addEventListener("samzy:smart-sheet-history-changed", refresh);

    return () => {
      window.removeEventListener("samzy:smart-sheet-edit-committed", refresh);
      window.removeEventListener("samzy:smart-sheet-batch-pasted", refresh);
      window.removeEventListener("samzy:smart-sheet-history-changed", refresh);
    };
  }, [refreshStatus]);

  const runUndo = useCallback(() => {
    if (busyRef.current || isPending || !canUndo) return;

    busyRef.current = true;
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await undoSmartSheet({ sheetId });

        if (!result.ok) {
          setMessage(result.message ?? "Unable to undo.");
          return;
        }

        setMessage(result.message ?? "Undo complete.");

        window.dispatchEvent(
          new CustomEvent("samzy:smart-sheet-history-changed"),
        );

        router.refresh();
        await refreshStatus();
      } finally {
        busyRef.current = false;
      }
    });
  }, [canUndo, isPending, refreshStatus, router, sheetId]);

  const runRedo = useCallback(() => {
    if (busyRef.current || isPending || !canRedo) return;

    busyRef.current = true;
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await redoSmartSheet({ sheetId });

        if (!result.ok) {
          setMessage(result.message ?? "Unable to redo.");
          return;
        }

        setMessage(result.message ?? "Redo complete.");

        window.dispatchEvent(
          new CustomEvent("samzy:smart-sheet-history-changed"),
        );

        router.refresh();
        await refreshStatus();
      } finally {
        busyRef.current = false;
      }
    });
  }, [canRedo, isPending, refreshStatus, router, sheetId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;

      const target = event.target as HTMLElement | null;

      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const command = event.ctrlKey || event.metaKey;
      if (!command) return;

      const key = event.key.toLowerCase();

      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        runUndo();
        return;
      }

      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        event.stopPropagation();
        runRedo();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [runRedo, runUndo]);

  const style = (enabled: boolean): React.CSSProperties => ({
    flex: "0 0 auto",
    height: 32,
    padding: "0 10px",
    border: "1px solid #e4e7ec",
    borderRadius: 6,
    background: "#fff",
    color: enabled ? "#344054" : "#98a2b3",
    fontSize: 11,
    fontWeight: 550,
    cursor: isPending ? "wait" : enabled ? "pointer" : "not-allowed",
    whiteSpace: "nowrap",
    opacity: isPending ? 0.65 : 1,
  });

  return (
    <>
      <button
        type="button"
        onClick={runUndo}
        disabled={!canUndo || isPending}
        style={style(canUndo)}
        title="Undo (Ctrl+Z)"
      >
        ↶ Undo
      </button>

      <button
        type="button"
        onClick={runRedo}
        disabled={!canRedo || isPending}
        style={style(canRedo)}
        title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
      >
        ↷ Redo
      </button>

      {message ? (
        <span
          title={message}
          style={{
            fontSize: 10,
            color: "#667085",
            maxWidth: 180,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {message}
        </span>
      ) : null}
    </>
  );
}
