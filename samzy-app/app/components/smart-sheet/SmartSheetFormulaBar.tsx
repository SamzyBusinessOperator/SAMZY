"use client";

import {
  KeyboardEvent,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  setSmartSheetCellSame,
  updateSmartSheetCell,
} from "@/app/app/smart-sheets/[id]/actions";

type CellType =
  | "text"
  | "number"
  | "money"
  | "percent";

type FormulaSelection = {
  rowId: string;
  columnKey: string;
  address: string;
  displayValue: string;
  editValue: string;
  type: CellType;
  editable: boolean;
  allowSame: boolean;
};

type Props = {
  sheetId: string;
};

export default function SmartSheetFormulaBar({
  sheetId,
}: Props) {
  const router = useRouter();

  const [
    selection,
    setSelection,
  ] = useState<FormulaSelection | null>(
    null,
  );

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

  const [
    isPending,
    startTransition,
  ] = useTransition();

  useEffect(() => {
    function handleSelection(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<
          FormulaSelection | null
        >;

      const nextSelection =
        customEvent.detail ?? null;

      setSelection(nextSelection);

      setDraftValue(
        nextSelection?.editValue ?? "",
      );

      setError(null);
    }

    function handleSavedValue(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          rowId?: string;
          columnKey?: string;
          displayValue?: string;
          editValue?: string;
        }>;

      setSelection(
        (current) => {
          if (
            !current ||
            current.rowId !==
              customEvent.detail?.rowId ||
            current.columnKey !==
              customEvent.detail?.columnKey
          ) {
            return current;
          }

          const nextEditValue =
            customEvent.detail?.editValue ??
            customEvent.detail?.displayValue ??
            "";

          setDraftValue(
            nextEditValue,
          );

          return {
            ...current,
            displayValue:
              customEvent.detail
                ?.displayValue ?? "",
            editValue:
              nextEditValue,
          };
        },
      );
    }

    window.addEventListener(
      "samzy:smart-sheet-selection",
      handleSelection as EventListener,
    );

    window.addEventListener(
      "samzy:smart-sheet-value-saved",
      handleSavedValue as EventListener,
    );

    return () => {
      window.removeEventListener(
        "samzy:smart-sheet-selection",
        handleSelection as EventListener,
      );

      window.removeEventListener(
        "samzy:smart-sheet-value-saved",
        handleSavedValue as EventListener,
      );
    };
  }, []);

  function resetDraft() {
    setDraftValue(
      selection?.editValue ?? "",
    );

    setError(null);
  }

  function commitFormulaBarEdit() {
    if (
      !selection ||
      !selection.editable ||
      isPending
    ) {
      return;
    }

    const cleanedValue =
      draftValue.trim();

    setError(null);

    startTransition(
      async () => {
        try {
          if (
            selection.allowSame &&
            cleanedValue.toUpperCase() ===
              "SAME"
          ) {
            const result =
              await setSmartSheetCellSame({
                sheetId,
                rowId:
                  selection.rowId,
                columnKey:
                  selection.columnKey,
              });

            if (!result.ok) {
              setError(
                result.message ||
                  "Unable to keep the existing value.",
              );

              return;
            }

            setSelection(
              (current) =>
                current
                  ? {
                      ...current,
                      displayValue: "SAME",
                      editValue: "SAME",
                    }
                  : current,
            );

            setDraftValue("SAME");

            window.dispatchEvent(
              new CustomEvent(
                "samzy:smart-sheet-value-saved",
                {
                  detail: {
                    rowId:
                      selection.rowId,
                    columnKey:
                      selection.columnKey,
                    displayValue:
                      "SAME",
                    editValue:
                      "SAME",
                  },
                },
              ),
            );

            router.refresh();
            return;
          }

          let actionValue:
            | string
            | number;

          if (
            selection.type === "text"
          ) {
            actionValue =
              cleanedValue;
          } else {
            if (
              cleanedValue === ""
            ) {
              setError(
                selection.allowSame
                  ? 'Enter a number or type "SAME".'
                  : "Enter a value.",
              );

              return;
            }

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
                selection.allowSame
                  ? 'Enter a number or type "SAME".'
                  : "Enter a valid number.",
              );

              return;
            }

            actionValue =
              numericValue;
          }

          const result =
            await updateSmartSheetCell({
              sheetId,
              rowId:
                selection.rowId,
              columnKey:
                selection.columnKey,
              value:
                actionValue,
            });

          if (!result.ok) {
            setError(
              result.message ||
                "Unable to save.",
            );

            return;
          }

          const nextEditValue =
            String(actionValue);

          setSelection(
            (current) =>
              current
                ? {
                    ...current,
                    displayValue:
                      nextEditValue,
                    editValue:
                      nextEditValue,
                  }
                : current,
          );

          setDraftValue(
            nextEditValue,
          );

          window.dispatchEvent(
            new CustomEvent(
              "samzy:smart-sheet-value-saved",
              {
                detail: {
                  rowId:
                    selection.rowId,
                  columnKey:
                    selection.columnKey,
                  displayValue:
                    nextEditValue,
                  editValue:
                    nextEditValue,
                },
              },
            ),
          );

          router.refresh();
        } catch (saveError) {
          setError(
            saveError instanceof Error
              ? saveError.message
              : "Unable to save.",
          );
        }
      },
    );
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      event.key === "Enter"
    ) {
      event.preventDefault();

      commitFormulaBarEdit();
      return;
    }

    if (
      event.key === "Escape"
    ) {
      event.preventDefault();

      resetDraft();
      event.currentTarget.blur();
    }
  }

  const canEdit =
    Boolean(
      selection?.editable,
    );

  return (
    <div
      style={{
        flex: "0 0 auto",
        minHeight: "42px",
        padding: "5px 16px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <div
        aria-label="Selected cell"
        style={{
          width: "112px",
          height: "30px",
          padding: "0 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: "1px solid #dfe3e8",
          borderRadius: "6px",
          background: selection
            ? "#ffffff"
            : "#fafafa",
          fontSize: "12px",
          fontWeight: 650,
          color: selection
            ? "#101828"
            : "#98a2b3",
        }}
      >
        <span>
          {selection?.address ?? "—"}
        </span>

        <span
          aria-hidden="true"
          style={{
            color: "#98a2b3",
            fontSize: "10px",
          }}
        >
          ▼
        </span>
      </div>

      <div
        style={{
          width: "40px",
          height: "30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #dfe3e8",
          borderRadius: "6px",
          background: "#ffffff",
          color: "#344054",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontSize: "16px",
        }}
      >
        fx
      </div>

      <div
        style={{
          minWidth: 0,
          height: "30px",
          flex: "1 1 auto",
          position: "relative",
        }}
      >
        <input
          aria-label="Selected cell value"
          aria-invalid={
            Boolean(error)
          }
          value={
            selection
              ? draftValue
              : ""
          }
          placeholder={
            selection
              ? ""
              : "Select a cell to view or edit its value"
          }
          disabled={
            !selection ||
            !canEdit ||
            isPending
          }
          onChange={(
            event,
          ) => {
            setDraftValue(
              event.target.value,
            );

            setError(null);
          }}
          onKeyDown={
            handleKeyDown
          }
          onBlur={() => {
            if (
              selection &&
              canEdit &&
              draftValue !==
                selection.editValue &&
              !isPending
            ) {
              commitFormulaBarEdit();
            }
          }}
          title={
            error ||
            (!canEdit && selection
              ? "This is a calculated/read-only cell."
              : selection?.displayValue ||
                undefined)
          }
          style={{
            width: "100%",
            height: "30px",
            boxSizing: "border-box",
            padding: "0 12px",
            border:
              error
                ? "1px solid #f04438"
                : "1px solid #dfe3e8",
            borderRadius: "6px",
            background:
              !selection || !canEdit
                ? "#fafafa"
                : "#ffffff",
            color:
              selection
                ? "#101828"
                : "#98a2b3",
            fontSize: "12px",
            fontWeight:
              selection
                ? 500
                : 400,
            fontFamily: "inherit",
            outline: "none",
          }}
        />

        {error ? (
          <div
            role="alert"
            style={{
              position: "absolute",
              left: 0,
              top: "34px",
              zIndex: 120,
              maxWidth: "420px",
              padding: "5px 8px",
              border: "1px solid #fecaca",
              borderRadius: "5px",
              background: "#fff7f7",
              color: "#b42318",
              fontSize: "10px",
              lineHeight: 1.3,
              boxShadow:
                "0 4px 10px rgba(16,24,40,.08)",
            }}
          >
            {error}
          </div>
        ) : null}
      </div>

      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "0 10px",
          fontSize: "11px",
          color: "#475467",
        }}
      >
        <LegendDot
          color="#2e90fa"
          label="OCR Data"
        />

        <LegendDot
          color="#12b76a"
          label="Calculated"
        />

        <LegendDot
          color="#f79009"
          label="Manual"
        />

        <LegendDot
          color="#7f56d9"
          label="SAME"
        />
      </div>
    </div>
  );
}

function LegendDot({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "999px",
          background: color,
        }}
      />

      {label}
    </span>
  );
}