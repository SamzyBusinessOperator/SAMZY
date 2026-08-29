"use client";

import {
  DragEvent,
  MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import SmartSheetCell from "./SmartSheetCell";

import {
  clearSmartSheetCells,
  pasteSmartSheetCells,
} from "@/app/app/smart-sheets/[id]/actions";

import type {
  CellStateMap,
  SmartSheet,
  SmartSheetCellState,
  SmartSheetDriver,
  SmartSheetRow,
} from "./smart-sheet-types";

import {
  cellStateKey,
  truncateTwo,
} from "./smart-sheet-types";

type Props = {
  sheet: SmartSheet;
  rows: SmartSheetRow[];
  cellStates: SmartSheetCellState[];
};

type Align = "left" | "center" | "right";

type Tone =
  | "basic"
  | "cost"
  | "shopSem"
  | "shopCom"
  | "special"
  | "wholesale"
  | "restCom"
  | "public"
  | "vat"
  | "markup"
  | "transport";

type CellType = "text" | "number" | "money" | "percent";

type ColumnDefinition = {
  key: string;
  label: string;
  unit?: string;
  width: number;
  type: CellType;
  tone: Tone;
  align?: Align;
  editable?: boolean;
  calculated?: boolean;
  optional?: boolean;
  driverKey?:
    | "shop_sem_driver"
    | "shop_com_driver"
    | "special_driver"
    | "rest_com_driver"
    | "big_wholesale_driver";
  sameWhen?: SmartSheetDriver;
};

type SelectedCell = {
  rowId: string;
  rowIndex: number;
  columnKey: string;
  columnIndex: number;
  address: string;
  displayValue: string;
  editValue: string;
  type: CellType;
  editable: boolean;
  allowSame: boolean;
};

type CellPosition = {
  rowIndex: number;
  columnIndex: number;
};

type CellRange = {
  startRow: number;
  endRow: number;
  startColumn: number;
  endColumn: number;
};

const ROW_NUMBER_WIDTH = 38;
const PRODUCT_ROW_HEIGHT = 22;
const LETTER_ROW_HEIGHT = 24;
const GROUP_ROW_HEIGHT = 22;
const COLUMN_HEADER_HEIGHT = 38;

const CORE_COLUMNS: ColumnDefinition[] = [
  { key: "quantity", label: "Qty", width: 58, type: "number", tone: "basic", align: "right" },
  { key: "description", label: "Description", width: 210, type: "text", tone: "basic", align: "left" },
  { key: "pack_size", label: "Pack / Size", width: 96, type: "text", tone: "basic", align: "left" },

  { key: "supplier_cost_ex_vat", label: "Cost S/IVA", unit: "€", width: 86, type: "money", tone: "cost" },
  { key: "item_cost", label: "Item Cost", unit: "€", width: 86, type: "money", tone: "cost" },
  { key: "transported_cost", label: "Item W/T", unit: "€", width: 86, type: "money", tone: "cost", calculated: true },

  { key: "shop_sem_price", label: "Shop SEM", unit: "€", width: 86, type: "money", tone: "shopSem", driverKey: "shop_sem_driver", sameWhen: "price" },
  { key: "c_ivacp_price", label: "C/IVACP", unit: "€", width: 86, type: "money", tone: "shopSem", calculated: true },
  { key: "shop_com_price", label: "Shop COM", unit: "€", width: 86, type: "money", tone: "shopCom", driverKey: "shop_com_driver", sameWhen: "price" },
  { key: "special_price", label: "Special", unit: "€", width: 86, type: "money", tone: "special", driverKey: "special_driver", sameWhen: "price" },
  { key: "big_wholesale_price", label: "Big Wholesale", unit: "€", width: 94, type: "money", tone: "wholesale", driverKey: "big_wholesale_driver", sameWhen: "price" },
  { key: "rest_com_price", label: "Rest COM", unit: "€", width: 86, type: "money", tone: "restCom", driverKey: "rest_com_driver", sameWhen: "price" },
  { key: "public_price", label: "Public", unit: "€", width: 86, type: "money", tone: "public" },

  { key: "vat_rate", label: "IVA", unit: "%", width: 78, type: "percent", tone: "vat" },

  { key: "shop_sem_markup", label: "Shop SEM", unit: "%", width: 84, type: "percent", tone: "markup", driverKey: "shop_sem_driver", sameWhen: "markup" },
  { key: "shop_com_markup", label: "Shop COM", unit: "%", width: 84, type: "percent", tone: "markup", driverKey: "shop_com_driver", sameWhen: "markup" },
  { key: "special_markup", label: "Special", unit: "%", width: 84, type: "percent", tone: "markup", driverKey: "special_driver", sameWhen: "markup" },
  { key: "rest_com_markup", label: "Rest COM", unit: "%", width: 84, type: "percent", tone: "markup", driverKey: "rest_com_driver", sameWhen: "markup" },
  { key: "big_wholesale_markup", label: "Big Wholesale", unit: "%", width: 90, type: "percent", tone: "markup", driverKey: "big_wholesale_driver", sameWhen: "markup" },

  { key: "transport_rate", label: "Transport", unit: "%", width: 82, type: "percent", tone: "transport", calculated: true },
];

const OPTIONAL_COLUMNS: ColumnDefinition[] = [
  { key: "sku_snapshot", label: "SKU", width: 110, type: "text", tone: "basic", align: "left", optional: true },
  { key: "barcode_snapshot", label: "Barcode", width: 120, type: "text", tone: "basic", align: "left", optional: true },
  { key: "notes", label: "Notes", width: 180, type: "text", tone: "basic", align: "left", optional: true },
];

const ALL_COLUMNS = [...CORE_COLUMNS, ...OPTIONAL_COLUMNS];

export default function SmartSheetGrid({
  sheet,
  rows,
  cellStates,
}: Props) {
  const gridRef = useRef<HTMLDivElement | null>(null);

  const [columnOrder, setColumnOrder] = useState<string[]>(
    CORE_COLUMNS.map((column) => column.key),
  );
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [rangeAnchor, setRangeAnchor] = useState<CellPosition | null>(null);
  const [rangeEnd, setRangeEnd] = useState<CellPosition | null>(null);
  const isRangeDraggingRef = useRef(false);

  const [draggedColumnKey, setDraggedColumnKey] = useState<string | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [pasteMessage, setPasteMessage] = useState<string | null>(null);

  const stateMap = useMemo<CellStateMap>(() => {
    const map: CellStateMap = {};
    for (const state of cellStates) {
      map[cellStateKey(state.row_id, state.column_key)] = state;
    }
    return map;
  }, [cellStates]);

  const visibleColumns = useMemo(
    () =>
      columnOrder
        .map((key) => ALL_COLUMNS.find((column) => column.key === key))
        .filter((column): column is ColumnDefinition => Boolean(column)),
    [columnOrder],
  );

  const availableColumns = OPTIONAL_COLUMNS.filter(
    (column) => !columnOrder.includes(column.key),
  );

  const selectedRange = useMemo<CellRange | null>(() => {
    if (!rangeAnchor || !rangeEnd) {
      return null;
    }

    return {
      startRow: Math.min(rangeAnchor.rowIndex, rangeEnd.rowIndex),
      endRow: Math.max(rangeAnchor.rowIndex, rangeEnd.rowIndex),
      startColumn: Math.min(rangeAnchor.columnIndex, rangeEnd.columnIndex),
      endColumn: Math.max(rangeAnchor.columnIndex, rangeEnd.columnIndex),
    };
  }, [rangeAnchor, rangeEnd]);

  function getState(rowId: string, columnKey: string) {
    return stateMap[cellStateKey(rowId, columnKey)];
  }

  function selectCell(
    row: SmartSheetRow,
    rowIndex: number,
    columnKey: string,
    columnIndex: number,
    options?: {
      extendRange?: boolean;
      preserveAnchor?: boolean;
    },
  ) {
    const column = visibleColumns[columnIndex];
    if (!column) return;

    const state = getState(row.id, columnKey);
    const rawValue = getRowValue(row, columnKey);
    const isSame = state?.mode === "same";

    const displayValue =
      isSame
        ? "SAME"
        : formulaBarValue(rawValue, column.type);

    const editValue =
      isSame
        ? "SAME"
        : rawValue === null || rawValue === undefined
          ? ""
          : String(rawValue);

    const driver =
      column.driverKey
        ? (row[column.driverKey] as SmartSheetDriver)
        : null;

    const allowSame =
      column.driverKey && column.sameWhen
        ? driver === column.sameWhen
        : column.key === "item_cost" ||
          column.key === "public_price";

    const nextSelection: SelectedCell = {
      rowId: row.id,
      rowIndex,
      columnKey,
      columnIndex,
      address: `${columnLetter(columnIndex)}${rowIndex + 1}`,
      displayValue,
      editValue,
      type: column.type,
      editable: column.editable ?? true,
      allowSame,
    };

    setSelectedCell(nextSelection);

    const nextPosition: CellPosition = {
      rowIndex,
      columnIndex,
    };

    if (
      options?.extendRange &&
      rangeAnchor
    ) {
      setRangeEnd(nextPosition);
    } else if (
      options?.preserveAnchor &&
      rangeAnchor
    ) {
      setRangeEnd(nextPosition);
    } else {
      setRangeAnchor(nextPosition);
      setRangeEnd(nextPosition);
    }

    window.dispatchEvent(
      new CustomEvent("samzy:smart-sheet-selection", {
        detail: nextSelection,
      }),
    );
  }

  function moveSelection(
    rowIndex: number,
    columnIndex: number,
  ) {
    if (
      rows.length === 0 ||
      visibleColumns.length === 0
    ) {
      return;
    }

    const nextRowIndex = Math.max(
      0,
      Math.min(rows.length - 1, rowIndex),
    );

    const nextColumnIndex = Math.max(
      0,
      Math.min(visibleColumns.length - 1, columnIndex),
    );

    const nextRow = rows[nextRowIndex];
    const nextColumn = visibleColumns[nextColumnIndex];

    selectCell(
      nextRow,
      nextRowIndex,
      nextColumn.key,
      nextColumnIndex,
    );

    requestAnimationFrame(() => {
      const element = gridRef.current?.querySelector(
        `[data-sheet-cell="${nextRow.id}:${nextColumn.key}"]`,
      ) as HTMLElement | null;

      element?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });

      gridRef.current?.focus({
        preventScroll: true,
      });
    });
  }

  function requestEdit(
    initialValue?: string,
  ) {
    if (
      !selectedCell ||
      !selectedCell.editable
    ) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        "samzy:smart-sheet-edit",
        {
          detail: {
            rowId: selectedCell.rowId,
            columnKey: selectedCell.columnKey,
            initialValue,
          },
        },
      ),
    );
  }

  async function clearSelectedCells() {
    if (
      !selectedCell ||
      isClearing ||
      isPasting
    ) {
      return;
    }

    const range =
      selectedRange ?? {
        startRow:
          selectedCell.rowIndex,
        endRow:
          selectedCell.rowIndex,
        startColumn:
          selectedCell.columnIndex,
        endColumn:
          selectedCell.columnIndex,
      };

    const cells: {
      rowId: string;
      columnKey: string;
    }[] = [];

    for (
      let rowIndex =
        range.startRow;
      rowIndex <=
        range.endRow;
      rowIndex += 1
    ) {
      const row =
        rows[rowIndex];

      if (!row) {
        continue;
      }

      for (
        let columnIndex =
          range.startColumn;
        columnIndex <=
          range.endColumn;
        columnIndex += 1
      ) {
        const column =
          visibleColumns[
            columnIndex
          ];

        if (!column) {
          continue;
        }

        cells.push({
          rowId:
            row.id,
          columnKey:
            column.key,
        });
      }
    }

    if (cells.length === 0) {
      setPasteMessage(
        "The selected range does not contain editable cells.",
      );
      return;
    }

    setIsClearing(true);
    setPasteMessage(null);

    try {
      const result =
        await clearSmartSheetCells({
          sheetId:
            sheet.id,
          cells,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ||
            "Unable to clear cells.",
        );
        return;
      }

      setPasteMessage(
        result.message ||
          `${cells.length} cells cleared.`,
      );

      /*
       * Keep the same active/range selection after the server
       * refresh so Delete can be used repeatedly like a normal
       * spreadsheet command.
       */
      window.location.reload();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to clear cells.",
      );
    } finally {
      setIsClearing(false);
    }
  }

  function handleGridKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
  ) {
    if (
      !selectedCell ||
      rows.length === 0 ||
      visibleColumns.length === 0
    ) {
      return;
    }

    const target = event.target as HTMLElement | null;

    if (
      target &&
      (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
    ) {
      return;
    }

    if (
      event.key === "Delete" ||
      event.key === "Backspace"
    ) {
      event.preventDefault();

      void clearSelectedCells();

      return;
    }

    if (
      event.key === "Enter" ||
      event.key === "F2"
    ) {
      event.preventDefault();
      requestEdit();
      return;
    }

    const isPrintableCharacter =
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey;

    if (
      isPrintableCharacter &&
      selectedCell.editable
    ) {
      event.preventDefault();
      requestEdit(event.key);
      return;
    }

    let nextRowIndex = selectedCell.rowIndex;
    let nextColumnIndex = selectedCell.columnIndex;

    if (event.key === "ArrowUp") {
      nextRowIndex -= 1;
    } else if (event.key === "ArrowDown") {
      nextRowIndex += 1;
    } else if (event.key === "ArrowLeft") {
      nextColumnIndex -= 1;
    } else if (event.key === "ArrowRight") {
      nextColumnIndex += 1;
    } else if (event.key === "Tab") {
      nextColumnIndex += event.shiftKey ? -1 : 1;
    } else {
      return;
    }

    event.preventDefault();
    moveSelection(nextRowIndex, nextColumnIndex);
  }

  useEffect(() => {
    function handleEditCommitted(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          rowId?: string;
          columnKey?: string;
          moveDown?: boolean;
        }>;

      if (!customEvent.detail?.moveDown) {
        return;
      }

      const current = selectedCell;

      if (
        !current ||
        current.rowId !== customEvent.detail?.rowId ||
        current.columnKey !== customEvent.detail?.columnKey
      ) {
        return;
      }

      moveSelection(
        current.rowIndex + 1,
        current.columnIndex,
      );
    }

    function stopRangeDrag() {
      isRangeDraggingRef.current = false;
    }

    window.addEventListener(
      "samzy:smart-sheet-edit-committed",
      handleEditCommitted as EventListener,
    );

    window.addEventListener(
      "mouseup",
      stopRangeDrag,
    );

    return () => {
      window.removeEventListener(
        "samzy:smart-sheet-edit-committed",
        handleEditCommitted as EventListener,
      );

      window.removeEventListener(
        "mouseup",
        stopRangeDrag,
      );
    };
  }, [
    selectedCell,
    rows,
    visibleColumns,
  ]);

  function handleGridCopy(
    event: React.ClipboardEvent<HTMLDivElement>,
  ) {
    if (!selectedCell) {
      return;
    }

    event.preventDefault();

    if (!selectedRange) {
      event.clipboardData.setData(
        "text/plain",
        selectedCell.editValue,
      );
      return;
    }

    const lines: string[] = [];

    for (
      let rowIndex = selectedRange.startRow;
      rowIndex <= selectedRange.endRow;
      rowIndex += 1
    ) {
      const values: string[] = [];

      for (
        let columnIndex = selectedRange.startColumn;
        columnIndex <= selectedRange.endColumn;
        columnIndex += 1
      ) {
        const row = rows[rowIndex];
        const column = visibleColumns[columnIndex];

        if (!row || !column) {
          values.push("");
          continue;
        }

        const state = getState(
          row.id,
          column.key,
        );

        if (state?.mode === "same") {
          values.push("SAME");
          continue;
        }

        const rawValue = getRowValue(
          row,
          column.key,
        );

        values.push(
          rawValue === null ||
          rawValue === undefined
            ? ""
            : String(rawValue),
        );
      }

      lines.push(values.join("\t"));
    }

    event.clipboardData.setData(
      "text/plain",
      lines.join("\n"),
    );
  }

  async function handleGridPaste(
    event: React.ClipboardEvent<HTMLDivElement>,
  ) {
    if (
      !selectedCell ||
      isPasting
    ) {
      return;
    }

    const clipboardText =
      event.clipboardData.getData(
        "text/plain",
      );

    if (!clipboardText) {
      return;
    }

    event.preventDefault();

    /*
     * Excel / Google Sheets clipboard format:
     *
     * columns -> TAB
     * rows    -> newline
     *
     * Do not trim the whole payload because leading/trailing
     * empty cells are meaningful in a spreadsheet matrix.
     */
    const normalizedText =
      clipboardText.replace(
        /\r\n?/g,
        "\n",
      );

    let clipboardRows =
      normalizedText.split("\n");

    /*
     * Spreadsheet apps commonly append one final newline.
     * Remove only that synthetic final row.
     */
    if (
      clipboardRows.length > 1 &&
      clipboardRows[
        clipboardRows.length - 1
      ] === ""
    ) {
      clipboardRows =
        clipboardRows.slice(
          0,
          -1,
        );
    }

    const matrix =
      clipboardRows.map(
        (line) =>
          line.split("\t"),
      );

    if (
      matrix.length === 0 ||
      matrix.every(
        (line) =>
          line.length === 0,
      )
    ) {
      return;
    }

    const startRowIndex =
      selectedCell.rowIndex;

    const startColumnIndex =
      selectedCell.columnIndex;

    const cells: {
      rowId: string;
      columnKey: string;
      value: string;
    }[] = [];

    let lastDestinationRow =
      startRowIndex;

    let lastDestinationColumn =
      startColumnIndex;

    for (
      let pasteRowIndex = 0;
      pasteRowIndex < matrix.length;
      pasteRowIndex += 1
    ) {
      const destinationRowIndex =
        startRowIndex +
        pasteRowIndex;

      const destinationRow =
        rows[
          destinationRowIndex
        ];

      if (!destinationRow) {
        break;
      }

      const sourceRow =
        matrix[
          pasteRowIndex
        ];

      /*
       * Paste source values into the next editable Smart Sheet
       * columns. Read-only / calculated columns do NOT consume a
       * source value.
       *
       * Example starting at G when H is calculated:
       *
       *   source: 1.11 | 2.11 | 3.11
       *   target: G    | I    | J
       *
       * This preserves every copied value while keeping calculated
       * columns protected.
       */
      let destinationColumnIndex =
        startColumnIndex;

      for (
        let pasteColumnIndex = 0;
        pasteColumnIndex <
          sourceRow.length;
        pasteColumnIndex += 1
      ) {
        /*
         * Advance past calculated/read-only columns without
         * advancing the source clipboard position.
         */
        while (
          destinationColumnIndex <
            visibleColumns.length &&
          visibleColumns[
            destinationColumnIndex
          ]?.editable === false
        ) {
          destinationColumnIndex += 1;
        }

        const destinationColumn =
          visibleColumns[
            destinationColumnIndex
          ];

        if (!destinationColumn) {
          break;
        }

        cells.push({
          rowId:
            destinationRow.id,
          columnKey:
            destinationColumn.key,
          value:
            sourceRow[
              pasteColumnIndex
            ] ?? "",
        });

        lastDestinationRow =
          Math.max(
            lastDestinationRow,
            destinationRowIndex,
          );

        lastDestinationColumn =
          Math.max(
            lastDestinationColumn,
            destinationColumnIndex,
          );

        /*
         * Move to the next physical column for the next source
         * value. The while-loop above will skip any calculated
         * columns encountered there.
         */
        destinationColumnIndex += 1;
      }
    }

    if (cells.length === 0) {
      setPasteMessage(
        "The pasted range does not contain editable Smart Sheet cells.",
      );

      return;
    }

    setIsPasting(true);
    setPasteMessage(null);

    try {
      const result =
        await pasteSmartSheetCells({
          sheetId:
            sheet.id,
          cells,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ||
            "Unable to paste cells.",
        );

        return;
      }

      /*
       * Highlight the destination rectangle after a successful
       * paste. Keep the original top-left cell as the active cell.
       */
      setRangeAnchor({
        rowIndex:
          startRowIndex,
        columnIndex:
          startColumnIndex,
      });

      setRangeEnd({
        rowIndex:
          lastDestinationRow,
        columnIndex:
          lastDestinationColumn,
      });

      setPasteMessage(
        result.message ||
          `${cells.length} cells pasted.`,
      );

      /*
       * Server actions revalidate the Smart Sheet route.
       * Ask the page to refresh its server data after the batch
       * completes without issuing per-cell browser requests.
       */
      window.dispatchEvent(
        new CustomEvent(
          "samzy:smart-sheet-batch-pasted",
          {
            detail: {
              sheetId:
                sheet.id,

              startRowIndex,
              startColumnIndex,

              endRowIndex:
                lastDestinationRow,

              endColumnIndex:
                lastDestinationColumn,

              count:
                cells.length,
            },
          },
        ),
      );

      /*
       * Refresh the current Next.js route. This keeps the grid,
       * totals, formula bar and calculated values synchronized
       * with the server after one batch operation.
       */
      window.location.reload();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to paste cells.",
      );
    } finally {
      setIsPasting(false);
    }
  }

  function clearSelection() {
    setSelectedCell(null);
    setRangeAnchor(null);
    setRangeEnd(null);

    window.dispatchEvent(
      new CustomEvent("samzy:smart-sheet-selection", {
        detail: null,
      }),
    );
  }

  function handleColumnDrop(targetKey: string) {
    if (!draggedColumnKey || draggedColumnKey === targetKey) {
      setDraggedColumnKey(null);
      return;
    }

    setColumnOrder((current) => {
      const next = [...current];
      const from = next.indexOf(draggedColumnKey);
      const to = next.indexOf(targetKey);

      if (from === -1 || to === -1) return current;

      next.splice(from, 1);
      next.splice(to, 0, draggedColumnKey);
      return next;
    });

    clearSelection();
    setDraggedColumnKey(null);
  }

  function addColumn(key: string) {
    setColumnOrder((current) =>
      current.includes(key) ? current : [...current, key],
    );
    setShowAddColumn(false);
  }

  function removeOptionalColumn(key: string) {
    setColumnOrder((current) => current.filter((item) => item !== key));

    if (selectedCell?.columnKey === key) {
      clearSelection();
    }
  }

  const totals = useMemo(() => {
    const weightedTotal = (key: string) =>
      rows.reduce((sum, row) => {
        const amount = Number(getRowValue(row, key) ?? 0);
        const quantity = Number(row.quantity ?? 0);
        return Number.isFinite(amount) && Number.isFinite(quantity)
          ? sum + amount * quantity
          : sum;
      }, 0);

    const average = (key: string) => {
      const values = rows
        .map((row) => Number(getRowValue(row, key)))
        .filter((value) => Number.isFinite(value));

      return values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0;
    };

    return {
      quantity: rows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0),
      supplier_cost_ex_vat: weightedTotal("supplier_cost_ex_vat"),
      item_cost: weightedTotal("item_cost"),
      transported_cost: weightedTotal("transported_cost"),
      shop_sem_price: weightedTotal("shop_sem_price"),
      c_ivacp_price: weightedTotal("c_ivacp_price"),
      shop_com_price: weightedTotal("shop_com_price"),
      special_price: weightedTotal("special_price"),
      big_wholesale_price: weightedTotal("big_wholesale_price"),
      rest_com_price: weightedTotal("rest_com_price"),
      public_price: weightedTotal("public_price"),
      vat_rate: average("vat_rate"),
      shop_sem_markup: average("shop_sem_markup"),
      shop_com_markup: average("shop_com_markup"),
      special_markup: average("special_markup"),
      rest_com_markup: average("rest_com_markup"),
      big_wholesale_markup: average("big_wholesale_markup"),
      transport_rate: average("transport_rate"),
    } as Record<string, number>;
  }, [rows]);

  const groupRuns = buildGroupRuns(visibleColumns);

  return (
    <div style={{ position: "relative", minWidth: 0 }}>
      <style>{`
        .samzy-smart-sheet-grid {
          scrollbar-width: auto;
          scrollbar-color: #98a2b3 #f2f4f7;
        }

        .samzy-smart-sheet-grid::-webkit-scrollbar {
          width: 14px;
          height: 14px;
        }

        .samzy-smart-sheet-grid::-webkit-scrollbar-track {
          background: #f2f4f7;
          border-left: 1px solid #aeb6c2;
          border-top: 1px solid #aeb6c2;
        }

        .samzy-smart-sheet-grid::-webkit-scrollbar-thumb {
          background: #98a2b3;
          border-radius: 7px;
          border: 3px solid #f2f4f7;
        }

        .samzy-smart-sheet-grid::-webkit-scrollbar-thumb:hover {
          background: #667085;
        }

        .samzy-column-dragging {
          opacity: .55;
        }
      `}</style>

      <div
        style={{
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 6,
          padding: "4px 6px",
          border: "1px solid #aeb6c2",
          borderBottom: 0,
          background: "#f8fafc",
        }}
      >
        <span
          style={{
            marginRight: "auto",
            color: "#667085",
            fontSize: 10,
          }}
        >
          Drag any column header to reorder
        </span>

        {isPasting || isClearing ? (
          <span
            style={{
              color: "#175cd3",
              fontSize: 10,
              fontWeight: 650,
              whiteSpace: "nowrap",
            }}
          >
            {isClearing ? "Clearing…" : "Pasting…"}
          </span>
        ) : pasteMessage ? (
          <span
            title={pasteMessage}
            style={{
              maxWidth: 260,
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: pasteMessage
                .toLowerCase()
                .includes("unable") ||
                pasteMessage
                  .toLowerCase()
                  .includes("does not")
                ? "#b42318"
                : "#027a48",
              fontSize: 10,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {pasteMessage}
          </span>
        ) : null}

        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowAddColumn((value) => !value)}
            style={toolbarButtonStyle}
          >
            + Add Column
          </button>

          {showAddColumn ? (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 30,
                zIndex: 100,
                width: 190,
                padding: 6,
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                boxShadow: "0 8px 20px rgba(15,23,42,.12)",
              }}
            >
              {availableColumns.length ? (
                availableColumns.map((column) => (
                  <button
                    key={column.key}
                    type="button"
                    onClick={() => addColumn(column.key)}
                    style={menuButtonStyle}
                  >
                    + {column.label}
                  </button>
                ))
              ) : (
                <div style={{ padding: 8, fontSize: 11, color: "#667085" }}>
                  All available columns are visible.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={gridRef}
        className="samzy-smart-sheet-grid"
        role="grid"
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        onCopy={handleGridCopy}
        onPaste={handleGridPaste}
        style={{
          width: "100%",
          minWidth: 0,
          height: "calc(100vh - 360px)",
          minHeight: 330,
          maxHeight: 620,
          overflow: "auto",
          background: "#ffffff",
          outline: "none",
          border: "1px solid #aeb6c2",
        }}
      >
        <table
          style={{
            width: "max-content",
            minWidth: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            tableLayout: "fixed",
            color: "#111827",
            fontSize: 11,
            lineHeight: "15px",
            background: "#ffffff",
          }}
        >
          <thead>
            <tr>
              <CornerHeader />
              {visibleColumns.map((column, columnIndex) => (
                <LetterHeader
                  key={column.key}
                  letter={columnLetter(columnIndex)}
                  width={column.width}
                  selected={selectedCell?.columnKey === column.key}
                  draggable
                  dragging={draggedColumnKey === column.key}
                  onDragStart={() => setDraggedColumnKey(column.key)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleColumnDrop(column.key)}
                  onDragEnd={() => setDraggedColumnKey(null)}
                  removable={Boolean(column.optional)}
                  onRemove={() => removeOptionalColumn(column.key)}
                />
              ))}
            </tr>

            <tr>
              <RowHeaderSpacer top={LETTER_ROW_HEIGHT} />
              {groupRuns.map((run) => (
                <GroupHeader
                  key={`${run.group}-${run.start}`}
                  colSpan={run.count}
                  tone={run.tone}
                >
                  {run.label}
                </GroupHeader>
              ))}
            </tr>

            <tr>
              <RowNumberHeader />
              {visibleColumns.map((column) => (
                <ColumnHeader
                  key={column.key}
                  width={column.width}
                  tone={column.tone}
                >
                  {column.label}
                  {column.unit ? <HeaderUnit>{column.unit}</HeaderUnit> : null}
                </ColumnHeader>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id} style={{ height: PRODUCT_ROW_HEIGHT }}>
                <RowNumberCell selected={selectedCell?.rowIndex === rowIndex}>
                  {row.row_number}
                </RowNumberCell>

                {visibleColumns.map((column, columnIndex) => (
                  <SelectableGridCell
                    key={column.key}
                    row={row}
                    rowIndex={rowIndex}
                    columnKey={column.key}
                    columnIndex={columnIndex}
                    width={column.width}
                    tone={column.tone}
                    align={column.align ?? (column.type === "text" ? "left" : "right")}
                    calculated={Boolean(column.calculated)}
                    selected={
                      selectedCell?.rowId === row.id &&
                      selectedCell?.columnKey === column.key
                    }
                    inRange={
                      selectedRange
                        ? rowIndex >= selectedRange.startRow &&
                          rowIndex <= selectedRange.endRow &&
                          columnIndex >= selectedRange.startColumn &&
                          columnIndex <= selectedRange.endColumn
                        : false
                    }
                    onSelect={selectCell}
                    onRangeDragStart={(
                      nextRow,
                      nextRowIndex,
                      nextColumnKey,
                      nextColumnIndex,
                      extendRange,
                    ) => {
                      isRangeDraggingRef.current = true;

                      selectCell(
                        nextRow,
                        nextRowIndex,
                        nextColumnKey,
                        nextColumnIndex,
                        {
                          extendRange,
                        },
                      );
                    }}
                    onRangeDragEnter={(
                      nextRow,
                      nextRowIndex,
                      nextColumnKey,
                      nextColumnIndex,
                    ) => {
                      if (!isRangeDraggingRef.current) {
                        return;
                      }

                      selectCell(
                        nextRow,
                        nextRowIndex,
                        nextColumnKey,
                        nextColumnIndex,
                        {
                          extendRange: true,
                          preserveAnchor: true,
                        },
                      );
                    }}
                  >
                    {renderCell({
                      sheet,
                      row,
                      column,
                      state: getState(row.id, column.key),
                    })}
                  </SelectableGridCell>
                ))}
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <RowNumberFooter>{rows.length}</RowNumberFooter>

              {visibleColumns.map((column) => (
                <FooterCell key={column.key} tone={column.tone}>
                  {footerForColumn(column, totals, rows.length)}
                </FooterCell>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function renderCell({
  sheet,
  row,
  column,
  state,
}: {
  sheet: SmartSheet;
  row: SmartSheetRow;
  column: ColumnDefinition;
  state?: SmartSheetCellState;
}) {
  const value = getRowValue(row, column.key);

  if (column.driverKey && column.sameWhen) {
    const driver = row[column.driverKey] as SmartSheetDriver;

    return (
      <DriverCell
        sheetId={sheet.id}
        rowId={row.id}
        columnKey={column.key}
        value={typeof value === "number" ? value : null}
        state={state}
        type={column.type as "money" | "percent"}
        driver={driver}
        sameWhen={column.sameWhen}
      />
    );
  }

  return (
    <SmartSheetCell
      sheetId={sheet.id}
      rowId={row.id}
      columnKey={column.key}
      value={value}
      state={state}
      type={column.type}
      align={column.align === "left" ? "left" : column.align === "right" ? "right" : undefined}
      editable={column.editable ?? true}
      allowSame={column.key === "item_cost" || column.key === "public_price"}
    />
  );
}

type SelectHandler = (
  row: SmartSheetRow,
  rowIndex: number,
  columnKey: string,
  columnIndex: number,
  options?: {
    extendRange?: boolean;
    preserveAnchor?: boolean;
  },
) => void;

type RangeDragStartHandler = (
  row: SmartSheetRow,
  rowIndex: number,
  columnKey: string,
  columnIndex: number,
  extendRange: boolean,
) => void;

type RangeDragEnterHandler = (
  row: SmartSheetRow,
  rowIndex: number,
  columnKey: string,
  columnIndex: number,
) => void;

function SelectableGridCell({
  children,
  row,
  rowIndex,
  columnKey,
  columnIndex,
  width,
  tone = "basic",
  align = "right",
  calculated = false,
  selected = false,
  inRange = false,
  onSelect,
  onRangeDragStart,
  onRangeDragEnter,
}: {
  children: React.ReactNode;
  row: SmartSheetRow;
  rowIndex: number;
  columnKey: string;
  columnIndex: number;
  width: number;
  tone?: Tone;
  align?: Align;
  calculated?: boolean;
  selected?: boolean;
  inRange?: boolean;
  onSelect: SelectHandler;
  onRangeDragStart: RangeDragStartHandler;
  onRangeDragEnter: RangeDragEnterHandler;
}) {
  function handleMouseDown(
    event: MouseEvent<HTMLTableCellElement>,
  ) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    onRangeDragStart(
      row,
      rowIndex,
      columnKey,
      columnIndex,
      event.shiftKey,
    );

    const grid =
      event.currentTarget.closest(
        '[role="grid"]',
      ) as HTMLElement | null;

    grid?.focus({
      preventScroll: true,
    });
  }

  function handleMouseEnter() {
    onRangeDragEnter(
      row,
      rowIndex,
      columnKey,
      columnIndex,
    );
  }

  return (
    <td
      data-sheet-cell={`${row.id}:${columnKey}`}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      style={{
        position: "relative",
        width,
        minWidth: width,
        maxWidth: width,
        height: PRODUCT_ROW_HEIGHT,
        padding: "1px 4px",
        boxSizing: "border-box",
        borderRight: "1px solid #aeb6c2",
        borderBottom: "1px solid #aeb6c2",
        background: inRange
          ? `linear-gradient(rgba(46,144,250,.10), rgba(46,144,250,.10)), ${toneBackground(tone, false)}`
          : toneBackground(tone, false),
        verticalAlign: "middle",
        textAlign: align,
        color: calculated ? "#334155" : "#111827",
        overflow: "hidden",
        boxShadow: calculated
          ? "inset 0 0 0 999px rgba(248,250,252,.20)"
          : "none",
        zIndex: selected ? 7 : inRange ? 5 : 1,
        userSelect: "none",
      }}
    >
      {children}

      {inRange ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            boxSizing: "border-box",
            border: selected
              ? "2px solid #2e90fa"
              : "1px solid rgba(46,144,250,.45)",
            zIndex: 50,
          }}
        />
      ) : null}

      {selected ? (
        <>
          {!inRange ? (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                boxSizing: "border-box",
                border: "2px solid #2e90fa",
                zIndex: 50,
              }}
            />
          ) : null}

          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 6,
              height: 6,
              right: -3,
              bottom: -3,
              background: "#2e90fa",
              border: "1px solid #ffffff",
              boxSizing: "border-box",
              pointerEvents: "none",
              zIndex: 51,
            }}
          />
        </>
      ) : null}
    </td>
  );
}

function DriverCell({
  sheetId,
  rowId,
  columnKey,
  value,
  state,
  type,
  driver,
  sameWhen,
}: {
  sheetId: string;
  rowId: string;
  columnKey: string;
  value: number | null;
  state?: SmartSheetCellState;
  type: "money" | "percent";
  driver: SmartSheetDriver;
  sameWhen: SmartSheetDriver;
}) {
  return (
    <SmartSheetCell
      sheetId={sheetId}
      rowId={rowId}
      columnKey={columnKey}
      value={value}
      state={state}
      type={type}
      allowSame={driver === sameWhen}
    />
  );
}

function getRowValue(
  row: SmartSheetRow,
  columnKey: string,
): string | number | null {
  switch (columnKey) {
    case "quantity": return row.quantity;
    case "description": return row.description;
    case "pack_size": return row.pack_size;
    case "sku_snapshot": return row.sku_snapshot;
    case "barcode_snapshot": return row.barcode_snapshot;
    case "notes": return row.notes;
    case "supplier_cost_ex_vat": return row.supplier_cost_ex_vat;
    case "item_cost": return row.item_cost;
    case "transported_cost": return row.transported_cost;
    case "shop_sem_price": return row.shop_sem_price;
    case "c_ivacp_price": return row.c_ivacp_price;
    case "shop_com_price": return row.shop_com_price;
    case "special_price": return row.special_price;
    case "big_wholesale_price": return row.big_wholesale_price;
    case "rest_com_price": return row.rest_com_price;
    case "public_price": return row.public_price;
    case "vat_rate": return row.vat_rate;
    case "shop_sem_markup": return row.shop_sem_markup;
    case "shop_com_markup": return row.shop_com_markup;
    case "special_markup": return row.special_markup;
    case "rest_com_markup": return row.rest_com_markup;
    case "big_wholesale_markup": return row.big_wholesale_markup;
    case "transport_rate": return row.transport_rate;
    default: return null;
  }
}

function formulaBarValue(
  value: string | number | null,
  type: CellType,
) {
  if (value === null || value === undefined) return "";
  if (type === "text") return String(value);
  return truncateTwo(value);
}

function columnLetter(index: number) {
  let result = "";
  let value = index + 1;

  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }

  return result;
}

function CornerHeader() {
  return (
    <th
      style={{
        position: "sticky",
        top: 0,
        left: 0,
        zIndex: 40,
        width: ROW_NUMBER_WIDTH,
        minWidth: ROW_NUMBER_WIDTH,
        maxWidth: ROW_NUMBER_WIDTH,
        height: LETTER_ROW_HEIGHT,
        padding: 0,
        background: "#f3f4f6",
        borderRight: "1px solid #aeb6c2",
        borderBottom: "1px solid #aeb6c2",
      }}
    />
  );
}

function LetterHeader({
  letter,
  width,
  selected,
  draggable,
  dragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  removable,
  onRemove,
}: {
  letter: string;
  width: number;
  selected: boolean;
  draggable: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragOver: (event: DragEvent<HTMLTableCellElement>) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  removable: boolean;
  onRemove: () => void;
}) {
  return (
    <th
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={dragging ? "samzy-column-dragging" : undefined}
      title="Drag to move column"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        width,
        minWidth: width,
        maxWidth: width,
        height: LETTER_ROW_HEIGHT,
        padding: "0 4px",
        boxSizing: "border-box",
        background: selected ? "#eaf2ff" : "#f3f4f6",
        borderRight: "1px solid #aeb6c2",
        borderBottom: selected ? "2px solid #2e90fa" : "1px solid #aeb6c2",
        textAlign: "center",
        fontSize: 10,
        lineHeight: 1,
        fontWeight: selected ? 750 : 600,
        color: selected ? "#175cd3" : "#475467",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <span>{letter}</span>
      {removable ? (
        <button
          type="button"
          title="Remove optional column"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          style={{
            position: "absolute",
            right: 3,
            top: 3,
            width: 16,
            height: 16,
            border: 0,
            background: "transparent",
            color: "#98a2b3",
            fontSize: 12,
            lineHeight: "16px",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      ) : null}
    </th>
  );
}

function RowHeaderSpacer({ top }: { top: number }) {
  return (
    <th
      style={{
        position: "sticky",
        top,
        left: 0,
        zIndex: 39,
        width: ROW_NUMBER_WIDTH,
        minWidth: ROW_NUMBER_WIDTH,
        maxWidth: ROW_NUMBER_WIDTH,
        height: GROUP_ROW_HEIGHT,
        padding: 0,
        background: "#f8fafc",
        borderRight: "1px solid #aeb6c2",
        borderBottom: "1px solid #aeb6c2",
      }}
    />
  );
}

function GroupHeader({
  children,
  colSpan,
  tone,
}: {
  children: React.ReactNode;
  colSpan: number;
  tone: Tone;
}) {
  return (
    <th
      colSpan={colSpan}
      style={{
        position: "sticky",
        top: LETTER_ROW_HEIGHT,
        zIndex: 28,
        height: GROUP_ROW_HEIGHT,
        padding: "0 4px",
        background: toneBackground(tone, true),
        borderRight: "1px solid #aeb6c2",
        borderBottom: "1px solid #8c97a6",
        textAlign: "center",
        fontSize: 9,
        lineHeight: 1,
        fontWeight: 750,
        color: "#172033",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function RowNumberHeader() {
  return (
    <th
      style={{
        position: "sticky",
        top: LETTER_ROW_HEIGHT + GROUP_ROW_HEIGHT,
        left: 0,
        zIndex: 38,
        width: ROW_NUMBER_WIDTH,
        minWidth: ROW_NUMBER_WIDTH,
        maxWidth: ROW_NUMBER_WIDTH,
        height: COLUMN_HEADER_HEIGHT,
        padding: 0,
        background: "#f3f4f6",
        borderRight: "1px solid #8c97a6",
        borderBottom: "2px solid #8c97a6",
        textAlign: "center",
        fontSize: 9,
        fontWeight: 700,
      }}
    >
      #
    </th>
  );
}

function ColumnHeader({
  children,
  width,
  tone,
}: {
  children: React.ReactNode;
  width: number;
  tone: Tone;
}) {
  return (
    <th
      style={{
        position: "sticky",
        top: LETTER_ROW_HEIGHT + GROUP_ROW_HEIGHT,
        zIndex: 27,
        width,
        minWidth: width,
        maxWidth: width,
        height: COLUMN_HEADER_HEIGHT,
        padding: "2px 4px",
        boxSizing: "border-box",
        background: toneBackground(tone, true),
        borderRight: "1px solid #aeb6c2",
        borderBottom: "2px solid #8c97a6",
        textAlign: "center",
        verticalAlign: "middle",
        fontSize: 9,
        lineHeight: 1.1,
        fontWeight: 700,
        color: "#172033",
        whiteSpace: "normal",
      }}
    >
      {children}
    </th>
  );
}

function HeaderUnit({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 2,
        fontSize: 8,
        lineHeight: 1,
        fontWeight: 650,
        color: "#475569",
      }}
    >
      {children}
    </div>
  );
}

function RowNumberCell({
  children,
  selected,
}: {
  children: React.ReactNode;
  selected: boolean;
}) {
  return (
    <td
      style={{
        position: "sticky",
        left: 0,
        zIndex: selected ? 16 : 12,
        width: ROW_NUMBER_WIDTH,
        minWidth: ROW_NUMBER_WIDTH,
        maxWidth: ROW_NUMBER_WIDTH,
        height: PRODUCT_ROW_HEIGHT,
        padding: "1px 4px",
        boxSizing: "border-box",
        background: selected ? "#eaf2ff" : "#f8fafc",
        borderRight: selected ? "2px solid #2e90fa" : "1px solid #8c97a6",
        borderBottom: "1px solid #aeb6c2",
        verticalAlign: "middle",
        textAlign: "center",
        color: selected ? "#175cd3" : "#64748b",
        fontSize: 10,
        fontWeight: selected ? 700 : 500,
      }}
    >
      {children}
    </td>
  );
}

function FooterCell({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: Tone;
}) {
  return (
    <td
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 18,
        height: 42,
        padding: "3px 4px",
        boxSizing: "border-box",
        background: toneBackground(tone, true),
        borderTop: "2px solid #7f8b99",
        borderRight: "1px solid #aeb6c2",
        verticalAlign: "middle",
        textAlign: "right",
        boxShadow: "0 -4px 8px -7px rgba(15,23,42,.55)",
      }}
    >
      {children}
    </td>
  );
}

function RowNumberFooter({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        position: "sticky",
        left: 0,
        bottom: 0,
        zIndex: 32,
        width: ROW_NUMBER_WIDTH,
        minWidth: ROW_NUMBER_WIDTH,
        maxWidth: ROW_NUMBER_WIDTH,
        height: 42,
        padding: "3px 4px",
        background: "#f8fafc",
        borderTop: "2px solid #7f8b99",
        borderRight: "1px solid #8c97a6",
        textAlign: "center",
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {children}
    </td>
  );
}

function footerForColumn(
  column: ColumnDefinition,
  totals: Record<string, number>,
  rowCount: number,
) {
  if (column.key === "description") {
    return <strong>{rowCount} {rowCount === 1 ? "Item" : "Items"}</strong>;
  }

  if (column.key === "quantity") {
    return <FooterValue value={truncateTwo(totals.quantity ?? 0)} label="Qty" />;
  }

  if (
    column.type === "money" &&
    Object.prototype.hasOwnProperty.call(totals, column.key)
  ) {
    return <MoneyFooter value={totals[column.key]} label="Total" />;
  }

  if (
    column.type === "percent" &&
    Object.prototype.hasOwnProperty.call(totals, column.key)
  ) {
    return <PercentFooter value={totals[column.key]} label="Avg" />;
  }

  if (column.key === "pack_size") {
    return <span style={{ color: "#667085", fontSize: 9 }}>Totals</span>;
  }

  return null;
}

function MoneyFooter({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div style={{ lineHeight: 1.05 }}>
      <div style={{ fontSize: 8, color: "#667085", marginBottom: 2 }}>{label}</div>
      <strong style={{ fontSize: 10 }}>€{truncateTwo(value)}</strong>
    </div>
  );
}

function PercentFooter({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div style={{ lineHeight: 1.05 }}>
      <div style={{ fontSize: 8, color: "#667085", marginBottom: 2 }}>{label}</div>
      <strong style={{ fontSize: 10 }}>{truncateTwo(value)}%</strong>
    </div>
  );
}

function FooterValue({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <div style={{ lineHeight: 1.05 }}>
      <div style={{ fontSize: 8, color: "#667085", marginBottom: 2 }}>{label}</div>
      <strong style={{ fontSize: 10 }}>{value}</strong>
    </div>
  );
}

function buildGroupRuns(columns: ColumnDefinition[]) {
  const runs: {
    group: string;
    label: string;
    tone: Tone;
    count: number;
    start: number;
  }[] = [];

  columns.forEach((column, index) => {
    const info = groupForColumn(column);
    const previous = runs[runs.length - 1];

    if (previous && previous.group === info.group) {
      previous.count += 1;
    } else {
      runs.push({
        ...info,
        count: 1,
        start: index,
      });
    }
  });

  return runs;
}

function groupForColumn(column: ColumnDefinition) {
  if (
    ["supplier_cost_ex_vat", "item_cost", "transported_cost"].includes(column.key)
  ) {
    return { group: "cost", label: "COST (SUPPLIER)", tone: "cost" as Tone };
  }

  if (
    [
      "shop_sem_price",
      "c_ivacp_price",
      "shop_com_price",
      "special_price",
      "big_wholesale_price",
      "rest_com_price",
      "public_price",
    ].includes(column.key)
  ) {
    return { group: "prices", label: "SELLING PRICES (€)", tone: column.tone };
  }

  if (column.key === "vat_rate") {
    return { group: "vat", label: "VAT", tone: "vat" as Tone };
  }

  if (column.key.endsWith("_markup")) {
    return { group: "markup", label: "MARKUP / MARGIN (%)", tone: "markup" as Tone };
  }

  if (column.key === "transport_rate") {
    return { group: "logistics", label: "LOGISTICS", tone: "transport" as Tone };
  }

  return { group: `basic-${column.key}`, label: "", tone: "basic" as Tone };
}

function toneBackground(
  tone: Tone,
  strong: boolean,
) {
  if (!strong) {
    switch (tone) {
      case "cost": return "#fffdf5";
      case "shopSem": return "#f8fbff";
      case "shopCom": return "#f8fbff";
      case "special": return "#fffaf7";
      case "wholesale": return "#fbf9ff";
      case "restCom": return "#f7fbff";
      case "public": return "#fbfbfb";
      case "vat": return "#fffdf7";
      case "markup": return "#fafaff";
      case "transport": return "#f8fbfa";
      default: return "#ffffff";
    }
  }

  switch (tone) {
    case "cost": return "#fff7df";
    case "shopSem": return "#eaf4ff";
    case "shopCom": return "#e8f2ff";
    case "special": return "#fff0e7";
    case "wholesale": return "#f1edff";
    case "restCom": return "#eaf5ff";
    case "public": return "#f2f4f7";
    case "vat": return "#fff4d6";
    case "markup": return "#f0efff";
    case "transport": return "#eaf7f2";
    default: return "#f8fafc";
  }
}

const toolbarButtonStyle: React.CSSProperties = {
  height: 26,
  padding: "0 9px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#344054",
  fontSize: 10,
  fontWeight: 650,
  cursor: "pointer",
};

const menuButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "7px 8px",
  border: 0,
  background: "#ffffff",
  textAlign: "left",
  fontSize: 11,
  color: "#344054",
  cursor: "pointer",
};