"use client";

import {
  KeyboardEvent,
  useEffect,
  useState,
  useTransition,
} from "react";

import {
  setSmartSheetCellSame,
  updateSmartSheetCell,
} from "@/app/app/smart-sheets/[id]/actions";

import type {
  SmartSheetCellState,
} from "./smart-sheet-types";

import {
  truncateTwo,
} from "./smart-sheet-types";

type Props = {
  sheetId: string;
  rowId: string;
  columnKey: string;

  value: string | number | null;

  state?: SmartSheetCellState;

  type?:
    | "text"
    | "number"
    | "money"
    | "percent";

  editable?: boolean;

  /*
   * When enabled, the customer can type:
   *
   * SAME
   *
   * directly into the cell.
   */
  allowSame?: boolean;

  align?: "left" | "right";

  onSaved?: () => void;
};

export default function SmartSheetCell({
  sheetId,
  rowId,
  columnKey,
  value,
  state,
  type = "number",
  editable = true,
  allowSame = false,
  align = "right",
  onSaved,
}: Props) {
  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    isEditing,
    setIsEditing,
  ] = useState(false);

  const [
    draftValue,
    setDraftValue,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const isSame =
    state?.mode === "same";

  /* ======================================================
     EDITOR VALUE
     ====================================================== */

  function valueAsString() {
    if (isSame) {
      return "SAME";
    }

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value);
  }

  /* ======================================================
     FORMULA BAR VALUE
     ====================================================== */

  function formulaBarValue(
    savedValue: string | number,
  ) {
    if (type === "text") {
      return String(savedValue);
    }

    const formattedValue =
      truncateTwo(savedValue);

    if (type === "money") {
      return `€${formattedValue}`;
    }

    if (type === "percent") {
      return `${formattedValue}%`;
    }

    return formattedValue;
  }

  /* ======================================================
     START EDITING
     ====================================================== */

  function startEditing(
    initialValue?: string,
  ) {
    if (
      !editable ||
      isPending
    ) {
      return;
    }

    setError(null);

    setDraftValue(
      initialValue !== undefined
        ? initialValue
        : valueAsString(),
    );

    setIsEditing(true);
  }

  /* ======================================================
     EXTERNAL EDIT COMMAND
     ====================================================== */

  useEffect(() => {
    function handleEditRequest(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          rowId?: string;
          columnKey?: string;
          initialValue?: string;
        }>;

      if (
        customEvent.detail?.rowId !==
          rowId ||
        customEvent.detail?.columnKey !==
          columnKey
      ) {
        return;
      }

      startEditing(
        customEvent.detail
          .initialValue,
      );
    }

    window.addEventListener(
      "samzy:smart-sheet-edit",
      handleEditRequest as EventListener,
    );

    return () => {
      window.removeEventListener(
        "samzy:smart-sheet-edit",
        handleEditRequest as EventListener,
      );
    };
  }, [
    rowId,
    columnKey,
    editable,
    isPending,
    isSame,
    value,
  ]);

  /* ======================================================
     DISPLAY VALUE
     ====================================================== */

  function displayValue() {
    if (isSame) {
      return "SAME";
    }

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    if (type === "text") {
      return String(value);
    }

    if (type === "money") {
      return `€${truncateTwo(
        value,
      )}`;
    }

    if (type === "percent") {
      return `${truncateTwo(
        value,
      )}%`;
    }

    return truncateTwo(
      value,
    );
  }

  /* ======================================================
     SUCCESSFUL SAVE
     ====================================================== */

  function finishSuccessfulEdit({
    savedDisplayValue,
    moveDown,
  }: {
    savedDisplayValue: string;
    moveDown: boolean;
  }) {
    setIsEditing(false);

    onSaved?.();

    window.dispatchEvent(
      new CustomEvent(
        "samzy:smart-sheet-value-saved",
        {
          detail: {
            rowId,
            columnKey,
            displayValue:
              savedDisplayValue,
          },
        },
      ),
    );

    window.dispatchEvent(
      new CustomEvent(
        "samzy:smart-sheet-edit-committed",
        {
          detail: {
            rowId,
            columnKey,
            moveDown,
          },
        },
      ),
    );
  }

  /* ======================================================
     COMMIT EDIT
     ====================================================== */

  function commitEdit(
    moveDown = false,
  ) {
    if (
      !editable ||
      isPending ||
      !isEditing
    ) {
      return;
    }

    const cleanedValue =
      draftValue.trim();

    setError(null);

    /* ====================================================
       SAME
       ==================================================== */

    if (
      allowSame &&
      cleanedValue.toUpperCase() ===
        "SAME"
    ) {
      startTransition(
        async () => {
          const result =
            await setSmartSheetCellSame({
              sheetId,
              rowId,
              columnKey,
            });

          if (!result.ok) {
            setError(
              result.message ||
                "Unable to keep the existing value.",
            );

            return;
          }

          finishSuccessfulEdit({
            savedDisplayValue:
              "SAME",
            moveDown,
          });
        },
      );

      return;
    }

    /* ====================================================
       TEXT
       ==================================================== */

    if (type === "text") {
      startTransition(
        async () => {
          const result =
            await updateSmartSheetCell({
              sheetId,
              rowId,
              columnKey,
              value:
                cleanedValue,
            });

          if (!result.ok) {
            setError(
              result.message ||
                "Unable to save.",
            );

            return;
          }

          finishSuccessfulEdit({
            savedDisplayValue:
              cleanedValue,
            moveDown,
          });
        },
      );

      return;
    }

    /* ====================================================
       EMPTY NUMERIC CELL
       ==================================================== */

    if (cleanedValue === "") {
      setError(
        allowSame
          ? 'Enter a number or type "SAME".'
          : "Enter a value.",
      );

      return;
    }

    /* ====================================================
       NORMALIZE NUMBER
       ==================================================== */

    const normalizedValue =
      cleanedValue
        .replace(/\s/g, "")
        .replace(",", ".");

    const numericValue =
      Number(
        normalizedValue,
      );

    if (
      !Number.isFinite(
        numericValue,
      )
    ) {
      setError(
        allowSame
          ? 'Enter a number or type "SAME".'
          : "Enter a valid number.",
      );

      return;
    }

    /* ====================================================
       MANUAL NUMERIC VALUE
       ==================================================== */

    startTransition(
      async () => {
        const result =
          await updateSmartSheetCell({
            sheetId,
            rowId,
            columnKey,
            value:
              numericValue,
          });

        if (!result.ok) {
          setError(
            result.message ||
              "Unable to save.",
          );

          return;
        }

        finishSuccessfulEdit({
          savedDisplayValue:
            formulaBarValue(
              numericValue,
            ),
          moveDown,
        });
      },
    );
  }

  /* ======================================================
     EXTERNAL PASTE
     ====================================================== */

  function savePastedValue(
    pastedValue: string,
  ) {
    if (
      !editable ||
      isPending
    ) {
      return;
    }

    const cleanedValue =
      pastedValue.trim();

    setError(null);

    if (
      allowSame &&
      cleanedValue.toUpperCase() ===
        "SAME"
    ) {
      startTransition(
        async () => {
          const result =
            await setSmartSheetCellSame({
              sheetId,
              rowId,
              columnKey,
            });

          if (!result.ok) {
            setError(
              result.message ||
                "Unable to keep the existing value.",
            );

            return;
          }

          finishSuccessfulEdit({
            savedDisplayValue:
              "SAME",
            moveDown: false,
          });
        },
      );

      return;
    }

    if (type === "text") {
      startTransition(
        async () => {
          const result =
            await updateSmartSheetCell({
              sheetId,
              rowId,
              columnKey,
              value:
                cleanedValue,
            });

          if (!result.ok) {
            setError(
              result.message ||
                "Unable to save pasted value.",
            );

            return;
          }

          finishSuccessfulEdit({
            savedDisplayValue:
              cleanedValue,
            moveDown: false,
          });
        },
      );

      return;
    }

    if (cleanedValue === "") {
      setError(
        allowSame
          ? 'Paste a number or "SAME".'
          : "Paste a numeric value.",
      );

      return;
    }

    const normalizedValue =
      cleanedValue
        .replace(/\s/g, "")
        .replace(/[€%]/g, "")
        .replace(",", ".");

    const numericValue =
      Number(
        normalizedValue,
      );

    if (
      !Number.isFinite(
        numericValue,
      )
    ) {
      setError(
        allowSame
          ? 'Paste a number or "SAME".'
          : "Paste a valid number.",
      );

      return;
    }

    startTransition(
      async () => {
        const result =
          await updateSmartSheetCell({
            sheetId,
            rowId,
            columnKey,
            value:
              numericValue,
          });

        if (!result.ok) {
          setError(
            result.message ||
              "Unable to save pasted value.",
          );

          return;
        }

        finishSuccessfulEdit({
          savedDisplayValue:
            formulaBarValue(
              numericValue,
            ),
          moveDown: false,
        });
      },
    );
  }

  useEffect(() => {
    function handlePasteRequest(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          rowId?: string;
          columnKey?: string;
          value?: string;
        }>;

      if (
        customEvent.detail?.rowId !==
          rowId ||
        customEvent.detail?.columnKey !==
          columnKey
      ) {
        return;
      }

      savePastedValue(
        customEvent.detail?.value ?? "",
      );
    }

    window.addEventListener(
      "samzy:smart-sheet-paste",
      handlePasteRequest as EventListener,
    );

    return () => {
      window.removeEventListener(
        "samzy:smart-sheet-paste",
        handlePasteRequest as EventListener,
      );
    };
  }, [
    rowId,
    columnKey,
    editable,
    isPending,
    allowSame,
    type,
    value,
    isSame,
  ]);

  /* ======================================================
     CANCEL
     ====================================================== */

  function cancelEdit() {
    setDraftValue(
      valueAsString(),
    );

    setError(null);

    setIsEditing(false);
  }

  /* ======================================================
     KEYBOARD
     ====================================================== */

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    event.stopPropagation();

    if (
      event.key === "Enter"
    ) {
      event.preventDefault();

      commitEdit(true);

      return;
    }

    if (
      event.key === "Escape"
    ) {
      event.preventDefault();

      cancelEdit();
    }
  }

  /* ======================================================
     UI
     ====================================================== */

  return (
    <div
      style={{
        minWidth: 0,
        position: "relative",
      }}
    >
      {isEditing ? (
        <input
          autoFocus
          value={draftValue}
          type="text"

          onChange={(
            event,
          ) =>
            setDraftValue(
              event.target.value,
            )
          }

          onKeyDown={
            handleKeyDown
          }

          onBlur={() =>
            commitEdit(false)
          }

          style={{
            width:
              type === "text"
                ? "180px"
                : "92px",

            maxWidth:
              "100%",

            boxSizing:
              "border-box",

            border:
              "1px solid #2563eb",

            borderRadius:
              "2px",

            padding:
              "1px 3px",

            fontSize:
              "11px",

            lineHeight:
              "15px",

            fontFamily:
              "inherit",

            textAlign:
              align,

            outline:
              "none",

            background:
              "#ffffff",

            boxShadow:
              "inset 0 0 0 1px rgba(37,99,235,0.08)",
          }}
        />
      ) : (
        <button
          type="button"

          disabled={
            !editable ||
            isPending
          }

          onDoubleClick={() =>
            startEditing()
          }

          style={{
            width: "100%",

            appearance:
              "none",

            border:
              "none",

            padding:
              "1px 0",

            margin: 0,

            background:
              "transparent",

            cursor:
              editable
                ? "cell"
                : "default",

            font:
              "inherit",

            lineHeight:
              1.3,

            color:
              isSame
                ? "#7c3aed"
                : "#111827",

            fontWeight:
              isSame ||
              type === "money"
                ? 600
                : 400,

            textAlign:
              align,

            whiteSpace:
              "nowrap",

            overflow:
              "hidden",

            textOverflow:
              "ellipsis",
          }}
        >
          {displayValue()}
        </button>
      )}

      {error ? (
        <div
          style={{
            position:
              "absolute",

            top:
              "100%",

            right:
              align === "right"
                ? 0
                : "auto",

            left:
              align === "left"
                ? 0
                : "auto",

            zIndex:
              50,

            marginTop:
              "3px",

            padding:
              "4px 6px",

            border:
              "1px solid #fecaca",

            borderRadius:
              "4px",

            background:
              "#ffffff",

            boxShadow:
              "0 4px 10px rgba(15,23,42,.10)",

            fontSize:
              "9px",

            lineHeight:
              1.25,

            color:
              "#dc2626",

            textAlign:
              align,

            width:
              "max-content",

            maxWidth:
              "180px",
          }}
        >
          {error}
        </div>
      ) : null}

      {isPending ? (
        <div
          style={{
            position:
              "absolute",

            inset: 0,

            background:
              "rgba(255,255,255,0.5)",

            pointerEvents:
              "none",
          }}
        />
      ) : null}
    </div>
  );
}