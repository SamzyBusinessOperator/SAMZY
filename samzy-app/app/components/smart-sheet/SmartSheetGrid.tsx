"use client";

import SmartSheetFormulaBar from "@/app/components/smart-sheet/SmartSheetFormulaBar";
import {
  DragEvent,
  MouseEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import SmartSheetCell from "./SmartSheetCell";

import {
  addSmartSheetColumn,
  deleteSmartSheetColumn,
  renameSmartSheetColumn,
  setSmartSheetColumnHidden,
  reorderSmartSheetColumns,
  setSmartSheetColumnWidths,
  setSmartSheetColumnPresentation,
  setSmartSheetColumnListValidation,
  setSmartSheetColumnDecimalPlaces,
  setSmartSheetColumnConditionalFormatting,
  setSmartSheetColumnSemanticMapping,
  clearSmartSheetCells,
  cutPasteSmartSheetCells,
  deleteSmartSheetRow,
  deleteSmartSheetRows,
  insertFirstSmartSheetRow,
  insertSmartSheetRow,
  insertSmartSheetRows,
  pasteSmartSheetCells,
  pasteSmartSheetCellsWithFormatting,
  shiftSmartSheetCells,
  shiftSmartSheetCellsLeft,
  shiftSmartSheetCellsRight,
  sortSmartSheetRows,
  getSmartSheetCellFormats,
  applySmartSheetCellFormatting,
  clearSmartSheetCellFormatting,
  applySmartSheetCellFontSize,
  applySmartSheetCellNumberFormat,
  adjustSmartSheetCellDecimalPlaces,
  applySmartSheetCellFillColor,
  applySmartSheetCellTextColor,
  applySmartSheetFormatPainter,
  applySmartSheetCellBorders,
  getSmartSheetHistoryStatus,
  undoSmartSheet,
  redoSmartSheet,
  reorderSmartSheetRow,
  reorderSmartSheetRowToPosition,
  updateSmartSheetCell,
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

type SmartSheetCellOverlay = {
  row_id: string;
  column_key: string;
  value: unknown;
  is_blank: boolean;
  source: string;
  source_column_key: string | null;
  source_row_id: string | null;
};

type SmartSheetColumnMetadata = {
  id: string;
  column_key: string;
  label: string;
  position: number;
  width: number;
  hidden: boolean;
  data_type: string;
  number_format: string | null;
  decimal_places: number | null;
  semantic_role: string | null;
  formula_definition: unknown;
  business_mapping: unknown;
  metadata: unknown;
  is_system: boolean;
};

type Props = {
  sheet: SmartSheet;
  rows: SmartSheetRow[];
  cellStates: SmartSheetCellState[];
  cellOverlays: SmartSheetCellOverlay[];
  sheetColumns: SmartSheetColumnMetadata[];
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

type CellType = "text" | "number" | "money" | "percent" | "boolean" | "date" | "datetime" | "time";

type FormulaDisplayValue =
  | string
  | number
  | null;

type ListValidation = {
  type: "list";
  values: string[];
};

function listValidationFromMetadata(
  metadata: unknown,
): ListValidation | undefined {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return undefined;
  }

  const validation =
    (metadata as Record<string, unknown>)
      .validation;

  if (
    !validation ||
    typeof validation !== "object" ||
    Array.isArray(validation)
  ) {
    return undefined;
  }

  const typed =
    validation as Record<string, unknown>;

  if (
    typed.type !== "list" ||
    !Array.isArray(typed.values)
  ) {
    return undefined;
  }

  const values = typed.values
    .filter(
      (value): value is string =>
        typeof value === "string",
    )
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return values.length > 0
    ? { type: "list", values }
    : undefined;
}

type ConditionalFormatOperator =
  | "equals"
  | "contains"
  | "gt"
  | "lt";

type ConditionalFormatRule = {
  operator: ConditionalFormatOperator;
  value: string;
  fillColor: string;
  textColor: string;
};

function conditionalFormatFromMetadata(
  metadata: unknown,
): ConditionalFormatRule | undefined {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return undefined;
  }

  const raw =
    (metadata as Record<string, unknown>)
      .conditional_format;

  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw)
  ) {
    return undefined;
  }

  const typed = raw as Record<string, unknown>;
  const operator = typed.operator;
  const value = typed.value;
  const fillColor = typed.fillColor;
  const textColor = typed.textColor;

  if (
    (operator !== "equals" &&
      operator !== "contains" &&
      operator !== "gt" &&
      operator !== "lt") ||
    typeof value !== "string" ||
    typeof fillColor !== "string" ||
    typeof textColor !== "string"
  ) {
    return undefined;
  }

  return { operator, value, fillColor, textColor };
}

function conditionalFormatMatches(
  rule: ConditionalFormatRule | undefined,
  value: unknown,
) {
  if (!rule || value === null || value === undefined) {
    return false;
  }

  const current = String(value);

  if (rule.operator === "equals") {
    return current.trim().toLowerCase() ===
      rule.value.trim().toLowerCase();
  }

  if (rule.operator === "contains") {
    return current.toLowerCase().includes(
      rule.value.toLowerCase(),
    );
  }

  const left = Number(current.replace(",", "."));
  const right = Number(rule.value.replace(",", "."));

  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return false;
  }

  return rule.operator === "gt"
    ? left > right
    : left < right;
}

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
  validation?: ListValidation;
  conditionalFormat?: ConditionalFormatRule;
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


type FilterOperator =
  | "contains"
  | "not_contains"
  | "equals"
  | "starts_with"
  | "ends_with"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "is_blank"
  | "is_not_blank"
  | "values";

type ColumnFilter = {
  operator: FilterOperator;
  value?: string;
  value2?: string;
  selectedValues?: string[];
};

type RowOutlineGroup = {
  id: string;
  rowIds: string[];
  collapsed: boolean;
};

function normalizeRowOutlineGroups(
  groups: RowOutlineGroup[],
  orderedRowIds: string[],
) {
  const order = new Map(
    orderedRowIds.map((rowId, index) => [rowId, index]),
  );

  return groups
    .map((group) => {
      const rowIds = Array.from(
        new Set(
          group.rowIds.filter((rowId) => order.has(rowId)),
        ),
      ).sort(
        (left, right) =>
          (order.get(left) ?? 0) - (order.get(right) ?? 0),
      );

      return {
        ...group,
        rowIds,
      };
    })
    .filter((group) => group.rowIds.length >= 2);
}

function rowOutlineGroupsRemainContiguous(
  groups: RowOutlineGroup[],
  orderedRowIds: string[],
) {
  const order = new Map(
    orderedRowIds.map((rowId, index) => [rowId, index]),
  );

  return groups.every((group) => {
    const indexes = group.rowIds
      .map((rowId) => order.get(rowId))
      .filter((index): index is number => index !== undefined)
      .sort((left, right) => left - right);

    if (indexes.length < 2) {
      return true;
    }

    return indexes.every(
      (index, position) =>
        position === 0 || index === indexes[position - 1] + 1,
    );
  });
}

function reorderedRowIds(
  orderedRowIds: string[],
  movingRowId: string,
  targetRowId: string,
  placement: "before" | "after",
) {
  const withoutMoving = orderedRowIds.filter(
    (rowId) => rowId !== movingRowId,
  );
  const targetIndex = withoutMoving.indexOf(targetRowId);

  if (targetIndex < 0) {
    return orderedRowIds;
  }

  const insertIndex =
    placement === "after" ? targetIndex + 1 : targetIndex;

  const next = [...withoutMoving];
  next.splice(insertIndex, 0, movingRowId);
  return next;
}


type CellFormatKind = "bold" | "italic" | "underline";

type CellFormat = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  alignment: Align | null;
  fontSize: number | null;
  numberFormat: "general" | "number" | "currency" | "percentage" | null;
  decimalPlaces: number | null;
  fillColor: string | null;
  textColor: string | null;
  borderTop: boolean;
  borderRight: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
};

type FindMatch = {
  rowId: string;
  rowIndex: number;
  columnKey: string;
  columnIndex: number;
};

const ROW_NUMBER_WIDTH = 38;
const PRODUCT_ROW_HEIGHT = 22;
const LETTER_ROW_HEIGHT = 24;

/*
 * General Smart Sheet blank-canvas presentation.
 *
 * These coordinates are visual placeholders only. They are deliberately
 * separate from runtimeAllColumns, columnOrder, persisted rows, formulas,
 * semantic mappings, history, and server actions.
 */
const GENERAL_BLANK_COLUMN_COUNT = 26;
const GENERAL_BLANK_ROW_COUNT = 500;
const GENERAL_BLANK_COLUMN_WIDTH = 120;
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
  cellOverlays,
  sheetColumns,
}: Props) {
  const router = useRouter();

  const [columnLabelOverrides, setColumnLabelOverrides] =
    useState<Record<string, string>>({});

  const [columnPresentationOverrides, setColumnPresentationOverrides] =
    useState<
      Record<
        string,
        | "text"
        | "number"
        | "currency"
        | "percentage"
        | "date"
        | "datetime"
        | "time"
        | "boolean"
      >
    >({});

  const [columnDecimalPlaceOverrides, setColumnDecimalPlaceOverrides] =
    useState<Record<string, number>>({});

  const [columnValidationOverrides, setColumnValidationOverrides] =
    useState<Record<string, string[] | null>>({});

  const [columnConditionalFormatOverrides, setColumnConditionalFormatOverrides] =
    useState<Record<string, ConditionalFormatRule | null>>({});

  const [columnSemanticRoleOverrides, setColumnSemanticRoleOverrides] =
    useState<Record<string, string | null>>({});

  /*
   * Dynamic Column Metadata V2.
   *
   * smart_sheet_columns now controls the current system column structure:
   * order, visibility, label, width, and spreadsheet data type.
   *
   * Legacy definitions remain the behavioral compatibility layer for pricing
   * drivers, SAME behavior, tones, calculated flags, and optional-column
   * behavior. If metadata is unavailable, the exact legacy structure is used.
   *
   * Unknown/custom columns are intentionally not activated in this step.
   */
  const runtimeAllColumns = useMemo<ColumnDefinition[]>(() => {
    if (sheetColumns.length === 0) {
      return sheet.sheet_type === null ? [] : ALL_COLUMNS;
    }

    const legacyByKey = new Map(
      ALL_COLUMNS.map((column) => [column.key, column]),
    );

    const mapped = [...sheetColumns]
      .sort((a, b) => a.position - b.position)
      .reduce<ColumnDefinition[]>((columns, metadata) => {
        const legacy = legacyByKey.get(metadata.column_key);

        if (!legacy) {
          const effectiveDataType =
            columnPresentationOverrides[
              metadata.column_key
            ] ??
            metadata.data_type;

          let customType: CellType = "text";

          if (effectiveDataType === "number") {
            customType = "number";
          } else if (effectiveDataType === "currency") {
            customType = "money";
          } else if (effectiveDataType === "percentage") {
            customType = "percent";
          } else if (effectiveDataType === "boolean") {
            customType = "boolean";
          } else if (effectiveDataType === "date") {
            customType = "date";
          } else if (effectiveDataType === "datetime") {
            customType = "datetime";
          } else if (effectiveDataType === "time") {
            customType = "time";
          }

          const validationOverride =
            columnValidationOverrides[
              metadata.column_key
            ];

          const validation =
            validationOverride !== undefined
              ? validationOverride
                ? {
                    type: "list" as const,
                    values: validationOverride,
                  }
                : undefined
              : listValidationFromMetadata(
                  metadata.metadata,
                );

          const conditionalFormatOverride =
            columnConditionalFormatOverrides[
              metadata.column_key
            ];

          const conditionalFormat =
            conditionalFormatOverride !== undefined
              ? conditionalFormatOverride ?? undefined
              : conditionalFormatFromMetadata(
                  metadata.metadata,
                );

          columns.push({
            key: metadata.column_key,
            label:
              columnLabelOverrides[metadata.column_key] ??
              metadata.label,
            unit:
              customType === "money"
                ? "€"
                : customType === "percent"
                  ? "%"
                  : undefined,
            width: metadata.width,
            type: customType,
            tone: "basic",
            align:
              customType === "text" ||
              customType === "date" ||
              customType === "datetime" ||
              customType === "time"
                ? "left"
                : customType === "boolean"
                  ? "center"
                  : "right",
            editable: true,
            validation,
            conditionalFormat,
          });

          return columns;
        }

        let type: CellType = legacy.type;

        if (metadata.data_type === "text") {
          type = "text";
        } else if (metadata.data_type === "number") {
          type = "number";
        } else if (metadata.data_type === "currency") {
          type = "money";
        } else if (metadata.data_type === "percentage") {
          type = "percent";
        }

        const unit =
          type === "money"
            ? "€"
            : type === "percent"
              ? "%"
              : legacy.unit;

        columns.push({
          ...legacy,
          label:
            columnLabelOverrides[metadata.column_key] ??
            metadata.label,
          width: metadata.width,
          type,
          unit,
        });

        return columns;
      }, []);

    return mapped.length > 0
      ? mapped
      : sheet.sheet_type === null
        ? []
        : ALL_COLUMNS;
  }, [
    columnLabelOverrides,
    columnPresentationOverrides,
    columnValidationOverrides,
    columnConditionalFormatOverrides,
    sheet.sheet_type,
    sheetColumns,
  ]);

  const initialColumnOrder = useMemo(() => {
    if (sheetColumns.length === 0) {
      return sheet.sheet_type === null
        ? []
        : CORE_COLUMNS.map((column) => column.key);
    }

    const hiddenKeys = new Set(
      sheetColumns
        .filter((column) => column.hidden)
        .map((column) => column.column_key),
    );

    const metadataVisibleOrder =
      runtimeAllColumns
        .filter((column) => !hiddenKeys.has(column.key))
        .map((column) => column.key);

    return metadataVisibleOrder.length > 0
      ? metadataVisibleOrder
      : sheet.sheet_type === null
        ? []
        : CORE_COLUMNS.map((column) => column.key);
  }, [runtimeAllColumns, sheet.sheet_type, sheetColumns]);

  /*
   * Spreadsheet Cell Layer V1 reader.
   *
   * We deliberately build the overlay lookup now without applying it to the
   * rendered cell value yet. That lets us verify the new persistence layer is
   * safely readable before Shift Left begins writing to it.
   */
  const spreadsheetCellOverlayMap = useMemo(
    () =>
      new Map(
        cellOverlays.map((overlay) => [
          `${overlay.row_id}:${overlay.column_key}`,
          overlay,
        ]),
      ),
    [cellOverlays],
  );

  const gridRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const verticalScrollRef = useRef<HTMLDivElement | null>(null);
  const [gridContentHeight, setGridContentHeight] = useState(0);

  const [columnOrder, setColumnOrder] = useState<string[]>(
    () => initialColumnOrder,
  );

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      runtimeAllColumns.map((column) => [
        column.key,
        column.width,
      ]),
    ),
  );

  const [pendingCustomColumnKeys, setPendingCustomColumnKeys] =
    useState<string[]>([]);

  useEffect(() => {
    if (pendingCustomColumnKeys.length === 0) {
      return;
    }

    const definitions =
      pendingCustomColumnKeys
        .map((key) =>
          runtimeAllColumns.find(
            (column) => column.key === key,
          ),
        )
        .filter(
          (
            column,
          ): column is ColumnDefinition =>
            Boolean(column),
        );

    if (definitions.length === 0) {
      return;
    }

    const resolvedKeys =
      definitions.map(
        (column) => column.key,
      );

    setColumnOrder((current) => {
      const next = [...current];

      for (const key of resolvedKeys) {
        if (!next.includes(key)) {
          next.push(key);
        }
      }

      return next;
    });

    setColumnWidths((current) => {
      const next = { ...current };

      for (const definition of definitions) {
        next[definition.key] =
          next[definition.key] ??
          definition.width;
      }

      return next;
    });

    setPendingCustomColumnKeys((current) =>
      current.filter(
        (key) =>
          !resolvedKeys.includes(key),
      ),
    );
  }, [
    pendingCustomColumnKeys,
    runtimeAllColumns,
  ]);

  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const [hiddenRowIds, setHiddenRowIds] = useState<string[]>([]);
  const [rowOutlineGroups, setRowOutlineGroups] =
    useState<RowOutlineGroup[]>([]);
  const [resizingRow, setResizingRow] = useState<{
    rowId: string;
    startY: number;
    startHeight: number;
  } | null>(null);

  const rowHeightStorageKey =
    `samzy:smart-sheet:row-heights:${sheet.id}`;

  const hiddenRowsStorageKey =
    `samzy:smart-sheet:hidden-rows:${sheet.id}`;

  const rowOutlineStorageKey =
    `samzy:smart-sheet:row-outline-groups:${sheet.id}`;

  const hiddenRowIdSet = useMemo(
    () => new Set(hiddenRowIds),
    [hiddenRowIds],
  );

  function loadHiddenRowIds() {
    try {
      const raw =
        window.localStorage.getItem(
          hiddenRowsStorageKey,
        );

      if (!raw) {
        return [] as string[];
      }

      const parsed =
        JSON.parse(raw) as unknown;

      if (!Array.isArray(parsed)) {
        return [] as string[];
      }

      const existingRowIds =
        new Set(
          rows.map((row) => row.id),
        );

      return parsed
        .filter(
          (value): value is string =>
            typeof value === "string" &&
            existingRowIds.has(value),
        );
    } catch {
      return [] as string[];
    }
  }

  function saveHiddenRowIds(
    rowIds: string[],
  ) {
    try {
      window.localStorage.setItem(
        hiddenRowsStorageKey,
        JSON.stringify(rowIds),
      );
    } catch {
      // Sheet-scoped UI state still works in memory if localStorage is unavailable.
    }
  }

  function hideSelectedRows() {
    if (selectedRowIds.length === 0) {
      return;
    }

    setHiddenRowIds((current) => {
      const next =
        Array.from(
          new Set([
            ...current,
            ...selectedRowIds,
          ]),
        );

      saveHiddenRowIds(next);
      return next;
    });

    const count =
      selectedRowIds.length;

    setRowMenu(null);
    setRowSelectionAnchor(null);
    setRowSelectionEnd(null);
    setSelectedCell(null);
    setRangeAnchor(null);
    setRangeEnd(null);

    window.dispatchEvent(
      new CustomEvent(
        "samzy:smart-sheet-selection",
        { detail: null },
      ),
    );

    setPasteMessage(
      count === 1
        ? "Row hidden."
        : `${count} rows hidden.`,
    );
  }

  function showAllHiddenRows() {
    const count =
      hiddenRowIds.length;

    if (count === 0) {
      return;
    }

    setHiddenRowIds([]);
    saveHiddenRowIds([]);
    setRowMenu(null);

    setPasteMessage(
      count === 1
        ? "Hidden row restored."
        : `${count} hidden rows restored.`,
    );
  }

  function loadRowOutlineGroups() {
    try {
      const raw =
        window.localStorage.getItem(
          rowOutlineStorageKey,
        );

      if (!raw) {
        return [] as RowOutlineGroup[];
      }

      const parsed =
        JSON.parse(raw) as unknown;

      if (!Array.isArray(parsed)) {
        return [] as RowOutlineGroup[];
      }

      const existingRowIds =
        new Set(
          rows.map((row) => row.id),
        );

      return parsed
        .filter(
          (value): value is RowOutlineGroup =>
            Boolean(
              value &&
                typeof value === "object" &&
                !Array.isArray(value) &&
                typeof (value as RowOutlineGroup).id === "string" &&
                Array.isArray((value as RowOutlineGroup).rowIds),
            ),
        )
        .map((group) => ({
          id: group.id,
          rowIds: Array.from(
            new Set(
              group.rowIds.filter(
                (rowId): rowId is string =>
                  typeof rowId === "string" &&
                  existingRowIds.has(rowId),
              ),
            ),
          ),
          collapsed: Boolean(group.collapsed),
        }))
        .filter(
          (group) => group.rowIds.length >= 2,
        );
    } catch {
      return [] as RowOutlineGroup[];
    }
  }

  function saveRowOutlineGroups(
    groups: RowOutlineGroup[],
  ) {
    try {
      window.localStorage.setItem(
        rowOutlineStorageKey,
        JSON.stringify(groups),
      );
    } catch {
      // Row outlines remain usable in memory if localStorage is unavailable.
    }
  }

  function groupSelectedRows() {
    if (selectedRowIds.length < 2) {
      setPasteMessage(
        "Select at least two adjacent rows to create a group.",
      );
      return;
    }

    if (activeFilterCount > 0) {
      setPasteMessage(
        "Clear active filters before grouping rows so the physical row range stays unambiguous.",
      );
      return;
    }

    const selectedSet =
      new Set(selectedRowIds);

    const overlapsExistingGroup =
      rowOutlineGroups.some(
        (group) =>
          group.rowIds.some(
            (rowId) =>
              selectedSet.has(rowId),
          ),
      );

    if (overlapsExistingGroup) {
      setPasteMessage(
        "These rows already belong to a group. Ungroup them before creating a new outline group.",
      );
      return;
    }

    const nextGroup: RowOutlineGroup = {
      id:
        typeof crypto !== "undefined" &&
        "randomUUID" in crypto
          ? crypto.randomUUID()
          : `row-group-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`,
      rowIds: [...selectedRowIds],
      collapsed: false,
    };

    setRowOutlineGroups((current) => {
      const next = [
        ...current,
        nextGroup,
      ];

      saveRowOutlineGroups(next);
      return next;
    });

    setRowMenu(null);
    setPasteMessage(
      `${selectedRowIds.length} rows grouped.`,
    );
  }

  function ungroupSelectedRows() {
    if (selectedRowIds.length === 0) {
      return;
    }

    const selectedSet =
      new Set(selectedRowIds);

    const groupsToRemove =
      rowOutlineGroups.filter(
        (group) =>
          group.rowIds.some(
            (rowId) =>
              selectedSet.has(rowId),
          ),
      );

    if (groupsToRemove.length === 0) {
      setPasteMessage(
        "The selected row does not belong to a group.",
      );
      return;
    }

    const removeIds =
      new Set(
        groupsToRemove.map(
          (group) => group.id,
        ),
      );

    setRowOutlineGroups((current) => {
      const next =
        current.filter(
          (group) =>
            !removeIds.has(group.id),
        );

      saveRowOutlineGroups(next);
      return next;
    });

    setRowMenu(null);
    setPasteMessage(
      groupsToRemove.length === 1
        ? "Row group removed."
        : `${groupsToRemove.length} row groups removed.`,
    );
  }

  function toggleRowOutlineGroup(
    groupId: string,
  ) {
    setRowOutlineGroups((current) => {
      const next =
        current.map((group) =>
          group.id === groupId
            ? {
                ...group,
                collapsed:
                  !group.collapsed,
              }
            : group,
        );

      saveRowOutlineGroups(next);
      return next;
    });

    setRowMenu(null);
  }

  function loadRowHeights() {
    try {
      const raw =
        window.localStorage.getItem(
          rowHeightStorageKey,
        );

      if (!raw) {
        return {} as Record<string, number>;
      }

      const parsed =
        JSON.parse(raw) as Record<string, unknown>;

      if (!parsed || typeof parsed !== "object") {
        return {} as Record<string, number>;
      }

      const next: Record<string, number> = {};

      for (const [rowId, value] of Object.entries(parsed)) {
        if (
          typeof value === "number" &&
          Number.isFinite(value)
        ) {
          next[rowId] = Math.max(18, Math.min(160, value));
        }
      }

      return next;
    } catch {
      return {} as Record<string, number>;
    }
  }

  function saveRowHeights(heights: Record<string, number>) {
    try {
      window.localStorage.setItem(
        rowHeightStorageKey,
        JSON.stringify(heights),
      );
    } catch {
      // Local storage is only a resilience layer; in-memory resizing still works.
    }
  }

  function resetSelectedRowHeights() {
    if (selectedRowIds.length === 0) {
      return;
    }

    setRowHeights((current) => {
      const next = { ...current };

      for (const rowId of selectedRowIds) {
        delete next[rowId];
      }

      saveRowHeights(next);
      return next;
    });

    setRowMenu(null);

    setPasteMessage(
      selectedRowIds.length === 1
        ? "Row height reset."
        : `${selectedRowIds.length} row heights reset.`,
    );
  }

  function resetAllRowHeights() {
    setRowHeights({});
    saveRowHeights({});
    setRowMenu(null);
    setPasteMessage("All row heights reset.");
  }

  function startRowResize(
    event: MouseEvent<HTMLSpanElement>,
    rowId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();

    setRowMenu(null);

    setResizingRow({
      rowId,
      startY: event.clientY,
      startHeight:
        rowHeights[rowId] ??
        PRODUCT_ROW_HEIGHT,
    });
  }

  const hiddenColumnOrderRef = useRef<Record<string, string[]>>({});

  const hiddenColumnStorageKey =
    `samzy:smart-sheet:hidden-column-order:${sheet.id}`;

  const columnWidthStorageKey =
    `samzy:smart-sheet:column-widths:${sheet.id}`;


  const freezeColumnStorageKey =
    `samzy:smart-sheet:frozen-columns:${sheet.id}`;

  const [frozenColumnCount, setFrozenColumnCount] =
    useState(0);

  function loadFrozenColumnCount() {
    try {
      const raw =
        window.localStorage.getItem(
          freezeColumnStorageKey,
        );

      const parsed =
        raw === null
          ? 0
          : Number(raw);

      return Number.isFinite(parsed)
        ? Math.max(
            0,
            Math.min(
              columnOrder.length,
              Math.trunc(parsed),
            ),
          )
        : 0;
    } catch {
      return 0;
    }
  }

  function saveFrozenColumnCount(
    count: number,
  ) {
    try {
      window.localStorage.setItem(
        freezeColumnStorageKey,
        String(count),
      );
    } catch {
      // Local storage is only a resilience layer.
    }
  }

  function freezeColumnsThroughSelection() {
    if (!selectedColumnRange) {
      return;
    }

    const nextCount =
      Math.min(
        visibleColumns.length,
        selectedColumnRange.endColumn + 1,
      );

    setFrozenColumnCount(nextCount);
    saveFrozenColumnCount(nextCount);
    setColumnMenu(null);
    setColumnInsertSide(null);

    setPasteMessage(
      nextCount === 1
        ? "1 column frozen."
        : `${nextCount} columns frozen.`,
    );
  }

  function unfreezeAllColumns() {
    setFrozenColumnCount(0);
    saveFrozenColumnCount(0);
    setColumnMenu(null);
    setColumnInsertSide(null);
    setPasteMessage("Columns unfrozen.");
  }


  const freezeRowStorageKey =
    `samzy:smart-sheet:frozen-rows:${sheet.id}`;

  const [frozenRowCount, setFrozenRowCount] =
    useState(0);

  function loadFrozenRowCount() {
    try {
      const raw =
        window.localStorage.getItem(
          freezeRowStorageKey,
        );

      const parsed =
        raw === null
          ? 0
          : Number(raw);

      return Number.isFinite(parsed)
        ? Math.max(
            0,
            Math.min(
              rows.length,
              Math.trunc(parsed),
            ),
          )
        : 0;
    } catch {
      return 0;
    }
  }

  function saveFrozenRowCount(
    count: number,
  ) {
    try {
      window.localStorage.setItem(
        freezeRowStorageKey,
        String(count),
      );
    } catch {
      // Local storage is only a resilience layer.
    }
  }

  function freezeRowsThroughSelection() {
    if (!selectedRowRange) {
      return;
    }

    const nextCount =
      Math.min(
        filteredRows.length,
        selectedRowRange.endRow + 1,
      );

    setFrozenRowCount(nextCount);
    saveFrozenRowCount(nextCount);
    setRowMenu(null);

    setPasteMessage(
      nextCount === 1
        ? "1 row frozen."
        : `${nextCount} rows frozen.`,
    );
  }

  function unfreezeAllRows() {
    setFrozenRowCount(0);
    saveFrozenRowCount(0);
    setRowMenu(null);
    setPasteMessage("Rows unfrozen.");
  }

  function loadColumnWidths() {
    const defaults = Object.fromEntries(
      runtimeAllColumns.map((column) => [
        column.key,
        column.width,
      ]),
    ) as Record<string, number>;

    /*
     * Persistent Column Width V1:
     * once smart_sheet_columns metadata exists, its width values are the
     * authoritative source. localStorage remains only as a legacy fallback for
     * sheets that do not yet have persistent column metadata.
     */
    if (sheetColumns.length > 0) {
      return defaults;
    }

    try {
      const raw =
        window.localStorage.getItem(
          columnWidthStorageKey,
        );

      if (!raw) {
        return defaults;
      }

      const parsed =
        JSON.parse(raw) as Record<string, unknown>;

      if (
        !parsed ||
        typeof parsed !== "object"
      ) {
        return defaults;
      }

      for (const column of runtimeAllColumns) {
        const stored =
          parsed[column.key];

        if (
          typeof stored === "number" &&
          Number.isFinite(stored)
        ) {
          defaults[column.key] =
            Math.max(
              54,
              Math.min(
                420,
                stored,
              ),
            );
        }
      }

      return defaults;
    } catch {
      return defaults;
    }
  }

  function saveColumnWidths(
    widths: Record<string, number>,
  ) {
    try {
      window.localStorage.setItem(
        columnWidthStorageKey,
        JSON.stringify(widths),
      );
    } catch {
      // Local storage is only a resilience layer; in-memory resizing still works.
    }
  }


  function defaultColumnWidth(
    columnKey: string,
  ) {
    return (
      ALL_COLUMNS.find(
        (column) =>
          column.key === columnKey,
      )?.width ??
      120
    );
  }

  async function persistColumnWidths(
    columns: Array<{
      columnKey: string;
      width: number;
    }>,
  ) {
    if (
      sheetColumns.length === 0 ||
      columns.length === 0
    ) {
      return;
    }

    const result =
      await setSmartSheetColumnWidths({
        sheetId:
          sheet.id,
        columns,
      });

    if (!result.ok) {
      setPasteMessage(
        result.message ??
          "Column width could not be persisted.",
      );
    }
  }


  function resetSelectedColumnWidths() {
    if (selectedColumnKeys.length === 0) {
      return;
    }

    const updates =
      selectedColumnKeys.map(
        (key) => ({
          columnKey:
            key,
          width:
            defaultColumnWidth(
              key,
            ),
        }),
      );

    setColumnWidths((current) => {
      const next = { ...current };

      for (const update of updates) {
        next[update.columnKey] =
          update.width;
      }

      saveColumnWidths(next);
      return next;
    });

    void persistColumnWidths(
      updates,
    );

    setColumnMenu(null);
    setColumnInsertSide(null);

    setPasteMessage(
      selectedColumnKeys.length === 1
        ? "Column width reset."
        : `${selectedColumnKeys.length} column widths reset.`,
    );
  }

  function resetAllColumnWidths() {
    const updates =
      runtimeAllColumns.map(
        (column) => ({
          columnKey:
            column.key,
          width:
            defaultColumnWidth(
              column.key,
            ),
        }),
      );

    const defaults =
      Object.fromEntries(
        updates.map(
          (column) => [
            column.columnKey,
            column.width,
          ],
        ),
      ) as Record<string, number>;

    setColumnWidths(defaults);
    saveColumnWidths(defaults);

    void persistColumnWidths(
      updates,
    );

    setColumnMenu(null);
    setColumnInsertSide(null);

    setPasteMessage(
      "All column widths reset.",
    );
  }

  function loadHiddenColumnOrders() {
    try {
      const raw =
        window.localStorage.getItem(
          hiddenColumnStorageKey,
        );

      if (!raw) {
        return {} as Record<string, string[]>;
      }

      const parsed =
        JSON.parse(raw) as Record<string, string[]>;

      return parsed &&
        typeof parsed === "object"
        ? parsed
        : {};
    } catch {
      return {} as Record<string, string[]>;
    }
  }

  function saveHiddenColumnOrders(
    orders: Record<string, string[]>,
  ) {
    hiddenColumnOrderRef.current =
      orders;

    try {
      window.localStorage.setItem(
        hiddenColumnStorageKey,
        JSON.stringify(orders),
      );
    } catch {
      // Local storage is only a resilience layer; in-memory behavior still works.
    }
  }
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [rangeAnchor, setRangeAnchor] = useState<CellPosition | null>(null);
  const [rangeEnd, setRangeEnd] = useState<CellPosition | null>(null);
  const isRangeDraggingRef = useRef(false);

  const internalClipboardRef = useRef<{
    mode: "copy" | "cut";
    text: string;
    valuesText: string;
    cells: Array<{
      rowId: string;
      columnKey: string;
    }>;
    formats: CellFormat[];
  } | null>(null);

  const [isFilling, setIsFilling] = useState(false);
  const [fillTarget, setFillTarget] = useState<CellPosition | null>(null);
  const [isApplyingFill, setIsApplyingFill] = useState(false);

  const [draggedColumnKey, setDraggedColumnKey] = useState<string | null>(null);

  const [draggedRowId, setDraggedRowId] =
    useState<string | null>(null);

  const [rowDropTarget, setRowDropTarget] =
    useState<{
      rowId: string;
      placement: "before" | "after";
    } | null>(null);

  const [resizingColumn, setResizingColumn] = useState<{
    key: string;
    startX: number;
    startWidth: number;
  } | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const addColumnButtonRef = useRef<HTMLButtonElement | null>(null);
  const [addColumnMenuPosition, setAddColumnMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [newColumnDataType, setNewColumnDataType] =
    useState<
      | "text"
      | "number"
      | "currency"
      | "percentage"
      | "date"
      | "datetime"
      | "time"
      | "boolean"
    >("text");
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [showPasteSpecial, setShowPasteSpecial] = useState(false);
  const [showCellShiftMenu, setShowCellShiftMenu] = useState(false);
  const cellShiftButtonRef = useRef<HTMLButtonElement | null>(null);
  const [cellShiftMenuPosition, setCellShiftMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const pasteSpecialButtonRef = useRef<HTMLButtonElement | null>(null);
  const [pasteSpecialMenuPosition, setPasteSpecialMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [pasteMessage, setPasteMessage] = useState<string | null>(null);
  const [cellFormats, setCellFormats] = useState<Record<string, CellFormat>>({});
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatPainterSource, setFormatPainterSource] = useState<{
    formats: CellFormat[];
  } | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isHistoryBusy, setIsHistoryBusy] = useState(false);


  const [showFindReplace, setShowFindReplace] =
    useState(false);

  const [showReplaceControls, setShowReplaceControls] =
    useState(false);

  const [findQuery, setFindQuery] =
    useState("");

  const [replaceQuery, setReplaceQuery] =
    useState("");

  const [activeFindMatchIndex, setActiveFindMatchIndex] =
    useState(0);

  const [isReplacing, setIsReplacing] =
    useState(false);

  const findInputRef =
    useRef<HTMLInputElement | null>(null);

  const [rowMenu, setRowMenu] = useState<{
    rowId: string;
    rowIndex: number;
    rowNumber: number;
  } | null>(null);
  const [isRowOperation, setIsRowOperation] = useState(false);
  const [pendingInsertedRowId, setPendingInsertedRowId] =
    useState<string | null>(null);
  const [pendingSelectedRowId, setPendingSelectedRowId] =
    useState<string | null>(null);

  /*
   * General Smart Sheet lazy materialization target.
   *
   * Virtual blank coordinates never enter the spreadsheet engine as fake
   * row/column IDs. Once the required real structure has been persisted,
   * this coordinate tells the client which real cell should be selected.
   */
  const [pendingMaterializedCell, setPendingMaterializedCell] =
    useState<{
      rowIndex: number;
      columnIndex: number;
    } | null>(null);

  // V1 row-range selection: click a row number, then Shift+click another.
  // Structural multi-row actions are intentionally not enabled yet.
  const [rowSelectionAnchor, setRowSelectionAnchor] = useState<number | null>(null);
  const [rowSelectionEnd, setRowSelectionEnd] = useState<number | null>(null);

  const selectedRowRange = useMemo(() => {
    if (rowSelectionAnchor === null || rowSelectionEnd === null) {
      return null;
    }

    return {
      startRow: Math.min(rowSelectionAnchor, rowSelectionEnd),
      endRow: Math.max(rowSelectionAnchor, rowSelectionEnd),
    };
  }, [rowSelectionAnchor, rowSelectionEnd]);

  // V1 whole-column selection: click a column letter, then Shift+click
  // another letter to select an adjacent column range.
  const [columnSelectionAnchor, setColumnSelectionAnchor] =
    useState<number | null>(null);
  const [columnSelectionEnd, setColumnSelectionEnd] =
    useState<number | null>(null);

  const selectedColumnRange = useMemo(() => {
    if (
      columnSelectionAnchor === null ||
      columnSelectionEnd === null
    ) {
      return null;
    }

    return {
      startColumn: Math.min(
        columnSelectionAnchor,
        columnSelectionEnd,
      ),
      endColumn: Math.max(
        columnSelectionAnchor,
        columnSelectionEnd,
      ),
    };
  }, [
    columnSelectionAnchor,
    columnSelectionEnd,
  ]);

  const [columnMenu, setColumnMenu] = useState<{
    x: number;
    y: number;
    columnIndex: number;
  } | null>(null);

  const [renameColumnEditor, setRenameColumnEditor] = useState<{
    columnKey: string;
    label: string;
  } | null>(null);
  const [isRenamingColumn, setIsRenamingColumn] = useState(false);
  const [isUpdatingColumnPresentation, setIsUpdatingColumnPresentation] =
    useState(false);
  const [isUpdatingColumnDecimals, setIsUpdatingColumnDecimals] =
    useState(false);
  const [isUpdatingColumnValidation, setIsUpdatingColumnValidation] =
    useState(false);
  const [columnValidationDraft, setColumnValidationDraft] =
    useState("");
  const [isUpdatingConditionalFormat, setIsUpdatingConditionalFormat] =
    useState(false);
  const [conditionalFormatOperator, setConditionalFormatOperator] =
    useState<ConditionalFormatOperator>("equals");
  const [conditionalFormatValue, setConditionalFormatValue] =
    useState("");
  const [conditionalFormatFillColor, setConditionalFormatFillColor] =
    useState("#fff2cc");
  const [conditionalFormatTextColor, setConditionalFormatTextColor] =
    useState("#7a5d00");

  const [isUpdatingSemanticMapping, setIsUpdatingSemanticMapping] =
    useState(false);
  const [semanticRoleDraft, setSemanticRoleDraft] =
    useState("");

  const [columnCanonicalRoleOverrides, setColumnCanonicalRoleOverrides] =
    useState<Record<string, string | null>>({});

  const [columnInsertSide, setColumnInsertSide] =
    useState<"left" | "right" | null>(null);


  const filterStorageKey =
    `samzy:smart-sheet:filters:${sheet.id}`;

  const [columnFilters, setColumnFilters] =
    useState<Record<string, ColumnFilter>>({});

  const [filterEditorColumnKey, setFilterEditorColumnKey] =
    useState<string | null>(null);

  const [filterDraftOperator, setFilterDraftOperator] =
    useState<FilterOperator>("contains");

  const [filterDraftValue, setFilterDraftValue] =
    useState("");

  const [filterDraftValue2, setFilterDraftValue2] =
    useState("");

  const [filterDraftSelectedValues, setFilterDraftSelectedValues] =
    useState<string[]>([]);

  function loadColumnFilters() {
    try {
      const raw =
        window.localStorage.getItem(
          filterStorageKey,
        );

      if (!raw) {
        return {} as Record<string, ColumnFilter>;
      }

      const parsed =
        JSON.parse(raw) as Record<string, ColumnFilter>;

      return parsed &&
        typeof parsed === "object"
        ? parsed
        : {};
    } catch {
      return {} as Record<string, ColumnFilter>;
    }
  }

  function saveColumnFilters(
    filters: Record<string, ColumnFilter>,
  ) {
    try {
      window.localStorage.setItem(
        filterStorageKey,
        JSON.stringify(filters),
      );
    } catch {
      // Filtering remains usable in memory if localStorage is unavailable.
    }
  }

  useLayoutEffect(() => {
    setColumnFilters(
      loadColumnFilters(),
    );
    // Sheet-scoped view state is restored before paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStorageKey]);


  useEffect(() => {
    hiddenColumnOrderRef.current =
      loadHiddenColumnOrders();
    // This state is intentionally sheet-scoped and loaded once per sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenColumnStorageKey]);


  useLayoutEffect(() => {
    setColumnWidths(
      loadColumnWidths(),
    );
    // Restore widths before browser paint so the sheet does not flash defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnWidthStorageKey]);


  useLayoutEffect(() => {
    setRowHeights(
      loadRowHeights(),
    );
    // Restore row heights before browser paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowHeightStorageKey]);


  useLayoutEffect(() => {
    setHiddenRowIds(
      loadHiddenRowIds(),
    );
    // Hidden rows are presentation-only and sheet-scoped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenRowsStorageKey]);


  useLayoutEffect(() => {
    setRowOutlineGroups(
      loadRowOutlineGroups(),
    );
    // Row outline groups are presentation-only and sheet-scoped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowOutlineStorageKey]);

  useEffect(() => {
    const orderedRowIds = rows.map((row) => row.id);

    setRowOutlineGroups((current) => {
      const next = normalizeRowOutlineGroups(
        current,
        orderedRowIds,
      );

      const unchanged =
        next.length === current.length &&
        next.every(
          (group, groupIndex) =>
            group.id === current[groupIndex]?.id &&
            group.collapsed === current[groupIndex]?.collapsed &&
            group.rowIds.length ===
              current[groupIndex]?.rowIds.length &&
            group.rowIds.every(
              (rowId, rowIndex) =>
                rowId === current[groupIndex]?.rowIds[rowIndex],
            ),
        );

      if (unchanged) {
        return current;
      }

      saveRowOutlineGroups(next);
      return next;
    });
    // Structural row changes may delete group members. UUID membership is
    // pruned after refreshed row props arrive; groups with fewer than two
    // surviving rows disappear automatically.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);


  useLayoutEffect(() => {
    setFrozenColumnCount(
      loadFrozenColumnCount(),
    );
    // Restore the sheet-scoped frozen column count before browser paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freezeColumnStorageKey]);


  useLayoutEffect(() => {
    setFrozenRowCount(
      loadFrozenRowCount(),
    );
    // Restore the sheet-scoped frozen row count before browser paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freezeRowStorageKey]);


  useLayoutEffect(() => {
    const previousHtmlOverflowY =
      document.documentElement.style.overflowY;

    const previousBodyOverflowY =
      document.body.style.overflowY;

    document.documentElement.style.overflowY =
      "hidden";

    document.body.style.overflowY =
      "hidden";

    return () => {
      document.documentElement.style.overflowY =
        previousHtmlOverflowY;

      document.body.style.overflowY =
        previousBodyOverflowY;
    };
  }, []);


  async function refreshHistoryStatus() {
    try {
      const status = await getSmartSheetHistoryStatus({
        sheetId: sheet.id,
      });

      if (status.ok) {
        setCanUndo(Boolean(status.canUndo));
        setCanRedo(Boolean(status.canRedo));
      }
    } catch {
      // History controls remain usable even if status refresh temporarily fails.
    }
  }

  async function runUndo() {
    if (isHistoryBusy) return;

    setIsHistoryBusy(true);
    setPasteMessage(null);

    try {
      const result = await undoSmartSheet({
        sheetId: sheet.id,
      });

      setPasteMessage(
        result.message ??
          (result.ok ? "Undo complete." : "Unable to undo."),
      );

      if (result.ok) {
        setFormatPainterSource(null);
        await reloadCellFormats();
        router.refresh();
      }

      await refreshHistoryStatus();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to undo.",
      );
    } finally {
      setIsHistoryBusy(false);
    }
  }

  async function runRedo() {
    if (isHistoryBusy) return;

    setIsHistoryBusy(true);
    setPasteMessage(null);

    try {
      const result = await redoSmartSheet({
        sheetId: sheet.id,
      });

      setPasteMessage(
        result.message ??
          (result.ok ? "Redo complete." : "Unable to redo."),
      );

      if (result.ok) {
        setFormatPainterSource(null);
        await reloadCellFormats();
        router.refresh();
      }

      await refreshHistoryStatus();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to redo.",
      );
    } finally {
      setIsHistoryBusy(false);
    }
  }

  useEffect(() => {
    void refreshHistoryStatus();
    // Re-check after server data changes or local operations complete.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.id, rows, cellStates, pasteMessage]);

  useEffect(() => {
    function handleHistoryShortcut(
      event: KeyboardEvent,
    ) {
      if (event.repeat) return;

      const target =
        event.target as HTMLElement | null;

      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const command =
        event.ctrlKey ||
        event.metaKey;

      if (!command) return;

      const key =
        event.key.toLowerCase();

      if (
        key === "z" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        void runUndo();
        return;
      }

      if (
        key === "y" ||
        (key === "z" &&
          event.shiftKey)
      ) {
        event.preventDefault();
        void runRedo();
      }
    }

    window.addEventListener(
      "keydown",
      handleHistoryShortcut,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleHistoryShortcut,
      );
    };
  });

  useEffect(() => {
    if (!pasteMessage) return;

    const lower =
      pasteMessage.toLowerCase();

    const isError =
      lower.includes("unable") ||
      lower.includes("error") ||
      lower.includes("failed") ||
      lower.includes("does not") ||
      lower.includes("nothing to");

    const timeout =
      window.setTimeout(
        () => setPasteMessage(null),
        isError ? 5000 : 2600,
      );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [pasteMessage]);


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
        .map((key) => runtimeAllColumns.find((column) => column.key === key))
        .filter((column): column is ColumnDefinition => Boolean(column)),
    [columnOrder, runtimeAllColumns],
  );


  const activeFilterCount =
    Object.keys(columnFilters).length;

  function normalizedFilterCellValue(
    row: SmartSheetRow,
    columnKey: string,
  ) {
    const state =
      stateMap[
        cellStateKey(
          row.id,
          columnKey,
        )
      ];

    const overlay =
      spreadsheetCellOverlayMap.get(
        `${row.id}:${columnKey}`,
      );

    /*
     * Filters must evaluate the value the customer can actually see.
     * A spreadsheet overlay wins over the hidden business value and
     * over an underlying SAME state. Intentional overlay blanks therefore
     * behave as true visible blanks for filtering.
     */
    const value =
      !overlay &&
      state?.mode === "same"
        ? "SAME"
        : getSpreadsheetValue(
            row,
            columnKey,
          );

    return value === null ||
      value === undefined
      ? ""
      : String(value);
  }

  function rowMatchesFilter(
    row: SmartSheetRow,
    columnKey: string,
    filter: ColumnFilter,
  ) {
    const definition =
      runtimeAllColumns.find(
        (column) =>
          column.key === columnKey,
      );

    if (!definition) {
      return true;
    }

    const raw =
      normalizedFilterCellValue(
        row,
        columnKey,
      );

    const trimmed =
      raw.trim();

    const isBlank =
      trimmed === "";

    if (filter.operator === "is_blank") {
      return isBlank;
    }

    if (filter.operator === "is_not_blank") {
      return !isBlank;
    }

    if (filter.operator === "values") {
      const selected =
        new Set(
          filter.selectedValues ?? [],
        );

      return selected.has(raw);
    }

    if (definition.type === "text") {
      const source =
        trimmed.toLocaleLowerCase();

      const target =
        String(
          filter.value ?? "",
        )
          .trim()
          .toLocaleLowerCase();

      if (filter.operator === "contains") {
        return source.includes(target);
      }

      if (filter.operator === "not_contains") {
        return !source.includes(target);
      }

      if (filter.operator === "equals") {
        return source === target;
      }

      if (filter.operator === "starts_with") {
        return source.startsWith(target);
      }

      if (filter.operator === "ends_with") {
        return source.endsWith(target);
      }

      return true;
    }

    const numericValue =
      Number(
        trimmed
          .replace(/[€%]/g, "")
          .replace(",", "."),
      );

    const target =
      Number(
        String(filter.value ?? "")
          .trim()
          .replace(/[€%]/g, "")
          .replace(",", "."),
      );

    const target2 =
      Number(
        String(filter.value2 ?? "")
          .trim()
          .replace(/[€%]/g, "")
          .replace(",", "."),
      );

    if (!Number.isFinite(numericValue)) {
      return false;
    }

    if (filter.operator === "equals") {
      return Number.isFinite(target) &&
        numericValue === target;
    }

    if (filter.operator === "gt") {
      return Number.isFinite(target) &&
        numericValue > target;
    }

    if (filter.operator === "gte") {
      return Number.isFinite(target) &&
        numericValue >= target;
    }

    if (filter.operator === "lt") {
      return Number.isFinite(target) &&
        numericValue < target;
    }

    if (filter.operator === "lte") {
      return Number.isFinite(target) &&
        numericValue <= target;
    }

    if (filter.operator === "between") {
      return Number.isFinite(target) &&
        Number.isFinite(target2) &&
        numericValue >= Math.min(target, target2) &&
        numericValue <= Math.max(target, target2);
    }

    return true;
  }

  const filteredRows =
    useMemo(
      () =>
        rows.filter((row) =>
          Object.entries(
            columnFilters,
          ).every(
            ([columnKey, filter]) =>
              rowMatchesFilter(
                row,
                columnKey,
                filter,
              ),
          ),
        ),
      [
        rows,
        columnFilters,
        stateMap,
        spreadsheetCellOverlayMap,
      ],
    );


  const findMatches =
    useMemo<FindMatch[]>(() => {
      const query =
        findQuery
          .trim()
          .toLocaleLowerCase();

      if (!query) {
        return [];
      }

      const matches: FindMatch[] = [];

      for (
        let rowIndex = 0;
        rowIndex < filteredRows.length;
        rowIndex += 1
      ) {
        const row =
          filteredRows[rowIndex];

        for (
          let columnIndex = 0;
          columnIndex < visibleColumns.length;
          columnIndex += 1
        ) {
          const column =
            visibleColumns[columnIndex];

          const state =
            stateMap[
              cellStateKey(
                row.id,
                column.key,
              )
            ];

          const overlay =
            spreadsheetCellOverlayMap.get(
              `${row.id}:${column.key}`,
            );

          /*
           * Find must search the value the customer can actually see.
           * A spreadsheet overlay wins over the hidden business value
           * and over an underlying SAME state.
           */
          const rawValue =
            !overlay &&
            state?.mode === "same"
              ? "SAME"
              : getSpreadsheetValue(
                  row,
                  column.key,
                );

          const textValue =
            rawValue === null ||
            rawValue === undefined
              ? ""
              : String(rawValue);

          if (
            textValue
              .toLocaleLowerCase()
              .includes(query)
          ) {
            matches.push({
              rowId:
                row.id,
              rowIndex,
              columnKey:
                column.key,
              columnIndex,
            });
          }
        }
      }

      return matches;
    }, [
      findQuery,
      filteredRows,
      visibleColumns,
      stateMap,
      spreadsheetCellOverlayMap,
    ]);

  const activeFindMatch =
    findMatches.length > 0
      ? findMatches[
          Math.min(
            activeFindMatchIndex,
            findMatches.length - 1,
          )
        ]
      : null;


  useEffect(() => {
    setActiveFindMatchIndex(0);
  }, [
    findQuery,
  ]);

  useEffect(() => {
    if (
      selectedCell &&
      !filteredRows.some(
        (row) =>
          row.id === selectedCell.rowId,
      )
    ) {
      setSelectedCell(null);
      setRangeAnchor(null);
      setRangeEnd(null);

      window.dispatchEvent(
        new CustomEvent(
          "samzy:smart-sheet-selection",
          {
            detail: null,
          },
        ),
      );
    }
  }, [
    filteredRows,
    selectedCell,
  ]);


  const selectedRowIds = useMemo(() => {
    if (!selectedRowRange) {
      return [];
    }

    return filteredRows
      .slice(
        selectedRowRange.startRow,
        selectedRowRange.endRow + 1,
      )
      .map((row) => row.id);
  }, [filteredRows, selectedRowRange]);

  const selectedRowCount =
    selectedRowIds.length;

  const rowOutlineGroupAnchorMap =
    useMemo(() => {
      const map =
        new Map<string, RowOutlineGroup>();

      const rowOrder =
        new Map(
          rows.map(
            (row, index) => [
              row.id,
              index,
            ],
          ),
        );

      for (const group of rowOutlineGroups) {
        const orderedMembers =
          group.rowIds
            .filter(
              (rowId) =>
                rowOrder.has(rowId),
            )
            .sort(
              (left, right) =>
                (rowOrder.get(left) ?? 0) -
                (rowOrder.get(right) ?? 0),
            );

        const anchor =
          orderedMembers[0];

        if (anchor) {
          map.set(anchor, group);
        }
      }

      return map;
    }, [
      rowOutlineGroups,
      rows,
    ]);

  const rowOutlineGroupHiddenIdSet =
    useMemo(() => {
      const hidden =
        new Set<string>();

      const rowOrder =
        new Map(
          rows.map(
            (row, index) => [
              row.id,
              index,
            ],
          ),
        );

      for (const group of rowOutlineGroups) {
        if (!group.collapsed) {
          continue;
        }

        const orderedMembers =
          group.rowIds
            .filter(
              (rowId) =>
                rowOrder.has(rowId),
            )
            .sort(
              (left, right) =>
                (rowOrder.get(left) ?? 0) -
                (rowOrder.get(right) ?? 0),
            );

        for (
          let index = 1;
          index < orderedMembers.length;
          index += 1
        ) {
          hidden.add(
            orderedMembers[index],
          );
        }
      }

      return hidden;
    }, [
      rowOutlineGroups,
      rows,
    ]);

  const selectionTouchesRowGroup =
    useMemo(() => {
      if (selectedRowIds.length === 0) {
        return false;
      }

      const selectedSet =
        new Set(selectedRowIds);

      return rowOutlineGroups.some(
        (group) =>
          group.rowIds.some(
            (rowId) =>
              selectedSet.has(rowId),
          ),
      );
    }, [
      rowOutlineGroups,
      selectedRowIds,
    ]);


  const filterEditorColumn =
    filterEditorColumnKey
      ? runtimeAllColumns.find(
          (column) =>
            column.key ===
            filterEditorColumnKey,
        ) ?? null
      : null;

  const filterEditorUniqueValues =
    useMemo(() => {
      if (!filterEditorColumnKey) {
        return [] as string[];
      }

      return Array.from(
        new Set(
          rows.map((row) =>
            normalizedFilterCellValue(
              row,
              filterEditorColumnKey,
            ),
          ),
        ),
      )
        .sort((a, b) => {
          const aBlank =
            a.trim() === "";
          const bBlank =
            b.trim() === "";

          if (aBlank && bBlank) return 0;
          if (aBlank) return 1;
          if (bBlank) return -1;

          if (
            filterEditorColumn?.type !== "text"
          ) {
            const aNumber =
              Number(a);
            const bNumber =
              Number(b);

            if (
              Number.isFinite(aNumber) &&
              Number.isFinite(bNumber)
            ) {
              return aNumber - bNumber;
            }
          }

          return a.localeCompare(
            b,
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            },
          );
        })
        .slice(0, 100);
    }, [
      rows,
      filterEditorColumnKey,
      filterEditorColumn?.type,
      stateMap,
      spreadsheetCellOverlayMap,
    ]);

  const frozenColumnOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    let left = ROW_NUMBER_WIDTH;

    for (
      let index = 0;
      index < Math.min(
        frozenColumnCount,
        visibleColumns.length,
      );
      index += 1
    ) {
      const column =
        visibleColumns[index];

      offsets[column.key] = left;

      left +=
        columnWidths[column.key] ??
        column.width;
    }

    return offsets;
  }, [
    frozenColumnCount,
    visibleColumns,
    columnWidths,
  ]);

  const frozenRowOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    let top =
      LETTER_ROW_HEIGHT +
      GROUP_ROW_HEIGHT +
      COLUMN_HEADER_HEIGHT;

    for (
      let index = 0;
      index < Math.min(
        frozenRowCount,
        filteredRows.length,
      );
      index += 1
    ) {
      const row = filteredRows[index];

      offsets[row.id] = top;

      top +=
        rowHeights[row.id] ??
        PRODUCT_ROW_HEIGHT;
    }

    return offsets;
  }, [
    frozenRowCount,
    filteredRows,
    rowHeights,
  ]);

  const selectedColumnKeys = useMemo(() => {
    if (!selectedColumnRange) {
      return [];
    }

    return visibleColumns
      .slice(
        selectedColumnRange.startColumn,
        selectedColumnRange.endColumn + 1,
      )
      .map((column) => column.key);
  }, [selectedColumnRange, visibleColumns]);

  const selectedOptionalColumnKeys = useMemo(
    () =>
      selectedColumnKeys.filter((key) =>
        runtimeAllColumns.some(
          (column) =>
            column.key === key &&
            column.optional,
        ),
      ),
    [selectedColumnKeys],
  );

  const selectedCustomColumnKeys = useMemo(
    () =>
      selectedColumnKeys.filter((key) =>
        sheetColumns.some(
          (column) =>
            column.column_key === key &&
            !column.is_system,
        ),
      ),
    [
      selectedColumnKeys,
      sheetColumns,
    ],
  );

  function customColumnValidationValues(
    columnKey: string,
  ) {
    const override =
      columnValidationOverrides[columnKey];

    if (override !== undefined) {
      return override ?? [];
    }

    const metadata =
      sheetColumns.find(
        (column) =>
          column.column_key === columnKey,
      );

    return (
      listValidationFromMetadata(
        metadata?.metadata,
      )?.values ?? []
    );
  }

  useEffect(() => {
    if (selectedCustomColumnKeys.length !== 1) {
      setColumnValidationDraft("");
      return;
    }

    setColumnValidationDraft(
      customColumnValidationValues(
        selectedCustomColumnKeys[0],
      ).join("\n"),
    );
  }, [
    selectedCustomColumnKeys,
    sheetColumns,
    columnValidationOverrides,
  ]);

  function customColumnConditionalFormat(
    columnKey: string,
  ) {
    const override =
      columnConditionalFormatOverrides[columnKey];

    if (override !== undefined) {
      return override ?? undefined;
    }

    const metadata = sheetColumns.find(
      (column) =>
        column.column_key === columnKey,
    );

    return conditionalFormatFromMetadata(
      metadata?.metadata,
    );
  }

  useEffect(() => {
    if (selectedCustomColumnKeys.length !== 1) {
      setConditionalFormatOperator("equals");
      setConditionalFormatValue("");
      setConditionalFormatFillColor("#fff2cc");
      setConditionalFormatTextColor("#7a5d00");
      return;
    }

    const rule = customColumnConditionalFormat(
      selectedCustomColumnKeys[0],
    );

    setConditionalFormatOperator(
      rule?.operator ?? "equals",
    );
    setConditionalFormatValue(rule?.value ?? "");
    setConditionalFormatFillColor(
      rule?.fillColor ?? "#fff2cc",
    );
    setConditionalFormatTextColor(
      rule?.textColor ?? "#7a5d00",
    );
  }, [
    selectedCustomColumnKeys,
    sheetColumns,
    columnConditionalFormatOverrides,
  ]);

  function canonicalizeSemanticRole(
    value: string,
  ) {
    return value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80);
  }

  const semanticRoleAliases: Record<
    string,
    { canonicalRole: string; language: string }
  > = {
    sale_price: { canonicalRole: "selling_price", language: "en" },
    sales_price: { canonicalRole: "selling_price", language: "en" },
    selling_price: { canonicalRole: "selling_price", language: "en" },
    retail_price: { canonicalRole: "selling_price", language: "en" },
    preco_de_venda: { canonicalRole: "selling_price", language: "pt" },
    preco_venda: { canonicalRole: "selling_price", language: "pt" },
    prix_de_vente: { canonicalRole: "selling_price", language: "fr" },
    precio_de_venta: { canonicalRole: "selling_price", language: "es" },
    verkaufspreis: { canonicalRole: "selling_price", language: "de" },
    prezzo_di_vendita: { canonicalRole: "selling_price", language: "it" },
    verkoopprijs: { canonicalRole: "selling_price", language: "nl" },

    supplier_price: { canonicalRole: "supplier_cost", language: "en" },
    supplier_cost: { canonicalRole: "supplier_cost", language: "en" },
    purchase_price: { canonicalRole: "supplier_cost", language: "en" },
    purchase_cost: { canonicalRole: "supplier_cost", language: "en" },
    buying_price: { canonicalRole: "supplier_cost", language: "en" },
    cost_price: { canonicalRole: "supplier_cost", language: "en" },
    preco_fornecedor: { canonicalRole: "supplier_cost", language: "pt" },
    custo_fornecedor: { canonicalRole: "supplier_cost", language: "pt" },
    preco_de_compra: { canonicalRole: "supplier_cost", language: "pt" },
    prix_fournisseur: { canonicalRole: "supplier_cost", language: "fr" },
    precio_proveedor: { canonicalRole: "supplier_cost", language: "es" },
    einkaufspreis: { canonicalRole: "supplier_cost", language: "de" },
    prezzo_di_acquisto: { canonicalRole: "supplier_cost", language: "it" },
    inkoopprijs: { canonicalRole: "supplier_cost", language: "nl" },

    product: { canonicalRole: "product_name", language: "en" },
    product_name: { canonicalRole: "product_name", language: "en" },
    item: { canonicalRole: "product_name", language: "en" },
    item_name: { canonicalRole: "product_name", language: "en" },
    description: { canonicalRole: "product_name", language: "en" },
    product_description: { canonicalRole: "product_name", language: "en" },
    descricao: { canonicalRole: "product_name", language: "pt" },
    produit: { canonicalRole: "product_name", language: "fr" },
    producto: { canonicalRole: "product_name", language: "es" },
    artikel: { canonicalRole: "product_name", language: "de" },
    prodotto: { canonicalRole: "product_name", language: "it" },
    productomschrijving: { canonicalRole: "product_name", language: "nl" },

    qty: { canonicalRole: "quantity", language: "en" },
    quantity: { canonicalRole: "quantity", language: "en" },
    units: { canonicalRole: "quantity", language: "en" },
    quantidade: { canonicalRole: "quantity", language: "pt" },
    quantite: { canonicalRole: "quantity", language: "fr" },
    cantidad: { canonicalRole: "quantity", language: "es" },
    menge: { canonicalRole: "quantity", language: "de" },
    quantita: { canonicalRole: "quantity", language: "it" },
    aantal: { canonicalRole: "quantity", language: "nl" },

    sku: { canonicalRole: "sku", language: "und" },
    supplier_sku: { canonicalRole: "supplier_sku", language: "en" },
    vendor_sku: { canonicalRole: "supplier_sku", language: "en" },
    barcode: { canonicalRole: "barcode", language: "en" },
    ean: { canonicalRole: "barcode", language: "und" },
    ean_13: { canonicalRole: "barcode", language: "und" },
    gtin: { canonicalRole: "barcode", language: "und" },

    vat: { canonicalRole: "vat_rate", language: "en" },
    vat_rate: { canonicalRole: "vat_rate", language: "en" },
    iva: { canonicalRole: "vat_rate", language: "pt" },
    iva_percent: { canonicalRole: "vat_rate", language: "pt" },
    tax_rate: { canonicalRole: "vat_rate", language: "en" },
    tva: { canonicalRole: "vat_rate", language: "fr" },
    mwst: { canonicalRole: "vat_rate", language: "de" },
    mehrwertsteuer: { canonicalRole: "vat_rate", language: "de" },
    btw: { canonicalRole: "vat_rate", language: "nl" },

    logistics: { canonicalRole: "logistics_cost", language: "en" },
    logistics_cost: { canonicalRole: "logistics_cost", language: "en" },
    logistic_cost: { canonicalRole: "logistics_cost", language: "en" },
    transport: { canonicalRole: "logistics_cost", language: "und" },
    transport_cost: { canonicalRole: "logistics_cost", language: "en" },
    shipping_cost: { canonicalRole: "logistics_cost", language: "en" },
    freight_cost: { canonicalRole: "logistics_cost", language: "en" },
    custo_logistico: { canonicalRole: "logistics_cost", language: "pt" },
    custo_de_transporte: { canonicalRole: "logistics_cost", language: "pt" },
    frais_de_transport: { canonicalRole: "logistics_cost", language: "fr" },
    gastos_de_transporte: { canonicalRole: "logistics_cost", language: "es" },
    transportkosten: { canonicalRole: "logistics_cost", language: "de" },
    costo_di_trasporto: { canonicalRole: "logistics_cost", language: "it" },

    margin: { canonicalRole: "margin", language: "en" },
    margin_percent: { canonicalRole: "margin", language: "en" },
    profit_margin: { canonicalRole: "margin", language: "en" },
    margem: { canonicalRole: "margin", language: "pt" },
    margem_percent: { canonicalRole: "margin", language: "pt" },
    marge: { canonicalRole: "margin", language: "fr" },
    margen: { canonicalRole: "margin", language: "es" },
    gewinnmarge: { canonicalRole: "margin", language: "de" },
    margine: { canonicalRole: "margin", language: "it" },
    markup: { canonicalRole: "markup", language: "en" },
    markup_percent: { canonicalRole: "markup", language: "en" },

    wholesale_price: { canonicalRole: "wholesale_price", language: "en" },
    wholesale_selling_price: { canonicalRole: "wholesale_price", language: "en" },
    preco_grossista: { canonicalRole: "wholesale_price", language: "pt" },
    wholesale_margin: { canonicalRole: "wholesale_margin", language: "en" },
    wholesale_margin_percent: { canonicalRole: "wholesale_margin", language: "en" },
    margem_grossista: { canonicalRole: "wholesale_margin", language: "pt" },

    discount: { canonicalRole: "discount", language: "en" },
    discount_percent: { canonicalRole: "discount", language: "en" },
    desconto: { canonicalRole: "discount", language: "pt" },
    remise: { canonicalRole: "discount", language: "fr" },
    descuento: { canonicalRole: "discount", language: "es" },
    rabatt: { canonicalRole: "discount", language: "de" },
    sconto: { canonicalRole: "discount", language: "it" },
    korting: { canonicalRole: "discount", language: "nl" },

    line_total: { canonicalRole: "line_total", language: "en" },
    item_total: { canonicalRole: "line_total", language: "en" },
    subtotal: { canonicalRole: "subtotal", language: "und" },
    total: { canonicalRole: "total", language: "und" },
  };

  function resolveSemanticRole(value: string) {
    const normalizedRole = canonicalizeSemanticRole(value);
    const alias = semanticRoleAliases[normalizedRole];
    return {
      normalizedRole,
      canonicalRole: alias?.canonicalRole ?? normalizedRole,
      recognized: Boolean(normalizedRole && alias),
      recognizedLanguage: alias?.language ?? null,
    };
  }

  function semanticLanguageLabel(language: string | null) {
    const labels: Record<string, string> = {
      en: "English",
      pt: "Portuguese",
      fr: "French",
      es: "Spanish",
      de: "German",
      it: "Italian",
      nl: "Dutch",
      und: "Language-neutral",
    };

    return language ? labels[language] ?? language.toUpperCase() : null;
  }

  function canonicalRoleFromBusinessMapping(
    businessMapping: unknown,
  ) {
    if (
      !businessMapping ||
      typeof businessMapping !== "object" ||
      Array.isArray(businessMapping)
    ) {
      return "";
    }

    const canonicalRole =
      (businessMapping as Record<string, unknown>)
        .canonical_role;

    return typeof canonicalRole === "string"
      ? canonicalRole
      : "";
  }

  function customColumnCanonicalRole(
    columnKey: string,
  ) {
    const override =
      columnCanonicalRoleOverrides[columnKey];

    if (override !== undefined) {
      return override ?? "";
    }

    const column =
      sheetColumns.find(
        (candidate) =>
          candidate.column_key === columnKey,
      );

    return canonicalRoleFromBusinessMapping(
      column?.business_mapping,
    );
  }

  function customColumnSemanticRole(
    columnKey: string,
  ) {
    const override =
      columnSemanticRoleOverrides[columnKey];

    if (override !== undefined) {
      return override ?? "";
    }

    return (
      sheetColumns.find(
        (column) =>
          column.column_key === columnKey,
      )?.semantic_role ?? ""
    );
  }

  useEffect(() => {
    if (selectedCustomColumnKeys.length !== 1) {
      setSemanticRoleDraft("");
      return;
    }

    setSemanticRoleDraft(
      customColumnSemanticRole(
        selectedCustomColumnKeys[0],
      ),
    );
  }, [
    selectedCustomColumnKeys,
    sheetColumns,
    columnSemanticRoleOverrides,
  ]);

  const availableColumns = runtimeAllColumns.filter(
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

  const fillSourceRange = useMemo<CellRange | null>(() => {
    if (selectedRange) {
      return selectedRange;
    }

    if (!selectedCell) {
      return null;
    }

    return {
      startRow: selectedCell.rowIndex,
      endRow: selectedCell.rowIndex,
      startColumn: selectedCell.columnIndex,
      endColumn: selectedCell.columnIndex,
    };
  }, [selectedRange, selectedCell]);

  const fillPreviewRange = useMemo<CellRange | null>(() => {
    if (!isFilling || !fillSourceRange || !fillTarget) {
      return null;
    }

    /*
     * V2: the fill handle is completely free in two dimensions.
     * The pointer defines the opposite corner of the expanded rectangle.
     * There is no horizontal/vertical axis lock.
     */
    return {
      startRow: Math.min(fillSourceRange.startRow, fillTarget.rowIndex),
      endRow: Math.max(fillSourceRange.endRow, fillTarget.rowIndex),
      startColumn: Math.min(
        fillSourceRange.startColumn,
        fillTarget.columnIndex,
      ),
      endColumn: Math.max(
        fillSourceRange.endColumn,
        fillTarget.columnIndex,
      ),
    };
  }, [isFilling, fillSourceRange, fillTarget]);

  function getState(rowId: string, columnKey: string) {
    return stateMap[cellStateKey(rowId, columnKey)];
  }

  function getSpreadsheetValue(
    row: SmartSheetRow,
    columnKey: string,
  ): string | number | null {
    const overlay =
      spreadsheetCellOverlayMap.get(`${row.id}:${columnKey}`);

    if (!overlay) {
      return getRowValue(row, columnKey);
    }

    if (overlay.is_blank) {
      return null;
    }

    if (
      typeof overlay.value === "string" ||
      typeof overlay.value === "number"
    ) {
      return overlay.value;
    }

    if (overlay.value === null || overlay.value === undefined) {
      return null;
    }

    return String(overlay.value);
  }

  function isCustomSpreadsheetColumn(
    columnKey: string,
  ) {
    return Boolean(
      sheetColumns.find(
        (column) =>
          column.column_key === columnKey &&
          !column.is_system,
      ),
    );
  }

  /*
   * Formula Engine V4.6b — explicit dependency graph.
   *
   * precedentsByFormula maps each formula address to every cell address it
   * reads. dependentsByCell is the reverse index: given any changed cell,
   * SAMZY can immediately identify the downstream formula cells affected by
   * that change. Ranges are expanded to their individual addresses.
   */
  const formulaDependencyGraph = useMemo(() => {
    const precedentsByFormula =
      new Map<string, Set<string>>();

    const dependentsByCell =
      new Map<string, Set<string>>();

    const formulaAddresses =
      new Set<string>();

    for (
      let rowIndex = 0;
      rowIndex < rows.length;
      rowIndex += 1
    ) {
      const row = rows[rowIndex];

      if (!row) {
        continue;
      }

      for (
        let columnIndex = 0;
        columnIndex < visibleColumns.length;
        columnIndex += 1
      ) {
        const column =
          visibleColumns[columnIndex];

        if (
          !column ||
          !isCustomSpreadsheetColumn(
            column.key,
          )
        ) {
          continue;
        }

        const storedValue =
          getSpreadsheetValue(
            row,
            column.key,
          );

        if (
          typeof storedValue !== "string" ||
          !storedValue.trim().startsWith("=")
        ) {
          continue;
        }

        const formulaAddress =
          `${columnLetter(columnIndex)}${rowIndex + 1}`;

        const precedents =
          extractFormulaDependencyAddresses(
            storedValue,
            rows.length,
            visibleColumns.length,
          );

        formulaAddresses.add(
          formulaAddress,
        );

        precedentsByFormula.set(
          formulaAddress,
          precedents,
        );

        for (const precedent of precedents) {
          const dependents =
            dependentsByCell.get(
              precedent,
            ) ??
            new Set<string>();

          dependents.add(
            formulaAddress,
          );

          dependentsByCell.set(
            precedent,
            dependents,
          );
        }
      }
    }

    return {
      precedentsByFormula,
      dependentsByCell,
      formulaAddresses,
    };
  }, [
    rows,
    visibleColumns,
    spreadsheetCellOverlayMap,
    sheetColumns,
  ]);

  function formulaGraphHasCycle(
    startAddress: string,
  ) {
    const visiting =
      new Set<string>();

    const visited =
      new Set<string>();

    function visit(
      address: string,
    ): boolean {
      if (visiting.has(address)) {
        return true;
      }

      if (visited.has(address)) {
        return false;
      }

      visiting.add(address);

      const precedents =
        formulaDependencyGraph
          .precedentsByFormula
          .get(address);

      if (precedents) {
        for (const precedent of precedents) {
          if (
            !formulaDependencyGraph
              .formulaAddresses
              .has(precedent)
          ) {
            continue;
          }

          if (visit(precedent)) {
            return true;
          }
        }
      }

      visiting.delete(address);
      visited.add(address);

      return false;
    }

    return visit(
      startAddress,
    );
  }

  /*
   * Formula Engine V4.6a — render-level formula result cache.
   *
   * The cache lives for one React render only, so any sheet/row/overlay/column
   * change naturally invalidates it on the next render. During a render, a
   * formula address is evaluated once and reused by every dependent formula
   * and every display read, avoiding repeated recursive work.
   */
  const formulaEvaluationCache =
    new Map<string, FormulaDisplayValue>();

  function formulaDisplayValue(
    row: SmartSheetRow,
    columnKey: string,
  ): FormulaDisplayValue | undefined {
    const storedValue =
      getSpreadsheetValue(
        row,
        columnKey,
      );

    if (
      !isCustomSpreadsheetColumn(
        columnKey,
      ) ||
      typeof storedValue !== "string" ||
      !storedValue.trim().startsWith("=")
    ) {
      return undefined;
    }

    const rowIndex =
      rows.findIndex(
        (candidate) =>
          candidate.id === row.id,
      );

    const columnIndex =
      visibleColumns.findIndex(
        (column) =>
          column.key === columnKey,
      );

    if (
      rowIndex < 0 ||
      columnIndex < 0
    ) {
      return "#REF!";
    }

    return evaluateFormulaAtAddress(
      storedValue,
      rowIndex,
      columnIndex,
      new Set<string>(),
    );
  }

  function evaluateFormulaAtAddress(
    formula: string,
    rowIndex: number,
    columnIndex: number,
    visiting: Set<string>,
  ): FormulaDisplayValue {
    const address =
      `${columnLetter(columnIndex)}${rowIndex + 1}`;

    if (visiting.has(address)) {
      return "#CIRC!";
    }

    /*
     * The graph can identify a circular chain before recursive evaluation
     * walks the entire chain. Recursive visiting remains as a safety net.
     */
    if (
      visiting.size === 0 &&
      formulaDependencyGraph
        .formulaAddresses
        .has(address) &&
      formulaGraphHasCycle(
        address,
      )
    ) {
      return "#CIRC!";
    }

    const cacheKey =
      `${address}\u0000${formula}`;

    if (
      formulaEvaluationCache.has(
        cacheKey,
      )
    ) {
      return (
        formulaEvaluationCache.get(
          cacheKey,
        ) ?? null
      );
    }

    const nextVisiting =
      new Set(visiting);

    nextVisiting.add(address);

    try {
      const resolveReferenceValue = (
        reference: string,
      ) => {
        const parsed =
          parseCellReference(
            reference,
          );

        if (!parsed) {
          throw new FormulaEngineError(
            "#REF!",
          );
        }

        const referencedRow =
          rows[
            parsed.rowIndex
          ];

        const referencedColumn =
          visibleColumns[
            parsed.columnIndex
          ];

        if (
          !referencedRow ||
          !referencedColumn
        ) {
          throw new FormulaEngineError(
            "#REF!",
          );
        }

        const referencedStoredValue =
          getSpreadsheetValue(
            referencedRow,
            referencedColumn.key,
          );

        if (
          isCustomSpreadsheetColumn(
            referencedColumn.key,
          ) &&
          typeof referencedStoredValue ===
            "string" &&
          referencedStoredValue
            .trim()
            .startsWith("=")
        ) {
          const nested =
            evaluateFormulaAtAddress(
              referencedStoredValue,
              parsed.rowIndex,
              parsed.columnIndex,
              nextVisiting,
            );

          if (
            typeof nested === "string" &&
            nested.startsWith("#")
          ) {
            throw new FormulaEngineError(
              nested,
            );
          }

          return nested;
        }

        return referencedStoredValue;
      };

      const result =
        evaluateArithmeticFormula(
          formula,
          (reference) =>
            formulaNumberValue(
              resolveReferenceValue(
                reference,
              ),
            ),
          (
            startReference,
            endReference,
          ) => {
          const start =
            parseCellReference(
              startReference,
            );

          const end =
            parseCellReference(
              endReference,
            );

          if (
            !start ||
            !end
          ) {
            throw new FormulaEngineError(
              "#REF!",
            );
          }

          const startRow =
            Math.min(
              start.rowIndex,
              end.rowIndex,
            );

          const endRow =
            Math.max(
              start.rowIndex,
              end.rowIndex,
            );

          const startColumn =
            Math.min(
              start.columnIndex,
              end.columnIndex,
            );

          const endColumn =
            Math.max(
              start.columnIndex,
              end.columnIndex,
            );

          const values: unknown[] =
            [];

          for (
            let rangeRow = startRow;
            rangeRow <= endRow;
            rangeRow += 1
          ) {
            for (
              let rangeColumn = startColumn;
              rangeColumn <= endColumn;
              rangeColumn += 1
            ) {
              const reference =
                `${columnLetter(rangeColumn)}${rangeRow + 1}`;

              values.push(
                resolveReferenceValue(
                  reference,
                ),
              );
            }
          }

            return values;
          },
        );

      formulaEvaluationCache.set(
        cacheKey,
        result,
      );

      return result;
    } catch (error) {
      const result =
        error instanceof
        FormulaEngineError
          ? error.code
          : "#ERROR!";

      formulaEvaluationCache.set(
        cacheKey,
        result,
      );

      return result;
    }
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
    const overlay =
      spreadsheetCellOverlayMap.get(`${row.id}:${columnKey}`);
    const rawValue = getSpreadsheetValue(row, columnKey);

    /*
     * If a visual spreadsheet overlay occupies this slot, the underlying
     * business cell's SAME state no longer controls what the customer sees
     * or edits in that visual cell.
     */
    const isSame =
      !overlay &&
      state?.mode === "same";

    const displayValue =
      isSame
        ? "SAME"
        : formulaBarValue(rawValue, column.type);

    const editValue =
      isSame
        ? "SAME"
        : column.type === "boolean"
          ? booleanCellValue(rawValue)
            ? "TRUE"
            : "FALSE"
          : rawValue === null || rawValue === undefined
            ? ""
            : String(rawValue);

    const driver =
      column.driverKey
        ? (row[column.driverKey] as SmartSheetDriver)
        : null;

    const allowSame =
      overlay
        ? false
        : column.driverKey && column.sameWhen
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

    /*
     * Find/Replace V1:
     * if the user manually selects a cell that is one of the current
     * search matches, make that exact cell the active find match.
     * This prevents Replace from acting on a stale previous match.
     */
    if (findQuery.trim() !== "") {
      const matchingFindIndex =
        findMatches.findIndex(
          (match) =>
            match.rowId === row.id &&
            match.columnKey === columnKey,
        );

      if (matchingFindIndex >= 0) {
        setActiveFindMatchIndex(
          matchingFindIndex,
        );
      }
    }

    // A normal cell selection exits whole-row / whole-column selection mode.
    setRowSelectionAnchor(null);
    setRowSelectionEnd(null);
    setColumnSelectionAnchor(null);
    setColumnSelectionEnd(null);

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

  function selectColumn(
    columnIndex: number,
    extendRange: boolean,
  ) {
    if (
      columnIndex < 0 ||
      columnIndex >= visibleColumns.length
    ) {
      return;
    }

    setColumnMenu(null);
    setColumnInsertSide(null);

    // Whole-column selection is mutually exclusive with cell and row selection.
    setSelectedCell(null);
    setRangeAnchor(null);
    setRangeEnd(null);
    setRowSelectionAnchor(null);
    setRowSelectionEnd(null);
    setRowMenu(null);

    window.dispatchEvent(
      new CustomEvent("samzy:smart-sheet-selection", {
        detail: null,
      }),
    );

    if (
      extendRange &&
      columnSelectionAnchor !== null
    ) {
      setColumnSelectionEnd(
        columnIndex,
      );
    } else {
      setColumnSelectionAnchor(
        columnIndex,
      );
      setColumnSelectionEnd(
        columnIndex,
      );
    }

    requestAnimationFrame(() => {
      gridRef.current?.focus({
        preventScroll: true,
      });
    });
  }


  function openColumnMenu(
    event: MouseEvent<HTMLTableCellElement>,
    columnIndex: number,
  ) {
    event.preventDefault();
    event.stopPropagation();

    const currentlySelected =
      selectedColumnRange &&
      columnIndex >= selectedColumnRange.startColumn &&
      columnIndex <= selectedColumnRange.endColumn;

    if (!currentlySelected) {
      setSelectedCell(null);
      setRangeAnchor(null);
      setRangeEnd(null);
      setRowSelectionAnchor(null);
      setRowSelectionEnd(null);
      setRowMenu(null);

      setColumnSelectionAnchor(
        columnIndex,
      );
      setColumnSelectionEnd(
        columnIndex,
      );

      window.dispatchEvent(
        new CustomEvent("samzy:smart-sheet-selection", {
          detail: null,
        }),
      );
    }

    setColumnInsertSide(null);
    setRenameColumnEditor(null);

    setColumnMenu({
      x: event.clientX,
      y: event.clientY,
      columnIndex,
    });
  }


  function customColumnDecimalPlaces(
    columnKey: string,
  ) {
    const override =
      columnDecimalPlaceOverrides[
        columnKey
      ];

    if (
      typeof override === "number"
    ) {
      return override;
    }

    const metadata =
      sheetColumns.find(
        (column) =>
          column.column_key ===
            columnKey &&
          !column.is_system,
      );

    return typeof metadata?.decimal_places === "number"
      ? Math.max(
          0,
          Math.min(
            6,
            metadata.decimal_places,
          ),
        )
      : 2;
  }


  function effectiveCellFormat(
    rowId: string,
    columnKey: string,
  ): CellFormat | undefined {
    const explicit =
      cellFormats[
        formatKey(
          rowId,
          columnKey,
        )
      ];

    const metadata =
      sheetColumns.find(
        (column) =>
          column.column_key ===
            columnKey &&
          !column.is_system,
      );

    if (!metadata) {
      return explicit;
    }

    const presentation =
      columnPresentationOverrides[
        columnKey
      ] ??
      metadata.data_type;

    const columnNumberFormat =
      presentation === "number" ||
      presentation === "currency" ||
      presentation === "percentage"
        ? presentation
        : null;

    if (
      !explicit &&
      !columnNumberFormat
    ) {
      return undefined;
    }

    const base =
      explicit ?? plainCellFormat();

    return {
      ...base,
      numberFormat:
        explicit?.numberFormat ??
        columnNumberFormat,
      decimalPlaces:
        explicit?.decimalPlaces ??
        (
          columnNumberFormat
            ? customColumnDecimalPlaces(
                columnKey,
              )
            : null
        ),
    };
  }


  function selectedCustomColumnPresentation() {
    if (
      selectedColumnKeys.length !== 1 ||
      selectedCustomColumnKeys.length !== 1
    ) {
      return null;
    }

    const columnKey =
      selectedCustomColumnKeys[0];

    const override =
      columnPresentationOverrides[
        columnKey
      ];

    if (override) {
      return override;
    }

    const metadata =
      sheetColumns.find(
        (column) =>
          column.column_key ===
          columnKey,
      );

    if (
      metadata?.data_type === "number" ||
      metadata?.data_type === "currency" ||
      metadata?.data_type === "percentage" ||
      metadata?.data_type === "date" ||
      metadata?.data_type === "datetime" ||
      metadata?.data_type === "time" ||
      metadata?.data_type === "boolean"
    ) {
      return metadata.data_type;
    }

    return "text";
  }


  async function changeSelectedCustomColumnPresentation(
    presentation:
      | "text"
      | "number"
      | "currency"
      | "percentage"
      | "date"
      | "datetime"
      | "time"
      | "boolean",
  ) {
    if (
      isUpdatingColumnPresentation ||
      selectedColumnKeys.length !== 1 ||
      selectedCustomColumnKeys.length !== 1
    ) {
      return;
    }

    const columnKey =
      selectedCustomColumnKeys[0];

    setIsUpdatingColumnPresentation(
      true,
    );
    setPasteMessage(null);

    try {
      const result =
        await setSmartSheetColumnPresentation({
          sheetId:
            sheet.id,
          columnKey,
          presentation,
        });

      if (
        !result.ok ||
        !result.column
      ) {
        setPasteMessage(
          result.message ??
            "Unable to update column type.",
        );
        return;
      }

      const persistedPresentation =
        result.column.data_type as
          | "text"
          | "number"
          | "currency"
          | "percentage"
          | "date"
          | "datetime"
          | "time"
          | "boolean";

      setColumnPresentationOverrides(
        (current) => ({
          ...current,
          [columnKey]:
            persistedPresentation,
        }),
      );

      setColumnMenu(null);
      setColumnInsertSide(null);
      setRenameColumnEditor(null);

      const label =
        persistedPresentation === "text"
          ? "Text / General"
          : persistedPresentation === "number"
            ? "Number"
            : persistedPresentation === "currency"
              ? "Currency"
              : persistedPresentation === "percentage"
                ? "Percentage"
                : persistedPresentation === "date"
                  ? "Date"
                  : persistedPresentation === "datetime"
                    ? "Date & Time"
                    : persistedPresentation === "time"
                      ? "Time"
                      : "Checkbox / Boolean";

      setPasteMessage(
        `Column type changed to ${label}.`,
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to update column type.",
      );
    } finally {
      setIsUpdatingColumnPresentation(
        false,
      );
    }
  }


  async function applySelectedCustomColumnListValidation() {
    if (
      isUpdatingColumnValidation ||
      selectedColumnKeys.length !== 1 ||
      selectedCustomColumnKeys.length !== 1
    ) {
      return;
    }

    if (
      selectedCustomColumnPresentation() !== "text"
    ) {
      setPasteMessage(
        "Dropdown validation V1 is available for Text / General custom columns.",
      );
      return;
    }

    const values =
      Array.from(
        new Set(
          columnValidationDraft
            .split(/[\n,]/)
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        ),
      );

    if (values.length === 0) {
      setPasteMessage(
        "Enter at least one dropdown value.",
      );
      return;
    }

    const columnKey =
      selectedCustomColumnKeys[0];

    setIsUpdatingColumnValidation(true);
    setPasteMessage(null);

    try {
      const result =
        await setSmartSheetColumnListValidation({
          sheetId: sheet.id,
          columnKey,
          values,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ??
            "Unable to update dropdown validation.",
        );
        return;
      }

      setColumnValidationOverrides(
        (current) => ({
          ...current,
          [columnKey]: values,
        }),
      );

      setColumnValidationDraft(
        values.join("\n"),
      );
      setPasteMessage(
        `Dropdown saved with ${values.length} value${values.length === 1 ? "" : "s"}.`,
      );
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to update dropdown validation.",
      );
    } finally {
      setIsUpdatingColumnValidation(false);
    }
  }

  async function clearSelectedCustomColumnListValidation() {
    if (
      isUpdatingColumnValidation ||
      selectedCustomColumnKeys.length !== 1
    ) {
      return;
    }

    const columnKey =
      selectedCustomColumnKeys[0];

    setIsUpdatingColumnValidation(true);
    setPasteMessage(null);

    try {
      const result =
        await setSmartSheetColumnListValidation({
          sheetId: sheet.id,
          columnKey,
          values: [],
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ??
            "Unable to clear dropdown validation.",
        );
        return;
      }

      setColumnValidationOverrides(
        (current) => ({
          ...current,
          [columnKey]: null,
        }),
      );
      setColumnValidationDraft("");
      setPasteMessage(
        "Dropdown validation cleared.",
      );
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to clear dropdown validation.",
      );
    } finally {
      setIsUpdatingColumnValidation(false);
    }
  }


  async function applySelectedCustomColumnSemanticMapping() {
    if (
      isUpdatingSemanticMapping ||
      selectedCustomColumnKeys.length !== 1
    ) {
      return;
    }

    const semanticRole = semanticRoleDraft.trim();

    if (!semanticRole) {
      setPasteMessage(
        "Enter a semantic role, or use Clear mapping.",
      );
      return;
    }

    if (semanticRole.length > 120) {
      setPasteMessage(
        "Semantic role must be 120 characters or fewer.",
      );
      return;
    }

    const columnKey = selectedCustomColumnKeys[0];

    setIsUpdatingSemanticMapping(true);
    setPasteMessage(null);

    try {
      const result =
        await setSmartSheetColumnSemanticMapping({
          sheetId: sheet.id,
          columnKey,
          semanticRole,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ??
            "Unable to update semantic mapping.",
        );
        return;
      }

      const persistedCanonicalRole =
        canonicalRoleFromBusinessMapping(
          result.column?.business_mapping,
        ) ||
        resolveSemanticRole(
          semanticRole,
        ).canonicalRole;

      setColumnSemanticRoleOverrides(
        (current) => ({
          ...current,
          [columnKey]: semanticRole,
        }),
      );

      setColumnCanonicalRoleOverrides(
        (current) => ({
          ...current,
          [columnKey]:
            persistedCanonicalRole,
        }),
      );

      setSemanticRoleDraft(semanticRole);
      const semanticResolution =
        resolveSemanticRole(semanticRole);
      setPasteMessage(
        semanticResolution.recognized
          ? `SAMZY recognizes "${semanticRole}" as ${persistedCanonicalRole}${semanticLanguageLabel(semanticResolution.recognizedLanguage) ? ` (${semanticLanguageLabel(semanticResolution.recognizedLanguage)})` : ""}.`
          : `SAMZY keeps "${semanticRole}" as your custom meaning (${persistedCanonicalRole}).`,
      );
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to update semantic mapping.",
      );
    } finally {
      setIsUpdatingSemanticMapping(false);
    }
  }

  async function clearSelectedCustomColumnSemanticMapping() {
    if (
      isUpdatingSemanticMapping ||
      selectedCustomColumnKeys.length !== 1
    ) {
      return;
    }

    const columnKey = selectedCustomColumnKeys[0];

    setIsUpdatingSemanticMapping(true);
    setPasteMessage(null);

    try {
      const result =
        await setSmartSheetColumnSemanticMapping({
          sheetId: sheet.id,
          columnKey,
          semanticRole: null,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ??
            "Unable to clear semantic mapping.",
        );
        return;
      }

      setColumnSemanticRoleOverrides(
        (current) => ({
          ...current,
          [columnKey]: null,
        }),
      );

      setColumnCanonicalRoleOverrides(
        (current) => ({
          ...current,
          [columnKey]: null,
        }),
      );

      setSemanticRoleDraft("");
      setPasteMessage(
        "Semantic mapping cleared. Spreadsheet values were preserved.",
      );
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to clear semantic mapping.",
      );
    } finally {
      setIsUpdatingSemanticMapping(false);
    }
  }


  async function applySelectedCustomColumnConditionalFormatting() {
    if (
      isUpdatingConditionalFormat ||
      selectedCustomColumnKeys.length !== 1
    ) {
      return;
    }

    const value = conditionalFormatValue.trim();
    if (!value) {
      setPasteMessage(
        "Enter a value for the conditional formatting rule.",
      );
      return;
    }

    const columnKey = selectedCustomColumnKeys[0];
    const rule: ConditionalFormatRule = {
      operator: conditionalFormatOperator,
      value,
      fillColor: conditionalFormatFillColor,
      textColor: conditionalFormatTextColor,
    };

    setIsUpdatingConditionalFormat(true);
    setPasteMessage(null);

    try {
      const result =
        await setSmartSheetColumnConditionalFormatting({
          sheetId: sheet.id,
          columnKey,
          rule,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ??
            "Unable to update conditional formatting.",
        );
        return;
      }

      setColumnConditionalFormatOverrides(
        (current) => ({
          ...current,
          [columnKey]: rule,
        }),
      );
      setPasteMessage(
        "Conditional formatting rule saved.",
      );
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to update conditional formatting.",
      );
    } finally {
      setIsUpdatingConditionalFormat(false);
    }
  }

  async function clearSelectedCustomColumnConditionalFormatting() {
    if (
      isUpdatingConditionalFormat ||
      selectedCustomColumnKeys.length !== 1
    ) {
      return;
    }

    const columnKey = selectedCustomColumnKeys[0];
    setIsUpdatingConditionalFormat(true);
    setPasteMessage(null);

    try {
      const result =
        await setSmartSheetColumnConditionalFormatting({
          sheetId: sheet.id,
          columnKey,
          rule: null,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ??
            "Unable to clear conditional formatting.",
        );
        return;
      }

      setColumnConditionalFormatOverrides(
        (current) => ({
          ...current,
          [columnKey]: null,
        }),
      );
      setConditionalFormatValue("");
      setPasteMessage(
        "Conditional formatting cleared.",
      );
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to clear conditional formatting.",
      );
    } finally {
      setIsUpdatingConditionalFormat(false);
    }
  }

  async function changeSelectedCustomColumnDecimalPlaces(
    decimalPlaces: number,
  ) {
    if (
      isUpdatingColumnDecimals ||
      selectedColumnKeys.length !== 1 ||
      selectedCustomColumnKeys.length !== 1
    ) {
      return;
    }

    const columnKey =
      selectedCustomColumnKeys[0];

    const presentation =
      selectedCustomColumnPresentation();

    if (
      presentation !== "number" &&
      presentation !== "currency" &&
      presentation !== "percentage"
    ) {
      setPasteMessage(
        "Decimal places require a Number, Currency, or Percentage custom column.",
      );
      return;
    }

    setIsUpdatingColumnDecimals(
      true,
    );
    setPasteMessage(null);

    try {
      const result =
        await setSmartSheetColumnDecimalPlaces({
          sheetId:
            sheet.id,
          columnKey,
          decimalPlaces,
        });

      if (
        !result.ok ||
        !result.column
      ) {
        setPasteMessage(
          result.message ??
            "Unable to update column decimal places.",
        );
        return;
      }

      const persistedDecimals =
        typeof result.column.decimal_places === "number"
          ? result.column.decimal_places
          : decimalPlaces;

      setColumnDecimalPlaceOverrides(
        (current) => ({
          ...current,
          [columnKey]:
            persistedDecimals,
        }),
      );

      setColumnMenu(null);
      setColumnInsertSide(null);
      setRenameColumnEditor(null);

      setPasteMessage(
        `Column decimal places changed to ${persistedDecimals}.`,
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to update column decimal places.",
      );
    } finally {
      setIsUpdatingColumnDecimals(
        false,
      );
    }
  }


  function beginRenameSelectedCustomColumn() {
    if (
      selectedColumnKeys.length !== 1 ||
      selectedCustomColumnKeys.length !== 1
    ) {
      setPasteMessage(
        "Select one custom column to rename.",
      );
      return;
    }

    const columnKey =
      selectedCustomColumnKeys[0];

    const currentColumn =
      runtimeAllColumns.find(
        (column) =>
          column.key === columnKey,
      );

    if (!currentColumn) {
      setPasteMessage(
        "Custom column not found.",
      );
      return;
    }

    setColumnInsertSide(null);
    setRenameColumnEditor({
      columnKey,
      label: currentColumn.label,
    });
  }

  async function submitRenameSelectedCustomColumn() {
    if (
      !renameColumnEditor ||
      isRenamingColumn
    ) {
      return;
    }

    const trimmedLabel =
      renameColumnEditor.label.trim();

    if (!trimmedLabel) {
      setPasteMessage(
        "Column name is required.",
      );
      return;
    }

    if (trimmedLabel.length > 80) {
      setPasteMessage(
        "Column name must be 80 characters or fewer.",
      );
      return;
    }

    const currentColumn =
      runtimeAllColumns.find(
        (column) =>
          column.key === renameColumnEditor.columnKey,
      );

    if (
      currentColumn &&
      currentColumn.label === trimmedLabel
    ) {
      setRenameColumnEditor(null);
      setColumnMenu(null);
      setColumnInsertSide(null);
      return;
    }

    setIsRenamingColumn(true);

    const result =
      await renameSmartSheetColumn({
        sheetId: sheet.id,
        columnKey:
          renameColumnEditor.columnKey,
        label: trimmedLabel,
      });

    setIsRenamingColumn(false);

    if (
      !result.ok ||
      !result.column
    ) {
      setPasteMessage(
        result.message ??
          "Unable to rename column.",
      );
      return;
    }

    const persistedLabel =
      result.column.label;

    setColumnLabelOverrides((current) => ({
      ...current,
      [renameColumnEditor.columnKey]:
        persistedLabel,
    }));

    setRenameColumnEditor(null);
    setColumnMenu(null);
    setColumnInsertSide(null);
    setPasteMessage(
      `Column renamed to ${persistedLabel}.`,
    );

    router.refresh();
  }

  async function hideSelectedColumns() {
    if (
      !selectedColumnRange ||
      selectedColumnKeys.length === 0
    ) {
      return;
    }

    const customKeys =
      selectedColumnKeys.filter(
        (key) =>
          sheetColumns.some(
            (column) =>
              column.column_key === key &&
              !column.is_system,
          ),
      );

    /*
     * Persist custom-column visibility first. If persistence fails, leave the
     * visible grid unchanged so browser state never disagrees with Supabase.
     * Existing system-column hide behavior remains local in this V1.
     */
    for (const key of customKeys) {
      const result =
        await setSmartSheetColumnHidden({
          sheetId: sheet.id,
          columnKey: key,
          hidden: true,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ??
            "Unable to hide custom column.",
        );
        return;
      }
    }

    const selectedKeys =
      new Set(
        selectedColumnKeys,
      );

    setColumnOrder((current) => {
      const next =
        current.filter(
          (key) =>
            !selectedKeys.has(key),
        );

      /*
       * Keep the grid structurally usable. If every visible column was
       * selected, retain the first selected column rather than leaving a
       * zero-column spreadsheet surface.
       */
      if (next.length === 0) {
        return current.filter(
          (key) =>
            key ===
            selectedColumnKeys[0],
        );
      }

      /*
       * Remember the exact visible order at the moment of hiding.
       * Each hidden column keeps the same snapshot so a multi-column hide
       * can be restored one column at a time, in any order, while still
       * returning every column to its former position.
       */
      const savedOrders = {
        ...hiddenColumnOrderRef.current,
      };

      for (const key of selectedColumnKeys) {
        savedOrders[key] = [...current];
      }

      saveHiddenColumnOrders(
        savedOrders,
      );

      return next;
    });

    clearSelection();
    setColumnMenu(null);
    setColumnInsertSide(null);

    setPasteMessage(
      selectedColumnKeys.length === 1
        ? "1 column hidden."
        : `${selectedColumnKeys.length} columns hidden.`,
    );

    if (customKeys.length > 0) {
      router.refresh();
    }
  }

  async function deleteSelectedCustomColumn() {
    if (
      selectedColumnKeys.length !== 1 ||
      selectedCustomColumnKeys.length !== 1
    ) {
      setPasteMessage(
        "System business columns are protected. Select one custom column to delete.",
      );
      return;
    }

    const columnKey =
      selectedCustomColumnKeys[0];

    const definition =
      runtimeAllColumns.find(
        (column) =>
          column.key === columnKey,
      );

    const confirmed =
      window.confirm(
        `Delete "${definition?.label ?? "this custom column"}" and its spreadsheet values/formatting? This does not change SAMZY business data.`,
      );

    if (!confirmed) {
      return;
    }

    setPasteMessage(null);

    try {
      const result =
        await deleteSmartSheetColumn({
          sheetId:
            sheet.id,
          columnKey,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ??
            "Unable to delete column.",
        );
        return;
      }

      setColumnOrder((current) =>
        current.filter(
          (key) =>
            key !== columnKey,
        ),
      );

      setColumnWidths((current) => {
        const next = {
          ...current,
        };
        delete next[columnKey];
        return next;
      });

      clearSelection();
      setColumnMenu(null);
      setColumnInsertSide(null);

      setPasteMessage(
        `${definition?.label ?? "Custom column"} deleted.`,
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete column.",
      );
    }
  }


  async function insertNewCustomColumn(
    side: "left" | "right",
  ) {
    if (
      !selectedColumnRange ||
      selectedColumnKeys.length === 0
    ) {
      return;
    }

    const anchorKey =
      side === "left"
        ? visibleColumns[
            selectedColumnRange.startColumn
          ]?.key
        : visibleColumns[
            selectedColumnRange.endColumn
          ]?.key;

    if (!anchorKey) {
      setPasteMessage(
        "Unable to resolve insertion position.",
      );
      return;
    }

    const insertionIndex =
      side === "left"
        ? selectedColumnRange.startColumn
        : selectedColumnRange.endColumn + 1;

    setPasteMessage(null);

    try {
      const result =
        await addSmartSheetColumn({
          sheetId:
            sheet.id,
          label:
            "New Column",
          dataType:
            "text",
          anchorColumnKey:
            anchorKey,
          side,
        });

      if (
        !result.ok ||
        !result.column
      ) {
        setPasteMessage(
          result.message ??
            "Unable to insert new column.",
        );
        return;
      }

      const newKey =
        result.column.column_key;

      setColumnOrder((current) => {
        const next =
          [...current];

        next.splice(
          Math.max(
            0,
            Math.min(
              insertionIndex,
              next.length,
            ),
          ),
          0,
          newKey,
        );

        return next;
      });

      setColumnWidths((current) => ({
        ...current,
        [newKey]:
          result.column?.width ?? 120,
      }));

      setColumnSelectionAnchor(
        insertionIndex,
      );
      setColumnSelectionEnd(
        insertionIndex,
      );

      setColumnMenu(null);
      setColumnInsertSide(null);
      setPasteMessage(
        `New column inserted ${side}.`,
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to insert new column.",
      );
    }
  }


  async function insertAvailableColumn(
    key: string,
    side: "left" | "right",
  ) {
    if (
      !selectedColumnRange ||
      columnOrder.includes(key)
    ) {
      return;
    }

    const selectedStartKey =
      visibleColumns[
        selectedColumnRange.startColumn
      ]?.key;

    const selectedEndKey =
      visibleColumns[
        selectedColumnRange.endColumn
      ]?.key;

    const anchorKey =
      side === "left"
        ? selectedStartKey
        : selectedEndKey;

    if (!anchorKey) {
      setPasteMessage(
        "Unable to resolve insertion position.",
      );
      return;
    }

    const fullOrder =
      runtimeAllColumns.map(
        (column) => column.key,
      );

    const movingIndex =
      fullOrder.indexOf(key);

    if (movingIndex === -1) {
      setPasteMessage(
        "Column metadata not found.",
      );
      return;
    }

    const nextFullOrder =
      [...fullOrder];

    nextFullOrder.splice(
      movingIndex,
      1,
    );

    const anchorIndex =
      nextFullOrder.indexOf(
        anchorKey,
      );

    if (anchorIndex === -1) {
      setPasteMessage(
        "Insertion anchor not found.",
      );
      return;
    }

    const targetFullIndex =
      side === "left"
        ? anchorIndex
        : anchorIndex + 1;

    nextFullOrder.splice(
      targetFullIndex,
      0,
      key,
    );

    /*
     * Persist structure before changing the visible grid. The stable
     * smart_sheet_columns UUID and column_key are untouched; only position
     * changes, so existing smart_sheet_cells remain attached to the column.
     */
    const reorderResult =
      await reorderSmartSheetColumns({
        sheetId: sheet.id,
        orderedColumnKeys:
          nextFullOrder,
      });

    if (!reorderResult.ok) {
      setPasteMessage(
        reorderResult.message ??
          "Unable to insert column.",
      );
      return;
    }

    const customMetadata =
      sheetColumns.find(
        (column) =>
          column.column_key === key &&
          !column.is_system,
      );

    if (
      customMetadata?.hidden
    ) {
      const visibilityResult =
        await setSmartSheetColumnHidden({
          sheetId: sheet.id,
          columnKey: key,
          hidden: false,
        });

      if (!visibilityResult.ok) {
        setPasteMessage(
          visibilityResult.message ??
            "Unable to restore custom column.",
        );
        return;
      }
    }

    const insertionIndex =
      side === "left"
        ? selectedColumnRange.startColumn
        : selectedColumnRange.endColumn + 1;

    setColumnOrder((current) => {
      if (current.includes(key)) {
        return current;
      }

      const next =
        [...current];

      next.splice(
        Math.max(
          0,
          Math.min(
            insertionIndex,
            next.length,
          ),
        ),
        0,
        key,
      );

      return next;
    });

    setColumnSelectionAnchor(
      insertionIndex,
    );
    setColumnSelectionEnd(
      insertionIndex,
    );

    setColumnMenu(null);
    setColumnInsertSide(null);

    const definition =
      runtimeAllColumns.find(
        (column) =>
          column.key === key,
      );

    setPasteMessage(
      `${definition?.label ?? "Column"} inserted ${side}.`,
    );

    router.refresh();
  }

  function moveSelection(
    rowIndex: number,
    columnIndex: number,
  ) {
    if (
      filteredRows.length === 0 ||
      visibleColumns.length === 0
    ) {
      return;
    }

    const nextRowIndex = Math.max(
      0,
      Math.min(filteredRows.length - 1, rowIndex),
    );

    const nextColumnIndex = Math.max(
      0,
      Math.min(visibleColumns.length - 1, columnIndex),
    );

    const nextRow = filteredRows[nextRowIndex];
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

  function openFindReplace(
    includeReplace = false,
  ) {
    setShowFindReplace(true);

    if (includeReplace) {
      setShowReplaceControls(true);
    }

    requestAnimationFrame(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    });
  }

  function closeFindReplace() {
    setShowFindReplace(false);
    setShowReplaceControls(false);
    setActiveFindMatchIndex(0);

    requestAnimationFrame(() => {
      gridRef.current?.focus({
        preventScroll: true,
      });
    });
  }

  function navigateToFindMatch(
    requestedIndex: number,
  ) {
    if (findMatches.length === 0) {
      return;
    }

    const normalizedIndex =
      (
        requestedIndex %
          findMatches.length +
        findMatches.length
      ) %
      findMatches.length;

    const match =
      findMatches[normalizedIndex];

    const row =
      filteredRows[
        match.rowIndex
      ];

    const column =
      visibleColumns[
        match.columnIndex
      ];

    if (!row || !column) {
      return;
    }

    setActiveFindMatchIndex(
      normalizedIndex,
    );

    selectCell(
      row,
      match.rowIndex,
      column.key,
      match.columnIndex,
    );

    requestAnimationFrame(() => {
      const element =
        gridRef.current?.querySelector(
          `[data-sheet-cell="${row.id}:${column.key}"]`,
        ) as HTMLElement | null;

      element?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    });
  }

  function nextFindMatch() {
    navigateToFindMatch(
      activeFindMatchIndex + 1,
    );
  }

  function previousFindMatch() {
    navigateToFindMatch(
      activeFindMatchIndex - 1,
    );
  }

  function replaceTextCaseInsensitive(
    source: string,
    search: string,
    replacement: string,
  ) {
    if (!search) {
      return source;
    }

    const sourceLower =
      source.toLocaleLowerCase();

    const searchLower =
      search.toLocaleLowerCase();

    let cursor = 0;
    let result = "";

    while (cursor < source.length) {
      const index =
        sourceLower.indexOf(
          searchLower,
          cursor,
        );

      if (index === -1) {
        result +=
          source.slice(cursor);
        break;
      }

      result +=
        source.slice(
          cursor,
          index,
        ) +
        replacement;

      cursor =
        index +
        search.length;
    }

    return result;
  }

  function replacementCellValue(
    match: FindMatch,
  ) {
    const row =
      filteredRows[
        match.rowIndex
      ];

    const column =
      visibleColumns[
        match.columnIndex
      ];

    if (!row || !column) {
      return null;
    }

    const state =
      getState(
        row.id,
        column.key,
      );

    const overlay =
      spreadsheetCellOverlayMap.get(
        `${row.id}:${column.key}`,
      );

    /*
     * Replace must transform the visible spreadsheet value.
     * If this slot has an overlay, never read the hidden semantic
     * business field or an underlying SAME state as the source text.
     */
    const rawValue =
      !overlay &&
      state?.mode === "same"
        ? "SAME"
        : getSpreadsheetValue(
            row,
            column.key,
          );

    const source =
      rawValue === null ||
      rawValue === undefined
        ? ""
        : String(rawValue);

    const replaced =
      replaceTextCaseInsensitive(
        source,
        findQuery.trim(),
        replaceQuery,
      );

    if (column.type === "text") {
      return replaced;
    }

    const normalized =
      replaced
        .trim()
        .replace(/\s/g, "")
        .replace(/[€%]/g, "")
        .replace(",", ".");

    if (normalized === "") {
      return null;
    }

    const numeric =
      Number(normalized);

    return Number.isFinite(numeric)
      ? String(numeric)
      : null;
  }

  async function replaceCurrentFindMatch() {
    if (
      !activeFindMatch ||
      isReplacing ||
      findQuery.trim() === ""
    ) {
      return;
    }

    const nextValue =
      replacementCellValue(
        activeFindMatch,
      );

    if (nextValue === null) {
      setPasteMessage(
        "The replacement is not valid for this numeric cell.",
      );
      return;
    }

    setIsReplacing(true);
    setPasteMessage(null);

    try {
      const result =
        await pasteSmartSheetCells({
          sheetId:
            sheet.id,
          cells: [
            {
              rowId:
                activeFindMatch.rowId,
              columnKey:
                activeFindMatch.columnKey,
              value:
                nextValue,
            },
          ],
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ||
            "Unable to replace this match.",
        );
        return;
      }

      setPasteMessage(
        "1 match replaced.",
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to replace this match.",
      );
    } finally {
      setIsReplacing(false);
    }
  }

  async function replaceAllFindMatches() {
    if (
      findMatches.length === 0 ||
      isReplacing ||
      findQuery.trim() === ""
    ) {
      return;
    }

    const cells: {
      rowId: string;
      columnKey: string;
      value: string | null;
      preserveBusiness?: boolean;
      sourceRowId?: string | null;
      sourceColumnKey?: string | null;
    }[] = [];

    let skipped = 0;

    for (const match of findMatches) {
      const nextValue =
        replacementCellValue(
          match,
        );

      if (nextValue === null) {
        skipped += 1;
        continue;
      }

      cells.push({
        rowId:
          match.rowId,
        columnKey:
          match.columnKey,
        value:
          nextValue,
      });
    }

    if (cells.length === 0) {
      setPasteMessage(
        "No compatible matches could be replaced.",
      );
      return;
    }

    if (cells.length > 1000) {
      setPasteMessage(
        "Replace All is limited to 1,000 cells at a time.",
      );
      return;
    }

    setIsReplacing(true);
    setPasteMessage(null);

    try {
      /*
       * One batch action = one Smart Sheet history operation.
       * Therefore Replace All is undone/redone as one operation.
       */
      const result =
        await pasteSmartSheetCells({
          sheetId:
            sheet.id,
          cells,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ||
            "Unable to replace all matches.",
        );
        return;
      }

      setPasteMessage(
        skipped > 0
          ? `${cells.length} matches replaced. ${skipped} incompatible numeric matches skipped.`
          : `${cells.length} matches replaced.`,
      );

      setActiveFindMatchIndex(0);

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to replace all matches.",
      );
    } finally {
      setIsReplacing(false);
    }
  }


  function formatKey(rowId: string, columnKey: string) {
    return `${rowId}:${columnKey}`;
  }

  async function reloadCellFormats() {
    const result = await getSmartSheetCellFormats({ sheetId: sheet.id });
    if (!result.ok) {
      setPasteMessage(result.message ?? "Unable to load cell formatting.");
      return;
    }

    const next: Record<string, CellFormat> = {};
    for (const format of result.formats ?? []) {
      next[formatKey(format.row_id, format.column_key)] = {
        bold: Boolean(format.bold),
        italic: Boolean(format.italic),
        underline: Boolean(format.underline),
        alignment:
          format.text_alignment === "left" ||
          format.text_alignment === "center" ||
          format.text_alignment === "right"
            ? format.text_alignment
            : null,
        fontSize: typeof format.font_size === "number" ? format.font_size : null,
        numberFormat:
          format.number_format === "general" ||
          format.number_format === "number" ||
          format.number_format === "currency" ||
          format.number_format === "percentage"
            ? format.number_format
            : null,
        decimalPlaces:
          typeof format.decimal_places === "number" ? format.decimal_places : null,
        fillColor:
          typeof format.fill_color === "string" ? format.fill_color : null,
        textColor:
          typeof format.text_color === "string" ? format.text_color : null,
        borderTop: Boolean(format.border_top),
        borderRight: Boolean(format.border_right),
        borderBottom: Boolean(format.border_bottom),
        borderLeft: Boolean(format.border_left),
      };
    }
    setCellFormats(next);
  }

  useEffect(() => {
    void reloadCellFormats();
    // Formatting is sheet-scoped and reloaded when the server sheet payload changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.id, rows, cellStates]);

  function selectedFormattingCells() {
    const cells: Array<{ rowId: string; columnKey: string }> = [];

    if (selectedRowRange) {
      for (let r = selectedRowRange.startRow; r <= selectedRowRange.endRow; r += 1) {
        const row = filteredRows[r];
        if (!row) continue;
        for (const column of visibleColumns) {
          cells.push({ rowId: row.id, columnKey: column.key });
        }
      }
      return cells;
    }

    if (selectedColumnRange) {
      for (const row of filteredRows) {
        for (let c = selectedColumnRange.startColumn; c <= selectedColumnRange.endColumn; c += 1) {
          const column = visibleColumns[c];
          if (column) cells.push({ rowId: row.id, columnKey: column.key });
        }
      }
      return cells;
    }

    const range = selectedRange ?? (selectedCell
      ? {
          startRow: selectedCell.rowIndex,
          endRow: selectedCell.rowIndex,
          startColumn: selectedCell.columnIndex,
          endColumn: selectedCell.columnIndex,
        }
      : null);

    if (!range) return cells;

    for (let r = range.startRow; r <= range.endRow; r += 1) {
      const row = filteredRows[r];
      if (!row) continue;
      for (let c = range.startColumn; c <= range.endColumn; c += 1) {
        const column = visibleColumns[c];
        if (column) cells.push({ rowId: row.id, columnKey: column.key });
      }
    }
    return cells;
  }

  function selectionHasFormat(format: CellFormatKind) {
    const cells = selectedFormattingCells();
    return cells.length > 0 && cells.every((cell) =>
      Boolean(cellFormats[formatKey(cell.rowId, cell.columnKey)]?.[format]),
    );
  }

  async function clearSelectionFormatting() {
    if (isFormatting) return;

    const cells = selectedFormattingCells();

    if (cells.length === 0) {
      setPasteMessage("Select one or more cells first.");
      return;
    }

    if (cells.length > 2000) {
      setPasteMessage(
        "Clear Formatting is limited to 2,000 cells at a time.",
      );
      return;
    }

    setIsFormatting(true);
    setPasteMessage(null);

    try {
      const result = await clearSmartSheetCellFormatting({
        sheetId: sheet.id,
        cells,
      });

      if (!result.ok) {
        setPasteMessage(
          result.message ?? "Unable to clear cell formatting.",
        );
        return;
      }

      setCellFormats((current) => {
        const next = { ...current };

        for (const cell of cells) {
          delete next[
            formatKey(cell.rowId, cell.columnKey)
          ];
        }

        return next;
      });

      setFormatPainterSource(null);
      setPasteMessage(
        result.message ?? "Formatting cleared.",
      );

      await refreshHistoryStatus();
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to clear cell formatting.",
      );
    } finally {
      setIsFormatting(false);
    }
  }


  async function toggleSelectionFormat(format: CellFormatKind) {
    if (isFormatting) return;
    const cells = selectedFormattingCells();
    if (cells.length === 0) {
      setPasteMessage("Select one or more cells first.");
      return;
    }
    if (cells.length > 2000) {
      setPasteMessage("Formatting is limited to 2,000 cells at a time.");
      return;
    }

    const enabled = !selectionHasFormat(format);
    setIsFormatting(true);
    setPasteMessage(null);
    try {
      const result = await applySmartSheetCellFormatting({
        sheetId: sheet.id,
        cells,
        format,
        enabled,
      });
      if (!result.ok) {
        setPasteMessage(result.message ?? "Unable to format selected cells.");
        return;
      }
      setCellFormats((current) => {
        const next = { ...current };
        for (const cell of cells) {
          const key = formatKey(cell.rowId, cell.columnKey);
          const previous = next[key] ?? { bold: false, italic: false, underline: false, alignment: null, fontSize: null, numberFormat: null, decimalPlaces: null, fillColor: null, textColor: null, borderTop: false, borderRight: false, borderBottom: false, borderLeft: false };
          const updated = { ...previous, [format]: enabled } as CellFormat;
          if (!updated.bold && !updated.italic && !updated.underline && !updated.alignment) delete next[key];
          else next[key] = updated;
        }
        return next;
      });
      setPasteMessage(result.message ?? "Formatting updated.");
      router.refresh();
    } catch (error) {
      setPasteMessage(error instanceof Error ? error.message : "Unable to format selected cells.");
    } finally {
      setIsFormatting(false);
    }
  }

  function selectionHasAlignment(alignment: Align) {
    const cells = selectedFormattingCells();
    return cells.length > 0 && cells.every((cell) =>
      cellFormats[formatKey(cell.rowId, cell.columnKey)]?.alignment === alignment,
    );
  }

  async function applySelectionAlignment(alignment: Align) {
    if (isFormatting) return;
    const cells = selectedFormattingCells();
    if (cells.length === 0) {
      setPasteMessage("Select one or more cells first.");
      return;
    }
    if (cells.length > 2000) {
      setPasteMessage("Formatting is limited to 2,000 cells at a time.");
      return;
    }

    setIsFormatting(true);
    setPasteMessage(null);
    try {
      const result = await applySmartSheetCellFormatting({
        sheetId: sheet.id,
        cells,
        format:
          alignment === "left"
            ? "align_left"
            : alignment === "center"
              ? "align_center"
              : "align_right",
        enabled: true,
      });
      if (!result.ok) {
        setPasteMessage(result.message ?? "Unable to align selected cells.");
        return;
      }
      setCellFormats((current) => {
        const next = { ...current };
        for (const cell of cells) {
          const key = formatKey(cell.rowId, cell.columnKey);
          const previous = next[key] ?? { bold: false, italic: false, underline: false, alignment: null, fontSize: null, numberFormat: null, decimalPlaces: null, fillColor: null, textColor: null, borderTop: false, borderRight: false, borderBottom: false, borderLeft: false };
          next[key] = { ...previous, alignment };
        }
        return next;
      });
      setPasteMessage(result.message ?? "Alignment updated.");
      router.refresh();
    } catch (error) {
      setPasteMessage(error instanceof Error ? error.message : "Unable to align selected cells.");
    } finally {
      setIsFormatting(false);
    }
  }

  function plainCellFormat(): CellFormat {
    return {
      bold: false,
      italic: false,
      underline: false,
      alignment: null,
      fontSize: null,
      numberFormat: null,
      decimalPlaces: null,
      fillColor: null,
      textColor: null,
      borderTop: false,
      borderRight: false,
      borderBottom: false,
      borderLeft: false,
    };
  }

  function captureFormatPainterSource() {
    if (isFormatting) return;

    const cells = selectedFormattingCells();

    if (cells.length === 0) {
      setPasteMessage("Select a source cell or range first.");
      return;
    }

    if (cells.length > 2000) {
      setPasteMessage("Format Painter is limited to 2,000 source cells.");
      return;
    }

    const formats = cells.map((cell) => ({
      ...plainCellFormat(),
      ...(cellFormats[formatKey(cell.rowId, cell.columnKey)] ?? {}),
    }));

    setFormatPainterSource({ formats });
    setPasteMessage(
      `Format Painter ready (${cells.length} source cell${cells.length === 1 ? "" : "s"}). Select destination cells, then Apply Format.`,
    );
  }

  async function applyFormatPainterToSelection() {
    if (isFormatting || !formatPainterSource) return;

    const destinationCells = selectedFormattingCells();

    if (destinationCells.length === 0) {
      setPasteMessage("Select the destination cell or range first.");
      return;
    }

    if (destinationCells.length > 2000) {
      setPasteMessage("Formatting is limited to 2,000 cells at a time.");
      return;
    }

    const sourceFormats = formatPainterSource.formats;

    const cells = destinationCells.map((cell, index) => {
      const source =
        sourceFormats[index % sourceFormats.length] ??
        plainCellFormat();

      return {
        rowId: cell.rowId,
        columnKey: cell.columnKey,
        format: {
          bold: source.bold,
          italic: source.italic,
          underline: source.underline,
          textAlignment: source.alignment,
          fontSize: source.fontSize,
          numberFormat: source.numberFormat,
          decimalPlaces: source.decimalPlaces,
          fillColor: source.fillColor,
          textColor: source.textColor,
          borderTop: source.borderTop,
          borderRight: source.borderRight,
          borderBottom: source.borderBottom,
          borderLeft: source.borderLeft,
        },
      };
    });

    setIsFormatting(true);
    setPasteMessage(null);

    try {
      const result = await applySmartSheetFormatPainter({
        sheetId: sheet.id,
        cells,
      });

      if (!result.ok) {
        setPasteMessage(
          result.message ?? "Unable to apply Format Painter.",
        );
        return;
      }

      setFormatPainterSource(null);
      await reloadCellFormats();
      setPasteMessage(
        result.message ?? "Format Painter applied.",
      );
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to apply Format Painter.",
      );
    } finally {
      setIsFormatting(false);
    }
  }

  function cancelFormatPainter() {
    setFormatPainterSource(null);
    setPasteMessage("Format Painter cancelled.");
  }


  function selectionTextColor() {
    const cells = selectedFormattingCells();

    if (cells.length === 0) {
      return null;
    }

    const colors = new Set(
      cells.map(
        (cell) =>
          cellFormats[
            `${cell.rowId}:${cell.columnKey}`
          ]?.textColor ?? null,
      ),
    );

    return colors.size === 1
      ? Array.from(colors)[0]
      : null;
  }


  function selectionFillColor() {
    const cells = selectedFormattingCells();
    if (cells.length === 0) return null;

    const colors = cells.map(
      (cell) =>
        cellFormats[
          formatKey(cell.rowId, cell.columnKey)
        ]?.fillColor ?? null,
    );

    return colors.every((color) => color === colors[0])
      ? colors[0]
      : null;
  }

  async function applySelectionTextColor(
    textColor: string | null,
  ) {
    const cells = selectedFormattingCells();

    if (cells.length === 0) {
      setPasteMessage("Select one or more cells first.");
      return;
    }

    setIsFormatting(true);
    setPasteMessage(null);

    try {
      const result =
        await applySmartSheetCellTextColor({
          sheetId: sheet.id,
          cells,
          textColor,
        });

      setPasteMessage(
        result.message ??
          (textColor
            ? "Text color applied."
            : "Text color cleared."),
      );

      if (!result.ok) {
        return;
      }

      await reloadCellFormats();
      router.refresh();
    } finally {
      setIsFormatting(false);
    }
  }


  async function applySelectionFillColor(
    fillColor: string | null,
  ) {
    if (isFormatting) return;

    const cells = selectedFormattingCells();

    if (cells.length === 0) {
      setPasteMessage("Select one or more cells first.");
      return;
    }

    if (cells.length > 2000) {
      setPasteMessage(
        "Formatting is limited to 2,000 cells at a time.",
      );
      return;
    }

    setIsFormatting(true);
    setPasteMessage(null);

    try {
      const result = await applySmartSheetCellFillColor({
        sheetId: sheet.id,
        cells,
        fillColor,
      });

      if (!result.ok) {
        setPasteMessage(
          result.message ?? "Unable to apply fill color.",
        );
        return;
      }

      await reloadCellFormats();
      setPasteMessage(
        result.message ??
          (fillColor
            ? "Fill color applied."
            : "Fill color cleared."),
      );
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to apply fill color.",
      );
    } finally {
      setIsFormatting(false);
    }
  }

  async function applySelectionBorders(
    border: "all" | "outer" | "top" | "right" | "bottom" | "left" | "none",
  ) {
    if (isFormatting) return;
    const cells = selectedFormattingCells();
    if (cells.length === 0) {
      setPasteMessage("Select one or more cells first.");
      return;
    }
    if (cells.length > 2000) {
      setPasteMessage("Formatting is limited to 2,000 cells at a time.");
      return;
    }

    setIsFormatting(true);
    setPasteMessage(null);
    try {
      const result = await applySmartSheetCellBorders({
        sheetId: sheet.id,
        cells,
        border,
      });
      if (!result.ok) {
        setPasteMessage(result.message ?? "Unable to apply borders.");
        return;
      }
      await reloadCellFormats();
      setPasteMessage(result.message ?? "Borders applied.");
      router.refresh();
    } catch (error) {
      setPasteMessage(error instanceof Error ? error.message : "Unable to apply borders.");
    } finally {
      setIsFormatting(false);
    }
  }

  function selectionNumberFormat() {
    const cells = selectedFormattingCells();
    if (cells.length === 0) return null;
    const formats = cells.map((cell) =>
      cellFormats[formatKey(cell.rowId, cell.columnKey)]?.numberFormat ?? "general",
    );
    return formats.every((format) => format === formats[0]) ? formats[0] : null;
  }

  async function applySelectionNumberFormat(
    numberFormat: "general" | "number" | "currency" | "percentage",
  ) {
    if (isFormatting) return;
    const cells = selectedFormattingCells();
    if (cells.length === 0) {
      setPasteMessage("Select one or more cells first.");
      return;
    }
    setIsFormatting(true);
    setPasteMessage(null);
    try {
      const result = await applySmartSheetCellNumberFormat({
        sheetId: sheet.id, cells, numberFormat,
      });
      if (!result.ok) {
        setPasteMessage(result.message ?? "Unable to apply number format.");
        return;
      }
      await reloadCellFormats();
      setPasteMessage(result.message ?? "Number format applied.");
      router.refresh();
    } catch (error) {
      setPasteMessage(error instanceof Error ? error.message : "Unable to apply number format.");
    } finally {
      setIsFormatting(false);
    }
  }

  async function adjustSelectionDecimals(delta: -1 | 1) {
    if (isFormatting) return;
    const cells = selectedFormattingCells();
    if (cells.length === 0) {
      setPasteMessage("Select one or more cells first.");
      return;
    }
    setIsFormatting(true);
    setPasteMessage(null);
    try {
      const result = await adjustSmartSheetCellDecimalPlaces({
        sheetId: sheet.id, cells, delta,
      });
      if (!result.ok) {
        setPasteMessage(result.message ?? "Unable to adjust decimals.");
        return;
      }
      await reloadCellFormats();
      setPasteMessage(result.message ?? "Decimals adjusted.");
      router.refresh();
    } catch (error) {
      setPasteMessage(error instanceof Error ? error.message : "Unable to adjust decimals.");
    } finally {
      setIsFormatting(false);
    }
  }

  function selectionFontSize() {
    const cells = selectedFormattingCells();
    if (cells.length === 0) return null;
    const sizes = cells.map((cell) =>
      cellFormats[formatKey(cell.rowId, cell.columnKey)]?.fontSize ?? 11,
    );
    return sizes.every((size) => size === sizes[0]) ? sizes[0] : null;
  }

  async function applySelectionFontSize(fontSize: number) {
    if (isFormatting) return;
    const cells = selectedFormattingCells();
    if (cells.length === 0) {
      setPasteMessage("Select one or more cells first.");
      return;
    }
    if (cells.length > 2000) {
      setPasteMessage("Formatting is limited to 2,000 cells at a time.");
      return;
    }

    setIsFormatting(true);
    setPasteMessage(null);
    try {
      const result = await applySmartSheetCellFontSize({
        sheetId: sheet.id,
        cells,
        fontSize,
      });
      if (!result.ok) {
        setPasteMessage(result.message ?? "Unable to apply font size.");
        return;
      }
      setCellFormats((current) => {
        const next = { ...current };
        for (const cell of cells) {
          const key = formatKey(cell.rowId, cell.columnKey);
          const previous = next[key] ?? {
            bold: false,
            italic: false,
            underline: false,
            alignment: null,
            fontSize: null,
          };
          next[key] = { ...previous, fontSize };
        }
        return next;
      });
      setPasteMessage(result.message ?? `Font size ${fontSize} applied.`);
      router.refresh();
    } catch (error) {
      setPasteMessage(error instanceof Error ? error.message : "Unable to apply font size.");
    } finally {
      setIsFormatting(false);
    }
  }

  useEffect(() => {
    function handleFormattingShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

      const key = event.key.toLowerCase();
      const format: CellFormatKind | null =
        key === "b" ? "bold" : key === "i" ? "italic" : key === "u" ? "underline" : null;
      if (!format) return;
      event.preventDefault();
      void toggleSelectionFormat(format);
    }

    window.addEventListener("keydown", handleFormattingShortcut);
    return () => window.removeEventListener("keydown", handleFormattingShortcut);
  });

  function sourceFillCell(rowIndex: number, columnIndex: number) {
    const row = filteredRows[rowIndex];
    const column = visibleColumns[columnIndex];

    if (!row || !column) {
      return {
        value: "",
        preserveBusiness: false,
        sourceRowId: null,
        sourceColumnKey: null,
      };
    }

    /*
     * Fill Handle must read the same visible value the user sees. An overlay
     * therefore wins over SAME/business-row data exactly like grid rendering.
     */
    const overlay =
      spreadsheetCellOverlayMap.get(`${row.id}:${column.key}`) ?? null;

    if (overlay) {
      const overlayValue =
        overlay.is_blank || overlay.value === null || overlay.value === undefined
          ? null
          : typeof overlay.value === "string" || typeof overlay.value === "number"
            ? overlay.value
            : String(overlay.value);

      return {
        value:
          overlayValue === null
            ? null
            : String(overlayValue),
        preserveBusiness: true,
        sourceRowId: row.id,
        sourceColumnKey: column.key,
      };
    }

    const state = getState(row.id, column.key);

    if (state?.mode === "same") {
      return {
        value: "SAME",
        preserveBusiness: false,
        sourceRowId: row.id,
        sourceColumnKey: column.key,
      };
    }

    const rawValue = getRowValue(row, column.key);

    return {
      value:
        rawValue === null || rawValue === undefined
          ? ""
          : String(rawValue),
      preserveBusiness: false,
      sourceRowId: row.id,
      sourceColumnKey: column.key,
    };
  }

  function positiveModulo(value: number, divisor: number) {
    return ((value % divisor) + divisor) % divisor;
  }

  async function applyFill() {
    if (
      !fillSourceRange ||
      !fillTarget ||
      isApplyingFill ||
      isPasting ||
      isClearing
    ) {
      return;
    }

    const source = fillSourceRange;

    const expandedRange: CellRange = {
      startRow: Math.min(source.startRow, fillTarget.rowIndex),
      endRow: Math.max(source.endRow, fillTarget.rowIndex),
      startColumn: Math.min(source.startColumn, fillTarget.columnIndex),
      endColumn: Math.max(source.endColumn, fillTarget.columnIndex),
    };

    const noExpansion =
      expandedRange.startRow === source.startRow &&
      expandedRange.endRow === source.endRow &&
      expandedRange.startColumn === source.startColumn &&
      expandedRange.endColumn === source.endColumn;

    if (noExpansion) {
      setIsFilling(false);
      setFillTarget(null);
      return;
    }

    const sourceHeight = source.endRow - source.startRow + 1;
    const sourceWidth = source.endColumn - source.startColumn + 1;

    const cells: {
      rowId: string;
      columnKey: string;
      value: string | null;
      preserveBusiness?: boolean;
      sourceRowId?: string | null;
      sourceColumnKey?: string | null;
    }[] = [];

    /*
     * Fill every destination cell in the expanded 2D rectangle while
     * leaving the original source cells untouched. The source block is
     * tiled in both directions, so a 1x1 source can be dragged anywhere
     * and a multi-cell source pattern repeats naturally across the area.
     */
    for (
      let rowIndex = expandedRange.startRow;
      rowIndex <= expandedRange.endRow;
      rowIndex += 1
    ) {
      const destinationRow = filteredRows[rowIndex];

      if (!destinationRow) {
        continue;
      }

      for (
        let columnIndex = expandedRange.startColumn;
        columnIndex <= expandedRange.endColumn;
        columnIndex += 1
      ) {
        const insideSource =
          rowIndex >= source.startRow &&
          rowIndex <= source.endRow &&
          columnIndex >= source.startColumn &&
          columnIndex <= source.endColumn;

        if (insideSource) {
          continue;
        }

        const destinationColumn = visibleColumns[columnIndex];

        if (!destinationColumn) {
          continue;
        }

        const sourceRowIndex =
          source.startRow +
          positiveModulo(rowIndex - source.startRow, sourceHeight);

        const sourceColumnIndex =
          source.startColumn +
          positiveModulo(columnIndex - source.startColumn, sourceWidth);

        const sourceCell = sourceFillCell(
          sourceRowIndex,
          sourceColumnIndex,
        );

        /*
         * Preserve the original safe numeric-blank behavior for ordinary
         * structured sources. An OVERLAY blank is different: it is an
         * intentional visible blank and must be copied as an overlay so the
         * destination's hidden business value cannot appear.
         */
        if (
          sourceCell.value === "" &&
          destinationColumn.type !== "text" &&
          !sourceCell.preserveBusiness
        ) {
          continue;
        }

        const fillValue =
          typeof sourceCell.value === "string" &&
          sourceCell.value.trim().startsWith("=") &&
          isCustomSpreadsheetColumn(
            destinationColumn.key,
          )
            ? translateFormulaReferences(
                sourceCell.value,
                rowIndex - sourceRowIndex,
                columnIndex - sourceColumnIndex,
              )
            : sourceCell.value;

        cells.push({
          rowId: destinationRow.id,
          columnKey: destinationColumn.key,
          value: fillValue,
          preserveBusiness: sourceCell.preserveBusiness,
          sourceRowId: sourceCell.sourceRowId,
          sourceColumnKey: sourceCell.sourceColumnKey,
        });
      }
    }

    setIsFilling(false);
    setFillTarget(null);

    if (cells.length === 0) {
      setPasteMessage("Nothing to fill from the selected source cells.");
      return;
    }

    if (cells.length > 1000) {
      setPasteMessage("Fill is limited to 1,000 destination cells at a time.");
      return;
    }

    setIsApplyingFill(true);
    setPasteMessage(null);

    try {
      const result = await pasteSmartSheetCells({
        sheetId: sheet.id,
        cells,
      });

      if (!result.ok) {
        setPasteMessage(result.message || "Unable to fill cells.");
        return;
      }

      /*
       * Keep the completed fill rectangle selected, just like a desktop
       * spreadsheet. The active cell stays at the original source cell.
       */
      setRangeAnchor({
        rowIndex: source.startRow,
        columnIndex: source.startColumn,
      });

      setRangeEnd({
        rowIndex: expandedRange.endRow,
        columnIndex: expandedRange.endColumn,
      });

      setPasteMessage(`${cells.length} cells filled.`);

      /*
       * Refresh Server Component data without reloading the browser document.
       * Client selection/range state remains mounted while rows, totals and
       * calculated values are refreshed from the server.
       */
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error ? error.message : "Unable to fill cells.",
      );
    } finally {
      setIsApplyingFill(false);
    }
  }

  function startFillDrag() {
    if (!fillSourceRange || isApplyingFill || isPasting || isClearing) {
      return;
    }

    isRangeDraggingRef.current = false;
    setIsFilling(true);
    setFillTarget({
      rowIndex: fillSourceRange.endRow,
      columnIndex: fillSourceRange.endColumn,
    });
  }

  async function insertFirstRow() {
    if (
      rows.length !== 0 ||
      isRowOperation ||
      isPasting ||
      isClearing ||
      isApplyingFill
    ) {
      return;
    }

    setIsRowOperation(true);
    setPasteMessage(null);

    try {
      const result =
        await insertFirstSmartSheetRow({
          sheetId: sheet.id,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ||
            "Unable to insert first row.",
        );
        return;
      }

      if (result.rowId) {
        setPendingInsertedRowId(
          result.rowId,
        );
      }

      setPasteMessage(
        result.message ||
          "Row inserted.",
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to insert first row.",
      );
    } finally {
      setIsRowOperation(false);
    }
  }

  async function materializeGeneralCell(
    rowIndex: number,
    columnIndex: number,
  ) {
    if (
      sheet.sheet_type !== null ||
      rowIndex < 0 ||
      rowIndex >= GENERAL_BLANK_ROW_COUNT ||
      columnIndex < 0 ||
      columnIndex >= GENERAL_BLANK_COLUMN_COUNT ||
      activeFilterCount > 0 ||
      isRowOperation ||
      isCreatingColumn ||
      isPasting ||
      isClearing ||
      isApplyingFill
    ) {
      return;
    }

    const requiredColumnCount =
      columnIndex + 1;

    const requiredRowCount =
      rowIndex + 1;

    const missingColumnCount =
      Math.max(
        0,
        requiredColumnCount -
          visibleColumns.length,
      );

    const missingRowCount =
      Math.max(
        0,
        requiredRowCount -
          rows.length,
      );

    if (
      missingColumnCount === 0 &&
      missingRowCount === 0
    ) {
      const targetRow =
        filteredRows[rowIndex];

      const targetColumn =
        visibleColumns[columnIndex];

      if (targetRow && targetColumn) {
        selectCell(
          targetRow,
          rowIndex,
          targetColumn.key,
          columnIndex,
        );
      }

      return;
    }

    setIsRowOperation(true);
    setIsCreatingColumn(true);
    setPasteMessage(null);

    try {
      /*
       * Virtual coordinates are presentation-only. Persist every required
       * column/row first, then let the normal spreadsheet engine select the
       * real target after router.refresh(). No placeholder identities enter
       * selection, formulas, clipboard, formatting, or history.
       */
      const createdColumnKeys: string[] =
        [];

      for (
        let offset = 0;
        offset < missingColumnCount;
        offset += 1
      ) {
        const nextColumnIndex =
          visibleColumns.length +
          offset;

        const result =
          await addSmartSheetColumn({
            sheetId: sheet.id,
            label: `Column ${columnLetter(
              nextColumnIndex,
            )}`,
            dataType: "text",
          });

        if (
          !result.ok ||
          !result.column
        ) {
          if (createdColumnKeys.length > 0) {
            setPendingCustomColumnKeys((current) => [
              ...current,
              ...createdColumnKeys.filter(
                (key) => !current.includes(key),
              ),
            ]);
          }

          setPasteMessage(
            result.message ??
              `Unable to create column ${columnLetter(
                nextColumnIndex,
              )}.`,
          );

          router.refresh();
          return;
        }

        createdColumnKeys.push(
          result.column.column_key,
        );
      }

      if (createdColumnKeys.length > 0) {
        setPendingCustomColumnKeys((current) => [
          ...current,
          ...createdColumnKeys.filter(
            (key) => !current.includes(key),
          ),
        ]);
      }

      let remainingRows =
        missingRowCount;

      let anchorRowId =
        rows.length > 0
          ? rows[rows.length - 1]?.id
          : undefined;

      if (
        remainingRows > 0 &&
        !anchorRowId
      ) {
        const firstRowResult =
          await insertFirstSmartSheetRow({
            sheetId: sheet.id,
          });

        if (
          !firstRowResult.ok ||
          !firstRowResult.rowId
        ) {
          setPasteMessage(
            firstRowResult.message ??
              "Unable to create the first row.",
          );

          router.refresh();
          return;
        }

        anchorRowId =
          firstRowResult.rowId;

        remainingRows -= 1;
      }

      while (
        remainingRows > 0 &&
        anchorRowId
      ) {
        const batchCount =
          Math.min(
            remainingRows,
            100,
          );

        const result =
          await insertSmartSheetRows({
            sheetId: sheet.id,
            anchorRowId,
            count: batchCount,
            position: "below",
          });

        if (!result.ok) {
          setPasteMessage(
            result.message ??
              "Unable to create Smart Sheet rows.",
          );

          router.refresh();
          return;
        }

        remainingRows -=
          result.insertedCount ??
          batchCount;
      }

      setPendingMaterializedCell({
        rowIndex,
        columnIndex,
      });

      setPasteMessage(
        `${columnLetter(
          columnIndex,
        )}${rowIndex + 1} ready.`,
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to prepare Smart Sheet cell.",
      );
    } finally {
      setIsRowOperation(false);
      setIsCreatingColumn(false);
    }
  }


  async function insertRow(
    position: "above" | "below",
  ) {
    if (
      !rowMenu ||
      isRowOperation ||
      isPasting ||
      isClearing ||
      isApplyingFill
    ) {
      return;
    }

    const anchorPhysicalIndex =
      rows.findIndex((row) => row.id === rowMenu.rowId);

    const insertionPhysicalIndex =
      position === "above"
        ? anchorPhysicalIndex
        : anchorPhysicalIndex + 1;

    const insertionSplitsGroup =
      rowOutlineGroups.some((group) => {
        const indexes = group.rowIds
          .map((rowId) =>
            rows.findIndex((row) => row.id === rowId),
          )
          .filter((index) => index >= 0)
          .sort((left, right) => left - right);

        if (indexes.length < 2) {
          return false;
        }

        return (
          insertionPhysicalIndex > indexes[0] &&
          insertionPhysicalIndex <= indexes[indexes.length - 1]
        );
      });

    if (insertionSplitsGroup) {
      setPasteMessage(
        "Ungroup these rows before inserting inside the group. This preserves the outline as one contiguous row range.",
      );
      setRowMenu(null);
      return;
    }

    setIsRowOperation(true);
    setPasteMessage(null);

    try {
      const result =
        await insertSmartSheetRow({
          sheetId: sheet.id,
          anchorRowId: rowMenu.rowId,
          position,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ||
            "Unable to insert row.",
        );
        return;
      }

      if (result.rowId) {
        setPendingInsertedRowId(
          result.rowId,
        );
      }

      setRowMenu(null);

      setPasteMessage(
        result.message ||
          `Row inserted ${position}.`,
      );

      /*
       * Fetch the new ordered row list without reloading the browser
       * document. The effect below selects the newly inserted row once
       * the refreshed Server Component props arrive.
       */
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to insert row.",
      );
    } finally {
      setIsRowOperation(false);
    }
  }

  async function insertSelectedRows(
    position: "above" | "below",
  ) {
    if (
      !rowMenu ||
      !selectedRowRange ||
      selectedRowIds.length <= 1 ||
      isRowOperation ||
      isPasting ||
      isClearing ||
      isApplyingFill
    ) {
      return;
    }

    const count =
      selectedRowIds.length;

    /*
     * Spreadsheet semantics:
     * - insert ABOVE the first selected row
     * - insert BELOW the last selected row
     *
     * The server creates exactly the same number of blank rows as the
     * selected row range and records the entire insertion as one history
     * operation.
     */
    const anchorIndex =
      position === "above"
        ? selectedRowRange.startRow
        : selectedRowRange.endRow;

    const anchorRow =
      filteredRows[anchorIndex];

    if (!anchorRow) {
      setPasteMessage(
        "Unable to locate the selected row range.",
      );
      return;
    }

    const anchorPhysicalIndex =
      rows.findIndex((row) => row.id === anchorRow.id);

    const insertionPhysicalIndex =
      position === "above"
        ? anchorPhysicalIndex
        : anchorPhysicalIndex + 1;

    const insertionSplitsGroup =
      rowOutlineGroups.some((group) => {
        const indexes = group.rowIds
          .map((rowId) =>
            rows.findIndex((row) => row.id === rowId),
          )
          .filter((index) => index >= 0)
          .sort((left, right) => left - right);

        if (indexes.length < 2) {
          return false;
        }

        return (
          insertionPhysicalIndex > indexes[0] &&
          insertionPhysicalIndex <= indexes[indexes.length - 1]
        );
      });

    if (insertionSplitsGroup) {
      setPasteMessage(
        "Ungroup these rows before inserting inside the group. This preserves the outline as one contiguous row range.",
      );
      setRowMenu(null);
      return;
    }

    setIsRowOperation(true);
    setPasteMessage(null);

    try {
      const result =
        await insertSmartSheetRows({
          sheetId:
            sheet.id,
          anchorRowId:
            anchorRow.id,
          count,
          position,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ||
            "Unable to insert selected rows.",
        );
        return;
      }

      setRowMenu(null);
      setRowSelectionAnchor(null);
      setRowSelectionEnd(null);

      if (result.firstRowId) {
        setPendingInsertedRowId(
          result.firstRowId,
        );
      }

      setPasteMessage(
        result.message ||
          `${count} rows inserted ${position}.`,
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to insert selected rows.",
      );
    } finally {
      setIsRowOperation(false);
    }
  }


  function beginRowDrag(
    event: DragEvent<HTMLButtonElement>,
    rowId: string,
  ) {
    if (
      isRowOperation ||
      isPasting ||
      isClearing ||
      isApplyingFill
    ) {
      event.preventDefault();
      return;
    }

    if (
      Object.keys(
        columnFilters,
      ).length > 0
    ) {
      event.preventDefault();
      setPasteMessage(
        "Clear active filters before dragging rows so physical row order stays unambiguous.",
      );
      return;
    }

    setRowMenu(null);
    setRowSelectionAnchor(null);
    setRowSelectionEnd(null);
    setDraggedRowId(
      rowId,
    );
    setRowDropTarget(null);

    event.dataTransfer.effectAllowed =
      "move";

    event.dataTransfer.setData(
      "text/plain",
      rowId,
    );
  }

  function updateRowDropTarget(
    event: DragEvent<HTMLButtonElement>,
    targetRowId: string,
  ) {
    if (
      !draggedRowId ||
      draggedRowId ===
        targetRowId
    ) {
      return;
    }

    event.preventDefault();

    event.dataTransfer.dropEffect =
      "move";

    const rect =
      event.currentTarget.getBoundingClientRect();

    const placement:
      | "before"
      | "after" =
      event.clientY <
      rect.top +
        rect.height / 2
        ? "before"
        : "after";

    setRowDropTarget({
      rowId:
        targetRowId,
      placement,
    });
  }

  async function dropDraggedRow(
    event: DragEvent<HTMLButtonElement>,
    targetRowId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (
      !draggedRowId ||
      draggedRowId ===
        targetRowId ||
      isRowOperation
    ) {
      setDraggedRowId(null);
      setRowDropTarget(null);
      return;
    }

    const placement =
      rowDropTarget?.rowId ===
      targetRowId
        ? rowDropTarget.placement
        : "before";

    const movingRowId =
      draggedRowId;

    const nextOrder = reorderedRowIds(
      rows.map((row) => row.id),
      movingRowId,
      targetRowId,
      placement,
    );

    if (
      !rowOutlineGroupsRemainContiguous(
        rowOutlineGroups,
        nextOrder,
      )
    ) {
      setPasteMessage(
        "This row move would split an existing row group. Ungroup the rows first, or move the row outside the grouped range.",
      );
      setDraggedRowId(null);
      setRowDropTarget(null);
      return;
    }

    setIsRowOperation(true);
    setPasteMessage(null);

    try {
      const result =
        await reorderSmartSheetRowToPosition({
          sheetId:
            sheet.id,
          rowId:
            movingRowId,
          targetRowId,
          placement,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ||
            "Unable to reorder row.",
        );
        return;
      }

      setRowMenu(null);
      setRowSelectionAnchor(null);
      setRowSelectionEnd(null);
      setPendingSelectedRowId(
        movingRowId,
      );

      setPasteMessage(
        result.message ||
          "Row order updated.",
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to reorder row.",
      );
    } finally {
      setDraggedRowId(null);
      setRowDropTarget(null);
      setIsRowOperation(false);
    }
  }

  function endRowDrag() {
    setDraggedRowId(null);
    setRowDropTarget(null);
  }


  async function moveRow(
    direction: "up" | "down",
  ) {
    if (
      !rowMenu ||
      isRowOperation ||
      isPasting ||
      isClearing ||
      isApplyingFill
    ) {
      return;
    }

    const movingRowId =
      rowMenu.rowId;

    const currentOrder =
      rows.map((row) => row.id);
    const movingIndex =
      currentOrder.indexOf(movingRowId);
    const targetIndex =
      direction === "up"
        ? movingIndex - 1
        : movingIndex + 1;
    const targetRowId =
      currentOrder[targetIndex];

    if (targetRowId) {
      const nextOrder = reorderedRowIds(
        currentOrder,
        movingRowId,
        targetRowId,
        direction === "up" ? "before" : "after",
      );

      if (
        !rowOutlineGroupsRemainContiguous(
          rowOutlineGroups,
          nextOrder,
        )
      ) {
        setPasteMessage(
          "This row move would split an existing row group. Ungroup the rows first, or move the row outside the grouped range.",
        );
        setRowMenu(null);
        return;
      }
    }

    setIsRowOperation(true);
    setPasteMessage(null);

    try {
      const result =
        await reorderSmartSheetRow({
          sheetId:
            sheet.id,
          rowId:
            movingRowId,
          direction,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ||
            "Unable to reorder row.",
        );
        return;
      }

      setRowMenu(null);
      setRowSelectionAnchor(null);
      setRowSelectionEnd(null);
      setPendingSelectedRowId(
        movingRowId,
      );

      setPasteMessage(
        result.message ||
          (
            direction === "up"
              ? "Row moved up."
              : "Row moved down."
          ),
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to reorder row.",
      );
    } finally {
      setIsRowOperation(false);
    }
  }


  async function deleteRow() {
    if (
      !rowMenu ||
      isRowOperation ||
      isPasting ||
      isClearing ||
      isApplyingFill
    ) {
      return;
    }

    const deletingRowNumber =
      rowMenu.rowNumber;

    setIsRowOperation(true);
    setPasteMessage(null);

    try {
      const result =
        await deleteSmartSheetRow({
          sheetId: sheet.id,
          rowId: rowMenu.rowId,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ||
            "Unable to delete row.",
        );
        return;
      }

      setRowMenu(null);

      setPasteMessage(
        result.message ||
          `Deleted row ${deletingRowNumber}.`,
      );

      setPendingSelectedRowId(
        result.nextRowId ?? null,
      );

      /*
       * Structural data changed, so ask Next.js for fresh row props while
       * keeping the browser document mounted.
       */
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete row.",
      );
    } finally {
      setIsRowOperation(false);
    }
  }


  async function deleteSelectedRows() {
    if (
      !rowMenu ||
      selectedRowIds.length <= 1 ||
      isRowOperation ||
      isPasting ||
      isClearing ||
      isApplyingFill
    ) {
      return;
    }

    const deletingCount =
      selectedRowIds.length;

    setIsRowOperation(true);
    setPasteMessage(null);

    try {
      const result =
        await deleteSmartSheetRows({
          sheetId: sheet.id,
          rowIds: selectedRowIds,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ||
            "Unable to delete selected rows.",
        );
        return;
      }

      setRowMenu(null);
      setRowSelectionAnchor(null);
      setRowSelectionEnd(null);

      setPasteMessage(
        result.message ||
          `${deletingCount} rows deleted.`,
      );

      setPendingSelectedRowId(
        result.nextRowId ?? null,
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete selected rows.",
      );
    } finally {
      setIsRowOperation(false);
    }
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
        filteredRows[rowIndex];

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
       * Keep the same active/range selection while refreshing the server
       * data. router.refresh() does not reload the browser document, so the
       * current spreadsheet selection remains mounted.
       */
      router.refresh();
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

  useEffect(() => {
    function handleFindShortcut(
      event: KeyboardEvent,
    ) {
      const modifier =
        event.ctrlKey ||
        event.metaKey;

      if (
        modifier &&
        event.key.toLocaleLowerCase() === "f"
      ) {
        event.preventDefault();
        openFindReplace(false);
        return;
      }

      if (
        modifier &&
        event.key.toLocaleLowerCase() === "h"
      ) {
        event.preventDefault();
        openFindReplace(true);
        return;
      }

      if (
        event.key === "Escape" &&
        showFindReplace
      ) {
        event.preventDefault();
        closeFindReplace();
      }
    }

    window.addEventListener(
      "keydown",
      handleFindShortcut,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleFindShortcut,
      );
    };
  }, [
    showFindReplace,
  ]);


  function handleGridKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
  ) {
    if (
      !selectedCell ||
      filteredRows.length === 0 ||
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
    if (!resizingRow) {
      return;
    }

    const activeResize = resizingRow;

    function handleRowResizeMove(
      event: globalThis.MouseEvent,
    ) {
      const delta =
        event.clientY -
        activeResize.startY;

      const nextHeight =
        Math.max(
          18,
          Math.min(
            160,
            activeResize.startHeight +
              delta,
          ),
        );

      setRowHeights((current) => {
        const next = {
          ...current,
          [activeResize.rowId]:
            nextHeight,
        };

        saveRowHeights(next);
        return next;
      });
    }

    function handleRowResizeEnd() {
      setResizingRow(null);
    }

    window.addEventListener(
      "mousemove",
      handleRowResizeMove,
    );

    window.addEventListener(
      "mouseup",
      handleRowResizeEnd,
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleRowResizeMove,
      );

      window.removeEventListener(
        "mouseup",
        handleRowResizeEnd,
      );
    };
  }, [resizingRow]);


  useEffect(() => {
    if (!resizingColumn) {
      return;
    }

    const activeResize =
      resizingColumn;

    function handleResizeMove(
      event: globalThis.MouseEvent,
    ) {
      const delta =
        event.clientX -
        activeResize.startX;

      const nextWidth =
        Math.max(
          54,
          Math.min(
            420,
            activeResize.startWidth +
              delta,
          ),
        );

      setColumnWidths((current) => {
        const next = {
          ...current,
          [activeResize.key]:
            nextWidth,
        };

        saveColumnWidths(
          next,
        );

        return next;
      });
    }

    function handleResizeEnd(
      event: globalThis.MouseEvent,
    ) {
      const delta =
        event.clientX -
        activeResize.startX;

      const finalWidth =
        Math.round(
          Math.max(
            54,
            Math.min(
              420,
              activeResize.startWidth +
                delta,
            ),
          ),
        );

      setColumnWidths((current) => {
        const next = {
          ...current,
          [activeResize.key]:
            finalWidth,
        };

        saveColumnWidths(
          next,
        );

        return next;
      });

      void persistColumnWidths([
        {
          columnKey:
            activeResize.key,
          width:
            finalWidth,
        },
      ]);

      setResizingColumn(null);
    }

    window.addEventListener(
      "mousemove",
      handleResizeMove,
    );

    window.addEventListener(
      "mouseup",
      handleResizeEnd,
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleResizeMove,
      );

      window.removeEventListener(
        "mouseup",
        handleResizeEnd,
      );
    };
  }, [resizingColumn]);


  useEffect(() => {
    if (!columnMenu) {
      return;
    }

    function closeColumnMenu(
      event: globalThis.MouseEvent,
    ) {
      const target =
        event.target as HTMLElement | null;

      if (
        target?.closest(
          '[data-samzy-column-menu="true"]',
        )
      ) {
        return;
      }

      setColumnMenu(null);
      setColumnInsertSide(null);
      setRenameColumnEditor(null);
    }

    function closeColumnMenuOnKey(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setColumnMenu(null);
        setColumnInsertSide(null);
        setRenameColumnEditor(null);
      }
    }

    window.addEventListener(
      "mousedown",
      closeColumnMenu,
    );

    window.addEventListener(
      "keydown",
      closeColumnMenuOnKey,
    );

    return () => {
      window.removeEventListener(
        "mousedown",
        closeColumnMenu,
      );

      window.removeEventListener(
        "keydown",
        closeColumnMenuOnKey,
      );
    };
  }, [columnMenu]);


  useEffect(() => {
    if (!pendingMaterializedCell) {
      return;
    }

    const {
      rowIndex,
      columnIndex,
    } = pendingMaterializedCell;

    const targetRow =
      filteredRows[rowIndex];

    const targetColumn =
      visibleColumns[columnIndex];

    if (!targetRow || !targetColumn) {
      return;
    }

    selectCell(
      targetRow,
      rowIndex,
      targetColumn.key,
      columnIndex,
    );

    setPendingMaterializedCell(null);

    requestAnimationFrame(() => {
      const element =
        gridRef.current?.querySelector(
          `[data-sheet-cell="${targetRow.id}:${targetColumn.key}"]`,
        ) as HTMLElement | null;

      element?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });

      gridRef.current?.focus({
        preventScroll: true,
      });
    });
  }, [
    pendingMaterializedCell,
    filteredRows,
    visibleColumns,
  ]);


  useEffect(() => {
    const targetRowId =
      pendingInsertedRowId ??
      pendingSelectedRowId;

    if (
      !targetRowId ||
      visibleColumns.length === 0
    ) {
      return;
    }

    const targetRowIndex =
      filteredRows.findIndex(
        (row) =>
          row.id ===
          targetRowId,
      );

    if (targetRowIndex === -1) {
      return;
    }

    const targetRow =
      filteredRows[targetRowIndex];

    const firstColumn =
      visibleColumns[0];

    selectCell(
      targetRow,
      targetRowIndex,
      firstColumn.key,
      0,
    );

    setPendingInsertedRowId(null);
    setPendingSelectedRowId(null);

    requestAnimationFrame(() => {
      const element =
        gridRef.current?.querySelector(
          `[data-sheet-cell="${targetRow.id}:${firstColumn.key}"]`,
        ) as HTMLElement | null;

      element?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });

      gridRef.current?.focus({
        preventScroll: true,
      });
    });
  }, [
    pendingInsertedRowId,
    pendingSelectedRowId,
    filteredRows,
    visibleColumns,
  ]);


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

      if (isFilling) {
        void applyFill();
      }
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
    filteredRows,
    visibleColumns,
    isFilling,
    fillTarget,
    fillSourceRange,
    isApplyingFill,
    isPasting,
    isClearing,
  ]);

  function selectedClipboardData() {
    if (!selectedCell) {
      return null;
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

    const lines: string[] = [];
    const valueLines: string[] = [];
    const cells: Array<{
      rowId: string;
      columnKey: string;
    }> = [];
    const formats: CellFormat[] = [];

    for (
      let rowIndex = range.startRow;
      rowIndex <= range.endRow;
      rowIndex += 1
    ) {
      const values: string[] = [];
      const evaluatedValues: string[] = [];

      for (
        let columnIndex = range.startColumn;
        columnIndex <= range.endColumn;
        columnIndex += 1
      ) {
        const row =
          filteredRows[rowIndex];

        const column =
          visibleColumns[columnIndex];

        if (!row || !column) {
          values.push("");
          evaluatedValues.push("");
          continue;
        }

        cells.push({
          rowId: row.id,
          columnKey: column.key,
        });

        formats.push({
          ...plainCellFormat(),
          ...(cellFormats[
            formatKey(
              row.id,
              column.key,
            )
          ] ?? {}),
        });

        const state =
          getState(
            row.id,
            column.key,
          );

        const overlay =
          spreadsheetCellOverlayMap.get(
            `${row.id}:${column.key}`,
          );

        /*
         * Clipboard follows what the customer actually sees.
         *
         * If an overlay occupies this visual cell, the hidden semantic
         * business cell state underneath it (including SAME) must not leak
         * into Copy/Cut.
         */
        if (
          !overlay &&
          state?.mode === "same"
        ) {
          values.push("SAME");
          evaluatedValues.push("SAME");
          continue;
        }

        const rawValue =
          getSpreadsheetValue(
            row,
            column.key,
          );

        const rawClipboardValue =
          rawValue === null ||
          rawValue === undefined
            ? ""
            : String(rawValue);

        values.push(
          rawClipboardValue,
        );

        /*
         * Excel-compatible Paste Values:
         * normal Copy/Paste keeps the stored formula text, while Paste Values
         * freezes the currently evaluated formula result. Non-formula cells
         * keep their underlying raw/effective value.
         */
        const evaluatedFormulaValue =
          formulaDisplayValue(
            row,
            column.key,
          );

        evaluatedValues.push(
          evaluatedFormulaValue === undefined
            ? rawClipboardValue
            : evaluatedFormulaValue === null
              ? ""
              : String(evaluatedFormulaValue),
        );
      }

      lines.push(
        values.join("\t"),
      );

      valueLines.push(
        evaluatedValues.join("\t"),
      );
    }

    return {
      text:
        lines.join("\n"),
      valuesText:
        valueLines.join("\n"),
      cells,
      formats,
    };
  }

  function handleGridCopy(
    event: React.ClipboardEvent<HTMLDivElement>,
  ) {
    const clipboard =
      selectedClipboardData();

    if (!clipboard) {
      return;
    }

    event.preventDefault();

    /*
     * A new Copy cancels any pending Cut, matching desktop spreadsheet
     * behavior. We intentionally copy raw/effective values rather than
     * display strings so € / % presentation formatting does not alter data.
     */
    internalClipboardRef.current = {
      mode: "copy",
      text: clipboard.text,
      valuesText: clipboard.valuesText,
      cells: clipboard.cells,
      formats: clipboard.formats,
    };

    event.clipboardData.setData(
      "text/plain",
      clipboard.text,
    );

    setPasteMessage(
      `${clipboard.cells.length} cell${clipboard.cells.length === 1 ? "" : "s"} copied.`,
    );
  }

  function handleGridCut(
    event: React.ClipboardEvent<HTMLDivElement>,
  ) {
    const clipboard =
      selectedClipboardData();

    if (!clipboard) {
      return;
    }

    event.preventDefault();

    /*
     * Excel-style cut does NOT clear immediately. The source remains intact
     * until Ctrl+V succeeds. This also means cutting and then pasting outside
     * SAMZY never destroys Smart Sheet data.
     */
    internalClipboardRef.current = {
      mode: "cut",
      text:
        clipboard.text,
      valuesText:
        clipboard.valuesText,
      cells:
        clipboard.cells,
      formats:
        clipboard.formats,
    };

    event.clipboardData.setData(
      "text/plain",
      clipboard.text,
    );

    setPasteMessage(
      `${clipboard.cells.length} cell${clipboard.cells.length === 1 ? "" : "s"} cut. Select destination and paste.`,
    );
  }

  async function runCellShift(
    direction: "down" | "up",
  ) {
    if (
      !selectedCell ||
      isPasting ||
      isClearing ||
      isFormatting ||
      isApplyingFill
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

    const firstVisibleRow =
      filteredRows[
        range.startRow
      ];

    const lastVisibleRow =
      filteredRows[
        range.endRow
      ];

    if (
      !firstVisibleRow ||
      !lastVisibleRow
    ) {
      setPasteMessage(
        "The selected cell range is no longer available.",
      );
      setShowCellShiftMenu(false);
      return;
    }

    const physicalStartIndex =
      rows.findIndex(
        (row) =>
          row.id ===
          firstVisibleRow.id,
      );

    const physicalEndIndex =
      rows.findIndex(
        (row) =>
          row.id ===
          lastVisibleRow.id,
      );

    if (
      physicalStartIndex < 0 ||
      physicalEndIndex < 0
    ) {
      setPasteMessage(
        "Unable to resolve the selected Smart Sheet rows.",
      );
      setShowCellShiftMenu(false);
      return;
    }

    const columnKeys =
      visibleColumns
        .slice(
          range.startColumn,
          range.endColumn + 1,
        )
        .map(
          (column) =>
            column.key,
        );

    if (
      columnKeys.length === 0
    ) {
      setPasteMessage(
        "Select one or more Smart Sheet cells first.",
      );
      setShowCellShiftMenu(false);
      return;
    }

    setShowCellShiftMenu(false);
    setIsPasting(true);
    setPasteMessage(null);

    try {
      const result =
        await shiftSmartSheetCells({
          sheetId:
            sheet.id,
          orderedRowIds:
            rows.map(
              (row) =>
                row.id,
            ),
          startRowIndex:
            Math.min(
              physicalStartIndex,
              physicalEndIndex,
            ),
          endRowIndex:
            Math.max(
              physicalStartIndex,
              physicalEndIndex,
            ),
          columnKeys,
          direction,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ??
            "Unable to shift selected cells.",
        );
        return;
      }

      await reloadCellFormats();
      await refreshHistoryStatus();

      setPasteMessage(
        result.message ??
          (
            direction ===
            "down"
              ? "Cells inserted and shifted down."
              : "Cells deleted and shifted up."
          ),
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to shift selected cells.",
      );
    } finally {
      setIsPasting(false);
    }
  }


  async function runCellShiftLeft() {
    if (
      !selectedCell ||
      isPasting ||
      isClearing ||
      isFormatting ||
      isApplyingFill
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

    const selectedRows =
      filteredRows.slice(
        range.startRow,
        range.endRow + 1,
      );

    if (selectedRows.length === 0) {
      setPasteMessage(
        "The selected cell range is no longer available.",
      );
      setShowCellShiftMenu(false);
      return;
    }

    const orderedColumnKeys =
      visibleColumns.map(
        (column) => column.key,
      );

    if (orderedColumnKeys.length === 0) {
      setPasteMessage(
        "No visible Smart Sheet columns are available.",
      );
      setShowCellShiftMenu(false);
      return;
    }

    setShowCellShiftMenu(false);
    setIsPasting(true);
    setPasteMessage(null);

    try {
      const result =
        await shiftSmartSheetCellsLeft({
          sheetId: sheet.id,
          rowIds: selectedRows.map(
            (row) => row.id,
          ),
          orderedColumnKeys,
          startColumnIndex:
            range.startColumn,
          endColumnIndex:
            range.endColumn,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ??
            "Unable to delete selected cells and shift left.",
        );
        return;
      }

      setFormatPainterSource(null);
      await reloadCellFormats();
      await refreshHistoryStatus();

      setPasteMessage(
        result.message ??
          "Cells deleted and shifted left.",
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete selected cells and shift left.",
      );
    } finally {
      setIsPasting(false);
    }
  }


  async function runCellShiftRight() {
    if (
      !selectedCell ||
      isPasting ||
      isClearing ||
      isFormatting ||
      isApplyingFill
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

    const selectedRows =
      filteredRows.slice(
        range.startRow,
        range.endRow + 1,
      );

    if (
      selectedRows.length === 0
    ) {
      setPasteMessage(
        "The selected cell range is no longer available.",
      );
      setShowCellShiftMenu(
        false,
      );
      return;
    }

    const orderedColumnKeys =
      visibleColumns.map(
        (column) =>
          column.key,
      );

    if (
      orderedColumnKeys.length ===
      0
    ) {
      setPasteMessage(
        "No visible Smart Sheet columns are available.",
      );
      setShowCellShiftMenu(
        false,
      );
      return;
    }

    setShowCellShiftMenu(
      false,
    );
    setIsPasting(true);
    setPasteMessage(null);

    try {
      const result =
        await shiftSmartSheetCellsRight({
          sheetId:
            sheet.id,
          rowIds:
            selectedRows.map(
              (row) =>
                row.id,
            ),
          orderedColumnKeys,
          startColumnIndex:
            range.startColumn,
          endColumnIndex:
            range.endColumn,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ??
            "Unable to insert selected cells and shift right.",
        );
        return;
      }

      setFormatPainterSource(
        null,
      );

      await reloadCellFormats();
      await refreshHistoryStatus();

      setPasteMessage(
        result.message ??
          "Cells inserted and shifted right.",
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to insert selected cells and shift right.",
      );
    } finally {
      setIsPasting(false);
    }
  }


  async function runPasteSpecial(
    mode: "values" | "formatting",
  ) {
    if (
      !selectedCell ||
      isPasting ||
      isFormatting
    ) {
      return;
    }

    const clipboard =
      internalClipboardRef.current;

    if (!clipboard) {
      setPasteMessage(
        "Copy a SAMZY cell or range first.",
      );
      setShowPasteSpecial(false);
      return;
    }

    if (clipboard.mode === "cut") {
      setPasteMessage(
        "Paste Special is available for copied cells. Use normal Ctrl+V to complete a cut.",
      );
      setShowPasteSpecial(false);
      return;
    }

    const normalizedText =
      (
        mode === "values"
          ? clipboard.valuesText
          : clipboard.text
      ).replace(
        /\r\n?/g,
        "\n",
      );

    let clipboardRows =
      normalizedText.split("\n");

    if (
      clipboardRows.length > 1 &&
      clipboardRows[
        clipboardRows.length - 1
      ] === ""
    ) {
      clipboardRows =
        clipboardRows.slice(0, -1);
    }

    const matrix =
      clipboardRows.map(
        (line) => line.split("\t"),
      );

    const startRowIndex =
      selectedCell.rowIndex;
    const startColumnIndex =
      selectedCell.columnIndex;

    const destinationCells: Array<{
      rowId: string;
      columnKey: string;
      value: string;
    }> = [];

    let sourceFormatIndex = 0;

    for (
      let pasteRowIndex = 0;
      pasteRowIndex < matrix.length;
      pasteRowIndex += 1
    ) {
      const destinationRow =
        filteredRows[
          startRowIndex +
            pasteRowIndex
        ];

      if (!destinationRow) {
        break;
      }

      const sourceRow =
        matrix[pasteRowIndex];

      let destinationColumnIndex =
        startColumnIndex;

      for (
        let pasteColumnIndex = 0;
        pasteColumnIndex <
          sourceRow.length;
        pasteColumnIndex += 1
      ) {
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

        destinationCells.push({
          rowId:
            destinationRow.id,
          columnKey:
            destinationColumn.key,
          value:
            sourceRow[
              pasteColumnIndex
            ] ?? "",
        });

        destinationColumnIndex += 1;
        sourceFormatIndex += 1;
      }
    }

    if (
      destinationCells.length === 0
    ) {
      setPasteMessage(
        "The destination does not contain editable Smart Sheet cells.",
      );
      setShowPasteSpecial(false);
      return;
    }

    const formatCells =
      destinationCells.map(
        (cell, index) => {
          const source =
            clipboard.formats[
              index %
                clipboard.formats.length
            ] ??
            plainCellFormat();

          return {
            rowId:
              cell.rowId,
            columnKey:
              cell.columnKey,
            format: {
              bold:
                source.bold,
              italic:
                source.italic,
              underline:
                source.underline,
              textAlignment:
                source.alignment,
              fontSize:
                source.fontSize,
              numberFormat:
                source.numberFormat,
              decimalPlaces:
                source.decimalPlaces,
              fillColor:
                source.fillColor,
              textColor:
                source.textColor,
              borderTop:
                source.borderTop,
              borderRight:
                source.borderRight,
              borderBottom:
                source.borderBottom,
              borderLeft:
                source.borderLeft,
            },
          };
        },
      );

    setShowPasteSpecial(false);

    try {
      if (mode === "values") {
        setIsPasting(true);
        setPasteMessage(null);

        const result =
          await pasteSmartSheetCells({
            sheetId:
              sheet.id,
            cells:
              destinationCells,
          });

        if (!result.ok) {
          setPasteMessage(
            result.message ??
              "Unable to paste values.",
          );
          return;
        }

        setPasteMessage(
          `${destinationCells.length} cell${destinationCells.length === 1 ? "" : "s"} pasted as values only.`,
        );
      } else {
        setIsFormatting(true);
        setPasteMessage(null);

        const result =
          await applySmartSheetFormatPainter({
            sheetId:
              sheet.id,
            cells:
              formatCells,
          });

        if (!result.ok) {
          setPasteMessage(
            result.message ??
              "Unable to paste formatting.",
          );
          return;
        }

        await reloadCellFormats();

        setPasteMessage(
          `Formatting pasted to ${formatCells.length} cell${formatCells.length === 1 ? "" : "s"}.`,
        );
      }

      setRangeAnchor({
        rowIndex:
          startRowIndex,
        columnIndex:
          startColumnIndex,
      });

      await refreshHistoryStatus();
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to complete Paste Special.",
      );
    } finally {
      setIsPasting(false);
      setIsFormatting(false);
    }
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
        filteredRows[
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

    const internalClipboard =
      internalClipboardRef.current;

    /*
     * Only attach SAMZY formatting when the browser clipboard still matches
     * the exact internal copy/cut payload. If the user copied something in
     * another app after leaving SAMZY, paste it as ordinary external values.
     */
    const matchingInternalClipboard =
      internalClipboard &&
      internalClipboard.text ===
        clipboardText
        ? internalClipboard
        : null;

    const pendingCut =
      matchingInternalClipboard?.mode ===
      "cut"
        ? matchingInternalClipboard
        : null;

    /*
     * Excel-style Copy translates relative formula references to the
     * destination. Cut preserves the formula text because the formula itself
     * is being moved rather than replicated.
     */
    const pasteCells =
      matchingInternalClipboard?.mode === "copy"
        ? cells.map((cell, index) => {
            const sourceCell =
              matchingInternalClipboard.cells[
                index %
                  matchingInternalClipboard.cells.length
              ];

            const sourceRowIndex =
              sourceCell
                ? filteredRows.findIndex(
                    (row) =>
                      row.id === sourceCell.rowId,
                  )
                : -1;

            const sourceColumnIndex =
              sourceCell
                ? visibleColumns.findIndex(
                    (column) =>
                      column.key ===
                      sourceCell.columnKey,
                  )
                : -1;

            const destinationRowIndex =
              filteredRows.findIndex(
                (row) =>
                  row.id === cell.rowId,
              );

            const destinationColumnIndex =
              visibleColumns.findIndex(
                (column) =>
                  column.key === cell.columnKey,
              );

            if (
              typeof cell.value !== "string" ||
              !cell.value.trim().startsWith("=") ||
              sourceRowIndex < 0 ||
              sourceColumnIndex < 0 ||
              destinationRowIndex < 0 ||
              destinationColumnIndex < 0
            ) {
              return cell;
            }

            return {
              ...cell,
              value:
                translateFormulaReferences(
                  cell.value,
                  destinationRowIndex -
                    sourceRowIndex,
                  destinationColumnIndex -
                    sourceColumnIndex,
                ),
            };
          })
        : cells;

    const formatCells =
      matchingInternalClipboard
        ? cells.map(
            (cell, index) => {
              const source =
                matchingInternalClipboard
                  .formats[
                    index %
                      matchingInternalClipboard
                        .formats.length
                  ] ??
                plainCellFormat();

              return {
                rowId:
                  cell.rowId,
                columnKey:
                  cell.columnKey,
                format: {
                  bold:
                    source.bold,
                  italic:
                    source.italic,
                  underline:
                    source.underline,
                  textAlignment:
                    source.alignment,
                  fontSize:
                    source.fontSize,
                  numberFormat:
                    source.numberFormat,
                  decimalPlaces:
                    source.decimalPlaces,
                  fillColor:
                    source.fillColor,
                  textColor:
                    source.textColor,
                  borderTop:
                    source.borderTop,
                  borderRight:
                    source.borderRight,
                  borderBottom:
                    source.borderBottom,
                  borderLeft:
                    source.borderLeft,
                },
              };
            },
          )
        : [];

    setIsPasting(true);
    setPasteMessage(null);

    try {
      const result =
        pendingCut
          ? await cutPasteSmartSheetCells({
              sheetId:
                sheet.id,
              sourceCells:
                pendingCut.cells,
              destinationCells:
                cells,
              destinationFormats:
                formatCells,
            })
          : matchingInternalClipboard
            ? await pasteSmartSheetCellsWithFormatting({
                sheetId:
                  sheet.id,
                cells:
                  pasteCells,
                formats:
                  formatCells,
              })
            : await pasteSmartSheetCells({
                sheetId:
                  sheet.id,
                cells:
                  pasteCells,
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

      if (pendingCut) {
        internalClipboardRef.current =
          null;
      }

      if (matchingInternalClipboard) {
        await reloadCellFormats();
      }

      setPasteMessage(
        result.message ||
          (pendingCut
            ? `${pendingCut.cells.length} cell${pendingCut.cells.length === 1 ? "" : "s"} moved.`
            : `${cells.length} cells pasted.`),
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
       * Refresh the current Next.js route without reloading the browser
       * document. This synchronizes rows, totals and calculated values while
       * preserving the active cell and pasted destination selection.
       */
      await refreshHistoryStatus();
      router.refresh();
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
    setRowSelectionAnchor(null);
    setRowSelectionEnd(null);
    setColumnSelectionAnchor(null);
    setColumnSelectionEnd(null);

    window.dispatchEvent(
      new CustomEvent("samzy:smart-sheet-selection", {
        detail: null,
      }),
    );
  }

  function startColumnResize(
    event: MouseEvent<HTMLSpanElement>,
    column: ColumnDefinition,
  ) {
    event.preventDefault();
    event.stopPropagation();

    setDraggedColumnKey(null);

    setResizingColumn({
      key: column.key,
      startX: event.clientX,
      startWidth:
        columnWidths[column.key] ??
        column.width,
    });
  }


  function autoFitColumn(
    event: MouseEvent<HTMLSpanElement>,
    column: ColumnDefinition,
  ) {
    event.preventDefault();
    event.stopPropagation();

    setDraggedColumnKey(null);
    setResizingColumn(null);

    const grid = gridRef.current;

    if (!grid) {
      return;
    }

    const measure = document.createElement("canvas");
    const context = measure.getContext("2d");

    if (!context) {
      return;
    }

    context.font =
      '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    let widest =
      context.measureText(
        column.unit
          ? `${column.label} ${column.unit}`
          : column.label,
      ).width + 24;

    for (const row of rows) {
      const state = getState(
        row.id,
        column.key,
      );

      const rawValue =
        state?.mode === "same"
          ? "SAME"
          : getRowValue(
              row,
              column.key,
            );

      const displayValue =
        rawValue === null ||
        rawValue === undefined
          ? ""
          : String(rawValue);

      widest = Math.max(
        widest,
        context.measureText(
          displayValue,
        ).width + 20,
      );
    }

    const nextWidth = Math.ceil(
      Math.max(
        54,
        Math.min(
          420,
          widest,
        ),
      ),
    );

    setColumnWidths((current) => {
      const next = {
        ...current,
        [column.key]: nextWidth,
      };

      saveColumnWidths(
        next,
      );

      return next;
    });

    void persistColumnWidths([
      {
        columnKey:
          column.key,
        width:
          nextWidth,
      },
    ]);

    setPasteMessage(
      `${column.label} auto-fitted.`,
    );
  }


  function openFilterEditor(
    columnKey: string,
  ) {
    const column =
      runtimeAllColumns.find(
        (candidate) =>
          candidate.key === columnKey,
      );

    if (!column) {
      return;
    }

    const existing =
      columnFilters[columnKey];

    const defaultOperator: FilterOperator =
      column.type === "text"
        ? "contains"
        : "equals";

    setFilterEditorColumnKey(
      columnKey,
    );

    setFilterDraftOperator(
      existing?.operator ??
        defaultOperator,
    );

    setFilterDraftValue(
      existing?.value ?? "",
    );

    setFilterDraftValue2(
      existing?.value2 ?? "",
    );

    setFilterDraftSelectedValues(
      existing?.selectedValues ??
        [],
    );
  }

  function applyFilterDraft() {
    if (!filterEditorColumnKey) {
      return;
    }

    if (
      filterDraftOperator === "values" &&
      filterDraftSelectedValues.length === 0
    ) {
      setPasteMessage(
        "Choose at least one value for this filter.",
      );
      return;
    }

    if (
      ![
        "is_blank",
        "is_not_blank",
        "values",
      ].includes(
        filterDraftOperator,
      ) &&
      filterDraftValue.trim() === ""
    ) {
      setPasteMessage(
        "Enter a filter value.",
      );
      return;
    }

    if (
      filterDraftOperator === "between" &&
      filterDraftValue2.trim() === ""
    ) {
      setPasteMessage(
        "Enter both values for a Between filter.",
      );
      return;
    }

    const nextFilter: ColumnFilter = {
      operator:
        filterDraftOperator,
      value:
        filterDraftValue,
      value2:
        filterDraftValue2,
      selectedValues:
        filterDraftSelectedValues,
    };

    setColumnFilters((current) => {
      const next = {
        ...current,
        [filterEditorColumnKey]:
          nextFilter,
      };

      saveColumnFilters(next);
      return next;
    });

    const column =
      runtimeAllColumns.find(
        (candidate) =>
          candidate.key ===
          filterEditorColumnKey,
      );

    setPasteMessage(
      `${column?.label ?? "Column"} filter applied.`,
    );

    setFilterEditorColumnKey(null);
    setColumnMenu(null);
    setColumnInsertSide(null);
    clearSelection();
  }

  function clearColumnFilter(
    columnKey: string,
  ) {
    setColumnFilters((current) => {
      const next = {
        ...current,
      };

      delete next[columnKey];

      saveColumnFilters(next);
      return next;
    });

    const column =
      runtimeAllColumns.find(
        (candidate) =>
          candidate.key ===
          columnKey,
      );

    setPasteMessage(
      `${column?.label ?? "Column"} filter cleared.`,
    );

    setFilterEditorColumnKey(null);
    setColumnMenu(null);
    setColumnInsertSide(null);
    clearSelection();
  }

  function clearAllFilters() {
    setColumnFilters({});
    saveColumnFilters({});
    setFilterEditorColumnKey(null);
    setColumnMenu(null);
    setColumnInsertSide(null);
    clearSelection();
    setPasteMessage(
      "All filters cleared.",
    );
  }


  async function sortSelectedColumn(
    direction: "asc" | "desc",
  ) {
    if (
      !selectedColumnRange ||
      isSorting
    ) {
      return;
    }

    const column =
      visibleColumns[
        selectedColumnRange.endColumn
      ];

    if (!column) {
      return;
    }

    setIsSorting(true);
    setColumnMenu(null);
    setColumnInsertSide(null);
    setPasteMessage(
      direction === "asc"
        ? `Sorting ${column.label} ascending…`
        : `Sorting ${column.label} descending…`,
    );

    try {
      const result =
        await sortSmartSheetRows({
          sheetId: sheet.id,
          columnKey: column.key,
          direction,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ??
            "Unable to sort rows.",
        );
        return;
      }

      setPasteMessage(
        result.message ??
          (direction === "asc"
            ? `${column.label} sorted ascending.`
            : `${column.label} sorted descending.`),
      );

      clearSelection();
      setColumnSelectionAnchor(null);
      setColumnSelectionEnd(null);
      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to sort rows.",
      );
    } finally {
      setIsSorting(false);
    }
  }


  async function handleColumnDrop(targetKey: string) {
    if (!draggedColumnKey || draggedColumnKey === targetKey) {
      setDraggedColumnKey(null);
      return;
    }

    const currentVisibleOrder =
      [...columnOrder];

    const from =
      currentVisibleOrder.indexOf(
        draggedColumnKey,
      );

    const to =
      currentVisibleOrder.indexOf(
        targetKey,
      );

    if (
      from === -1 ||
      to === -1
    ) {
      setDraggedColumnKey(null);
      return;
    }

    const nextVisibleOrder =
      [...currentVisibleOrder];

    nextVisibleOrder.splice(
      from,
      1,
    );

    nextVisibleOrder.splice(
      to,
      0,
      draggedColumnKey,
    );

    /*
     * Build the full persisted order without dropping hidden columns.
     * Visible columns are replaced in their current visible slots while hidden
     * columns retain their relative positions in the full metadata order.
     */
    const visibleKeySet =
      new Set(
        currentVisibleOrder,
      );

    let visibleIndex = 0;

    const nextFullOrder =
      runtimeAllColumns.map(
        (column) => {
          if (
            visibleKeySet.has(
              column.key,
            )
          ) {
            const nextKey =
              nextVisibleOrder[
                visibleIndex
              ];

            visibleIndex += 1;

            return nextKey;
          }

          return column.key;
        },
      );

    const result =
      await reorderSmartSheetColumns({
        sheetId: sheet.id,
        orderedColumnKeys:
          nextFullOrder,
      });

    if (!result.ok) {
      setPasteMessage(
        result.message ??
          "Unable to reorder columns.",
      );
      setDraggedColumnKey(null);
      return;
    }

    setColumnOrder(
      nextVisibleOrder,
    );

    clearSelection();
    setDraggedColumnKey(null);
    setPasteMessage(
      "Column order updated.",
    );

    router.refresh();
  }

  async function createCustomColumn() {
    if (isCreatingColumn) {
      return;
    }

    const label =
      newColumnLabel.trim();

    if (!label) {
      setPasteMessage(
        "Enter a column name.",
      );
      return;
    }

    setIsCreatingColumn(true);
    setPasteMessage(null);

    try {
      const result =
        await addSmartSheetColumn({
          sheetId: sheet.id,
          label,
          dataType:
            newColumnDataType,
        });

      if (
        !result.ok ||
        !result.column
      ) {
        setPasteMessage(
          result.message ??
            "Unable to create column.",
        );
        return;
      }

      setPendingCustomColumnKeys([
        result.column.column_key,
      ]);

      setNewColumnLabel("");
      setNewColumnDataType("text");
      setShowAddColumn(false);
      setAddColumnMenuPosition(null);
      setPasteMessage(
        `${result.column.label} column created.`,
      );

      router.refresh();
    } catch (error) {
      setPasteMessage(
        error instanceof Error
          ? error.message
          : "Unable to create column.",
      );
    } finally {
      setIsCreatingColumn(false);
    }
  }


  async function addColumn(key: string) {
    const customMetadata =
      sheetColumns.find(
        (column) =>
          column.column_key === key &&
          !column.is_system,
      );

    /*
     * A custom column hidden in smart_sheet_columns must be restored in the
     * database before it is reintroduced into the visible column order.
     */
    if (
      customMetadata?.hidden
    ) {
      const result =
        await setSmartSheetColumnHidden({
          sheetId: sheet.id,
          columnKey: key,
          hidden: false,
        });

      if (!result.ok) {
        setPasteMessage(
          result.message ??
            "Unable to restore custom column.",
        );
        return;
      }
    }

    setColumnOrder((current) => {
      if (current.includes(key)) {
        return current;
      }

      const persistedOrders =
        typeof window !== "undefined"
          ? loadHiddenColumnOrders()
          : {};

      const hiddenOrder =
        hiddenColumnOrderRef.current[key] ??
        persistedOrders[key];

      /*
       * Primary restore path:
       * return the hidden column to the exact position it occupied when
       * it was hidden. We locate the nearest currently-visible neighbour
       * on either side, so adjacent hidden columns can be restored in any
       * order and still rebuild their original layout.
       */
      if (hiddenOrder) {
        const originalIndex =
          hiddenOrder.indexOf(key);

        if (originalIndex !== -1) {
          for (
            let index = originalIndex + 1;
            index < hiddenOrder.length;
            index += 1
          ) {
            const nextVisibleIndex =
              current.indexOf(
                hiddenOrder[index],
              );

            if (nextVisibleIndex !== -1) {
              const next = [...current];

              next.splice(
                nextVisibleIndex,
                0,
                key,
              );

              const updatedOrders = {
                ...persistedOrders,
                ...hiddenColumnOrderRef.current,
              };

              delete updatedOrders[key];

              saveHiddenColumnOrders(
                updatedOrders,
              );

              return next;
            }
          }

          for (
            let index = originalIndex - 1;
            index >= 0;
            index -= 1
          ) {
            const previousVisibleIndex =
              current.indexOf(
                hiddenOrder[index],
              );

            if (previousVisibleIndex !== -1) {
              const next = [...current];

              next.splice(
                previousVisibleIndex + 1,
                0,
                key,
              );

              const updatedOrders = {
                ...persistedOrders,
                ...hiddenColumnOrderRef.current,
              };

              delete updatedOrders[key];

              saveHiddenColumnOrders(
                updatedOrders,
              );

              return next;
            }
          }
        }
      }

      /*
       * Fallback:
       * if there is no saved hide snapshot (for example the browser was
       * cleared), restore the column according to SAMZY's canonical column
       * definition order rather than appending it to the far right.
       */
      const canonicalOrder =
        runtimeAllColumns.map(
          (column) => column.key,
        );

      const canonicalIndex =
        canonicalOrder.indexOf(key);

      if (canonicalIndex !== -1) {
        for (
          let index = canonicalIndex + 1;
          index < canonicalOrder.length;
          index += 1
        ) {
          const nextVisibleIndex =
            current.indexOf(
              canonicalOrder[index],
            );

          if (nextVisibleIndex !== -1) {
            const next = [...current];

            next.splice(
              nextVisibleIndex,
              0,
              key,
            );

            return next;
          }
        }

        for (
          let index = canonicalIndex - 1;
          index >= 0;
          index -= 1
        ) {
          const previousVisibleIndex =
            current.indexOf(
              canonicalOrder[index],
            );

          if (previousVisibleIndex !== -1) {
            const next = [...current];

            next.splice(
              previousVisibleIndex + 1,
              0,
              key,
            );

            return next;
          }
        }
      }

      return [...current, key];
    });

    setShowAddColumn(false);
    setAddColumnMenuPosition(null);

    const definition =
      runtimeAllColumns.find(
        (column) =>
          column.key === key,
      );

    setPasteMessage(
      `${definition?.label ?? "Column"} restored with existing values.`,
    );
  
    if (customMetadata?.hidden) {
      router.refresh();
    }
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

  useLayoutEffect(() => {
    const table = tableRef.current;

    if (!table) {
      return;
    }

    const updateGridContentHeight = () => {
      setGridContentHeight(
        Math.max(
          table.scrollHeight,
          table.getBoundingClientRect().height,
        ),
      );
    };

    updateGridContentHeight();

    const observer =
      new ResizeObserver(
        updateGridContentHeight,
      );

    observer.observe(table);

    return () => {
      observer.disconnect();
    };
  }, [
    filteredRows,
    visibleColumns,
    rowHeights,
    columnWidths,
  ]);

  function syncVerticalFromRail() {
    const rail =
      verticalScrollRef.current;

    const grid =
      gridRef.current;

    if (!rail || !grid) {
      return;
    }

    grid.scrollTop =
      rail.scrollTop;
  }

  function handleGridWheel(
    event: React.WheelEvent<HTMLDivElement>,
  ) {
    if (
      Math.abs(event.deltaY) <=
      Math.abs(event.deltaX)
    ) {
      return;
    }

    const rail =
      verticalScrollRef.current;

    if (!rail) {
      return;
    }

    event.preventDefault();

    rail.scrollTop +=
      event.deltaY;

    if (gridRef.current) {
      gridRef.current.scrollTop =
        rail.scrollTop;
    }
  }


  return (
    <div style={{ position: "relative", minWidth: 0 }}>
      <style>{`
        .samzy-smart-sheet-grid {
          scrollbar-width: auto;
          scrollbar-color: #98a2b3 #f2f4f7;
        }

        .samzy-smart-sheet-grid::-webkit-scrollbar {
          width: 0;
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

        .samzy-smart-sheet-vertical-rail {
          scrollbar-width: auto;
          scrollbar-color: #667085 #f2f4f7;
        }

        .samzy-smart-sheet-vertical-rail::-webkit-scrollbar {
          width: 14px;
          height: 0;
        }

        .samzy-smart-sheet-vertical-rail::-webkit-scrollbar-track {
          background: #eef2f6;
        }

        .samzy-smart-sheet-vertical-rail::-webkit-scrollbar-thumb {
          background: #667085;
          border-radius: 7px;
          border: 3px solid #f2f4f7;
        }

        .samzy-smart-sheet-vertical-rail::-webkit-scrollbar-thumb:hover {
          background: #475467;
        }

        .samzy-column-dragging {
          opacity: .55;
        }
      `}</style>

      {pasteMessage ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            top: 6,
            right: 12,
            zIndex: 500,
            maxWidth: 360,
            padding: "7px 10px",
            border: "1px solid #d0d5dd",
            borderRadius: 6,
            background: "#ffffff",
            boxShadow: "0 6px 18px rgba(15,23,42,.12)",
            color:
              pasteMessage.toLowerCase().includes("unable") ||
              pasteMessage.toLowerCase().includes("error") ||
              pasteMessage.toLowerCase().includes("failed") ||
              pasteMessage.toLowerCase().includes("does not") ||
              pasteMessage.toLowerCase().includes("nothing to")
                ? "#b42318"
                : "#027a48",
            fontSize: 10,
            fontWeight: 650,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            pointerEvents: "none",
          }}
        >
          {pasteMessage}
        </div>
      ) : null}

      <div
        style={{
          minHeight: sheet.sheet_type === null ? 42 : 38,
          display: "flex",
          alignItems: "center",
          justifyContent:
            sheet.sheet_type === null ? "flex-start" : "flex-end",
          gap: sheet.sheet_type === null ? 4 : 6,
          padding:
            sheet.sheet_type === null ? "5px 8px" : "4px 6px",
          overflowX: "auto",
          overflowY: "hidden",
          border:
            sheet.sheet_type === null
              ? "1px solid #e5e7eb"
              : "1px solid #aeb6c2",
          borderBottom: 0,
          background:
            sheet.sheet_type === null ? "#ffffff" : "#f8fafc",
          boxShadow:
            sheet.sheet_type === null
              ? "0 1px 2px rgba(15, 23, 42, 0.04)"
              : "none",
        }}
      >
        <button
          type="button"
          onClick={() => void runUndo()}
          disabled={isHistoryBusy || !canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          style={{
            ...toolbarButtonStyle,
            minWidth: sheet.sheet_type === null ? 34 : 58,
            width: sheet.sheet_type === null ? 34 : undefined,
            padding: sheet.sheet_type === null ? 0 : toolbarButtonStyle.padding,
            border:
              sheet.sheet_type === null
                ? "1px solid transparent"
                : toolbarButtonStyle.border,
            background:
              sheet.sheet_type === null
                ? "transparent"
                : toolbarButtonStyle.background,
            fontSize: sheet.sheet_type === null ? 19 : undefined,
            opacity:
              isHistoryBusy || !canUndo
                ? 0.45
                : 1,
            cursor:
              isHistoryBusy || !canUndo
                ? "default"
                : "pointer",
            flexShrink: 0,
              order: sheet.sheet_type === null ? 10 : undefined,
          }}
        >
          {sheet.sheet_type === null ? "↶" : "↶ Undo"}
        </button>

        <button
          type="button"
          onClick={() => void runRedo()}
          disabled={isHistoryBusy || !canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
          style={{
            ...toolbarButtonStyle,
            minWidth: sheet.sheet_type === null ? 34 : 58,
            width: sheet.sheet_type === null ? 34 : undefined,
            padding: sheet.sheet_type === null ? 0 : toolbarButtonStyle.padding,
            border:
              sheet.sheet_type === null
                ? "1px solid transparent"
                : toolbarButtonStyle.border,
            background:
              sheet.sheet_type === null
                ? "transparent"
                : toolbarButtonStyle.background,
            fontSize: sheet.sheet_type === null ? 19 : undefined,
            opacity:
              isHistoryBusy || !canRedo
                ? 0.45
                : 1,
            cursor:
              isHistoryBusy || !canRedo
                ? "default"
                : "pointer",
            flexShrink: 0,
              order: sheet.sheet_type === null ? 20 : undefined,
          }}
        >
          {sheet.sheet_type === null ? "↷" : "↷ Redo"}
        </button>

        <div
          style={{
            position: "relative",
            flexShrink: 0,
            order: sheet.sheet_type === null ? 300 : undefined,
          }}
        >
          <button
            ref={pasteSpecialButtonRef}
            type="button"
            onClick={() => {
              const rect =
                pasteSpecialButtonRef.current?.getBoundingClientRect();

              if (rect) {
                setPasteSpecialMenuPosition({
                  top: rect.bottom + 4,
                  left: rect.left,
                });
              }

              setShowPasteSpecial(
                (current) =>
                  !current,
              );
            }}
            disabled={
              !internalClipboardRef.current ||
              internalClipboardRef.current.mode === "cut" ||
              isPasting ||
              isFormatting
            }
            title="Paste Special"
            aria-label="Paste Special"
            style={{
              ...toolbarButtonStyle,
              minWidth: sheet.sheet_type === null ? 34 : 82,
              width: sheet.sheet_type === null ? 34 : undefined,
              padding: sheet.sheet_type === null ? 0 : toolbarButtonStyle.padding,
              border:
                sheet.sheet_type === null
                  ? "1px solid transparent"
                  : toolbarButtonStyle.border,
              background:
                sheet.sheet_type === null
                  ? "transparent"
                  : toolbarButtonStyle.background,
              fontSize: sheet.sheet_type === null ? 15 : undefined,
              opacity:
                !internalClipboardRef.current ||
                internalClipboardRef.current.mode === "cut" ||
                isPasting ||
                isFormatting
                  ? 0.45
                  : 1,
              cursor:
                !internalClipboardRef.current ||
                internalClipboardRef.current.mode === "cut" ||
                isPasting ||
                isFormatting
                  ? "default"
                  : "pointer",
            }}
          >
            {sheet.sheet_type === null ? "▾" : "Paste ▾"}
          </button>

          {showPasteSpecial &&
          pasteSpecialMenuPosition &&
          typeof document !== "undefined"
            ? createPortal(
                <div
                  style={{
                    position: "fixed",
                    top:
                      pasteSpecialMenuPosition.top,
                    left:
                      pasteSpecialMenuPosition.left,
                    zIndex: 10000,
                    width: 170,
                    padding: 4,
                    border: "1px solid #d0d5dd",
                    borderRadius: 6,
                    background: "#ffffff",
                    boxShadow:
                      "0 8px 24px rgba(16, 24, 40, 0.14)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      void runPasteSpecial(
                        "values",
                      )
                    }
                    style={{
                      ...toolbarButtonStyle,
                      width: "100%",
                      justifyContent:
                        "flex-start",
                      border: 0,
                    }}
                  >
                    Paste values only
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void runPasteSpecial(
                        "formatting",
                      )
                    }
                    style={{
                      ...toolbarButtonStyle,
                      width: "100%",
                      justifyContent:
                        "flex-start",
                      border: 0,
                    }}
                  >
                    Paste formatting only
                  </button>
                </div>,
                document.body,
              )
            : null}
        </div>

        <div
          style={{
            position: "relative",
            flexShrink: 0,
            order: sheet.sheet_type === null ? 310 : undefined,
          }}
        >
          <button
            ref={cellShiftButtonRef}
            type="button"
            onClick={() => {
              const rect =
                cellShiftButtonRef.current?.getBoundingClientRect();

              if (rect) {
                setCellShiftMenuPosition({
                  top: rect.bottom + 4,
                  left: rect.left,
                });
              }

              setShowCellShiftMenu(
                (current) =>
                  !current,
              );
            }}
            disabled={
              !selectedCell ||
              isPasting ||
              isClearing ||
              isFormatting ||
              isApplyingFill
            }
            title="Insert or delete selected cells"
            aria-label="Insert or delete cells"
            style={{
              ...toolbarButtonStyle,
              minWidth: sheet.sheet_type === null ? 34 : 72,
              width: sheet.sheet_type === null ? 34 : undefined,
              padding: sheet.sheet_type === null ? 0 : toolbarButtonStyle.padding,
              border:
                sheet.sheet_type === null
                  ? "1px solid transparent"
                  : toolbarButtonStyle.border,
              background:
                sheet.sheet_type === null
                  ? "transparent"
                  : toolbarButtonStyle.background,
              fontSize: sheet.sheet_type === null ? 15 : undefined,
              opacity:
                !selectedCell ||
                isPasting ||
                isClearing ||
                isFormatting ||
                isApplyingFill
                  ? 0.45
                  : 1,
            }}
          >
            {sheet.sheet_type === null ? "▦" : "Cells ▾"}
          </button>

          {showCellShiftMenu &&
          cellShiftMenuPosition &&
          typeof document !== "undefined"
            ? createPortal(
                <div
                  style={{
                    position: "fixed",
                    top:
                      cellShiftMenuPosition.top,
                    left:
                      cellShiftMenuPosition.left,
                    zIndex: 10000,
                    width: 210,
                    padding: 4,
                    border:
                      "1px solid #d0d5dd",
                    borderRadius: 6,
                    background:
                      "#ffffff",
                    boxShadow:
                      "0 8px 24px rgba(16, 24, 40, 0.14)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      void runCellShift(
                        "down",
                      )
                    }
                    style={{
                      ...toolbarButtonStyle,
                      width: "100%",
                      justifyContent:
                        "flex-start",
                      border: 0,
                    }}
                  >
                    Insert cells — Shift down
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void runCellShift(
                        "up",
                      )
                    }
                    style={{
                      ...toolbarButtonStyle,
                      width: "100%",
                      justifyContent:
                        "flex-start",
                      border: 0,
                    }}
                  >
                    Delete cells — Shift up
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void runCellShiftRight()
                    }
                    style={{
                      ...toolbarButtonStyle,
                      width: "100%",
                      justifyContent:
                        "flex-start",
                      border: 0,
                    }}
                  >
                    Insert cells — Shift right
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void runCellShiftLeft()
                    }
                    style={{
                      ...toolbarButtonStyle,
                      width: "100%",
                      justifyContent:
                        "flex-start",
                      border: 0,
                    }}
                  >
                    Delete cells — Shift left
                  </button>
                </div>,
                document.body,
              )
            : null}
        </div>

        <span
          aria-hidden="true"
          style={{
            width: 1,
            height: 22,
            background: "#d0d5dd",
            flexShrink: 0,
              order: sheet.sheet_type === null ? 320 : undefined,
          }}
        />

        {!formatPainterSource && sheet.sheet_type !== null ? (
          <span
            style={{
              marginRight: "auto",
              color: "#667085",
              fontSize: 10,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Drag any column header to reorder
          </span>
        ) : null}

        {isHistoryBusy || isPasting || isClearing || isRowOperation || isSorting || isReplacing || isFormatting ? (
          <span
            style={{
              color: "#175cd3",
              fontSize: 10,
              fontWeight: 650,
              whiteSpace: "nowrap",
                order: sheet.sheet_type === null ? 330 : undefined,
            }}
          >
            {isHistoryBusy
              ? "Restoring history…"
              : isFormatting
              ? "Formatting…"
              : isReplacing
              ? "Replacing…"
              : isSorting
                ? "Sorting…"
                : isRowOperation
                ? "Updating rows…"
                : isClearing
                  ? "Clearing…"
                  : "Pasting…"}
          </span>
        ) : null}

        {formatPainterSource ? (
          <span
            title="Format Painter is active"
            style={{
                marginRight: sheet.sheet_type === null ? 0 : "auto",
                order: sheet.sheet_type === null ? 331 : undefined,
              height: 26,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "0 8px",
              border: "1px solid #bfdbfe",
              borderRadius: 5,
              background: "#eff6ff",
              color: "#1d4ed8",
              fontSize: 10,
              fontWeight: 700,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            🖌 Painter · {formatPainterSource.formats.length}
          </span>
        ) : null}

        {activeFilterCount > 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
                marginLeft: sheet.sheet_type === null ? 0 : "auto",
                order: sheet.sheet_type === null ? 332 : undefined,
              fontSize: 10,
              fontWeight: 700,
              color: "#175cd3",
              whiteSpace: "nowrap",
            }}
          >
            <span>
              {filteredRows.length} of {rows.length} rows · {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
            </span>

            <button
              type="button"
              onClick={clearAllFilters}
              style={{
                border: 0,
                background: "transparent",
                padding: 0,
                color: "#175cd3",
                fontSize: 10,
                fontWeight: 800,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Clear
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (formatPainterSource) {
              void applyFormatPainterToSelection();
            } else {
              captureFormatPainterSource();
            }
          }}
          disabled={isFormatting}
          title={
            formatPainterSource
              ? "Apply copied formatting to the current selection"
              : "Copy formatting from the current selection"
          }
          style={{
            ...toolbarButtonStyle,
            width:
              sheet.sheet_type === null
                ? formatPainterSource
                  ? 54
                  : 34
                : formatPainterSource
                  ? 76
                  : 42,
            minWidth:
              sheet.sheet_type === null
                ? formatPainterSource
                  ? 54
                  : 34
                : formatPainterSource
                  ? 76
                  : 42,
            padding:
              sheet.sheet_type === null
                ? 0
                : "0 6px",
            whiteSpace: "nowrap",
            flexShrink: 0,
            border: formatPainterSource
              ? sheet.sheet_type === null
                ? "1px solid #f97316"
                : "1px solid #2563eb"
              : sheet.sheet_type === null
                ? "1px solid transparent"
                : toolbarButtonStyle.border,
            background: formatPainterSource
              ? sheet.sheet_type === null
                ? "#fff3e8"
                : "#eff6ff"
              : sheet.sheet_type === null
                ? "transparent"
                : toolbarButtonStyle.background,
            fontWeight: 700,
              order: sheet.sheet_type === null ? 110 : undefined,
          }}
        >
          {formatPainterSource
            ? sheet.sheet_type === null
              ? "Apply"
              : "Apply"
            : "🖌"}
        </button>

        {formatPainterSource ? (
          <button
            type="button"
            onClick={cancelFormatPainter}
            disabled={isFormatting}
            title="Cancel Format Painter"
            style={{
              ...toolbarButtonStyle,
              width: 28,
              minWidth: 28,
              padding: 0,
              flexShrink: 0,
                order: sheet.sheet_type === null ? 111 : undefined,
            }}
          >
            ×
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => void clearSelectionFormatting()}
          disabled={isFormatting}
          title="Clear all formatting from selected cells"
          style={{
            ...toolbarButtonStyle,
            width: sheet.sheet_type === null ? 34 : undefined,
            minWidth: sheet.sheet_type === null ? 34 : 38,
            padding:
              sheet.sheet_type === null
                ? 0
                : "0 7px",
            flexShrink: 0,
            fontWeight: 700,
            border:
              sheet.sheet_type === null
                ? "1px solid transparent"
                : toolbarButtonStyle.border,
            background:
              sheet.sheet_type === null
                ? "transparent"
                : toolbarButtonStyle.background,
              order: sheet.sheet_type === null ? 112 : undefined,
          }}
        >
          A×
        </button>

        {sheet.sheet_type === null ? (
          <>
            <button
              type="button"
              onClick={() => void applySelectionNumberFormat("currency")}
              disabled={isFormatting}
              title="Currency format"
              aria-label="Currency format"
              style={{
                ...toolbarButtonStyle,
                width: 32,
                minWidth: 32,
                padding: 0,
                border:
                  selectionNumberFormat() === "currency"
                    ? "1px solid #f97316"
                    : "1px solid transparent",
                background:
                  selectionNumberFormat() === "currency"
                    ? "#fff3e8"
                    : "transparent",
                fontSize: 14,
                flexShrink: 0,
                  order: 40,
              }}
            >
              €
            </button>

            <button
              type="button"
              onClick={() => void applySelectionNumberFormat("percentage")}
              disabled={isFormatting}
              title="Percentage format"
              aria-label="Percentage format"
              style={{
                ...toolbarButtonStyle,
                width: 32,
                minWidth: 32,
                padding: 0,
                border:
                  selectionNumberFormat() === "percentage"
                    ? "1px solid #f97316"
                    : "1px solid transparent",
                background:
                  selectionNumberFormat() === "percentage"
                    ? "#fff3e8"
                    : "transparent",
                fontSize: 13,
                flexShrink: 0,
                  order: 41,
              }}
            >
              %
            </button>

            <button
              type="button"
              onClick={() => void adjustSelectionDecimals(-1)}
              disabled={isFormatting}
              title="Decrease decimal"
              aria-label="Decrease decimal"
              style={{
                ...toolbarButtonStyle,
                width: 38,
                minWidth: 38,
                padding: 0,
                border: "1px solid transparent",
                background: "transparent",
                flexShrink: 0,
                  order: 42,
              }}
            >
              ←.0
            </button>

            <button
              type="button"
              onClick={() => void adjustSelectionDecimals(1)}
              disabled={isFormatting}
              title="Increase decimal"
              aria-label="Increase decimal"
              style={{
                ...toolbarButtonStyle,
                width: 42,
                minWidth: 42,
                padding: 0,
                border: "1px solid transparent",
                background: "transparent",
                flexShrink: 0,
                  order: 43,
              }}
            >
              .00→
            </button>

            <select
              value={selectionNumberFormat() ?? ""}
              onChange={(event) => {
                const value = event.target.value as
                  | "general"
                  | "number"
                  | "currency"
                  | "percentage";

                if (value) void applySelectionNumberFormat(value);
              }}
              disabled={isFormatting}
              title="Number format"
              aria-label="Number format"
              style={{
                ...toolbarButtonStyle,
                width: 58,
                minWidth: 58,
                padding: "0 4px",
                border: "1px solid transparent",
                background: "transparent",
                flexShrink: 0,
                  order: 44,
              }}
            >
              {selectionNumberFormat() === null ? (
                <option value="">123</option>
              ) : null}
              <option value="general">123</option>
              <option value="number">0.00</option>
              <option value="currency">€</option>
              <option value="percentage">%</option>
            </select>
          </>
        ) : (
          <>
            <select
              value={selectionNumberFormat() ?? ""}
              onChange={(event) => {
                const value = event.target.value as "general" | "number" | "currency" | "percentage";
                if (value) void applySelectionNumberFormat(value);
              }}
              disabled={isFormatting}
              title="Number format"
              style={{
                ...toolbarButtonStyle,
                width: 92,
                padding: "0 5px",
              }}
            >
              {selectionNumberFormat() === null ? <option value="">Mixed</option> : null}
              <option value="general">General</option>
              <option value="number">Number</option>
              <option value="currency">€ Currency</option>
              <option value="percentage">Percentage</option>
            </select>

            <button
              type="button"
              onClick={() => void adjustSelectionDecimals(-1)}
              disabled={isFormatting}
              title="Decrease decimal"
              style={{ ...toolbarButtonStyle, width: 34, padding: 0 }}
            >
              .0←
            </button>

            <button
              type="button"
              onClick={() => void adjustSelectionDecimals(1)}
              disabled={isFormatting}
              title="Increase decimal"
              style={{ ...toolbarButtonStyle, width: 34, padding: 0 }}
            >
              .00→
            </button>
          </>
        )}

        <div
          title="Text color"
          style={{
            position: "relative",
            width: 34,
            height: 28,
              order: sheet.sheet_type === null ? 80 : undefined,
          }}
        >
          <input
            type="color"
            value={selectionTextColor() ?? "#111827"}
            onChange={(event) =>
              void applySelectionTextColor(
                event.target.value,
              )
            }
            disabled={isFormatting}
            aria-label="Text color"
            style={{
              position: "absolute",
              inset: 0,
              width: 34,
              height: 28,
              padding: sheet.sheet_type === null ? 1 : 3,
              border:
                sheet.sheet_type === null
                  ? "1px solid transparent"
                  : "1px solid #cbd5e1",
              borderRadius: 4,
              background:
                sheet.sheet_type === null
                  ? "transparent"
                  : "#ffffff",
              cursor: "pointer",
            }}
          />
        </div>

        <button
          type="button"
          onClick={() =>
            void applySelectionTextColor(null)
          }
          disabled={isFormatting}
          title="Clear text color"
          style={{
            ...toolbarButtonStyle,
            width: 34,
            minWidth: 34,
            padding: 0,
            fontSize: 12,
            fontWeight: 700,
            border:
              sheet.sheet_type === null
                ? "1px solid transparent"
                : toolbarButtonStyle.border,
            background:
              sheet.sheet_type === null
                ? "transparent"
                : toolbarButtonStyle.background,
            flexShrink: 0,
              order: sheet.sheet_type === null ? 81 : undefined,
          }}
        >
          A⊘
        </button>

        <div
          title="Fill color"
          style={{
            position: "relative",
            width: 34,
            height: 28,
              order: sheet.sheet_type === null ? 82 : undefined,
          }}
        >
          <input
            type="color"
            value={selectionFillColor() ?? "#FFF2CC"}
            onChange={(event) =>
              void applySelectionFillColor(
                event.target.value,
              )
            }
            disabled={isFormatting}
            aria-label="Fill color"
            style={{
              position: "absolute",
              inset: 0,
              width: 34,
              height: 28,
              padding: sheet.sheet_type === null ? 1 : 3,
              border:
                sheet.sheet_type === null
                  ? "1px solid transparent"
                  : "1px solid #cbd5e1",
              borderRadius: 4,
              background:
                sheet.sheet_type === null
                  ? "transparent"
                  : "#ffffff",
              cursor: "pointer",
            }}
          />
        </div>

        <button
          type="button"
          onClick={() =>
            void applySelectionFillColor(null)
          }
          disabled={isFormatting}
          title="Clear fill color"
          style={{
            ...toolbarButtonStyle,
            width: 34,
            minWidth: 34,
            padding: 0,
            fontSize: 15,
            border:
              sheet.sheet_type === null
                ? "1px solid transparent"
                : toolbarButtonStyle.border,
            background:
              sheet.sheet_type === null
                ? "transparent"
                : toolbarButtonStyle.background,
            flexShrink: 0,
              order: sheet.sheet_type === null ? 83 : undefined,
          }}
        >
          ⊘
        </button>

        <select
          defaultValue=""
          onChange={(event) => {
            const value = event.target.value as "all" | "outer" | "top" | "right" | "bottom" | "left" | "none" | "";
            if (value) void applySelectionBorders(value);
            event.currentTarget.value = "";
          }}
          disabled={isFormatting}
          title="Borders"
          aria-label="Borders"
          style={{
            ...toolbarButtonStyle,
            width: sheet.sheet_type === null ? 48 : 76,
            padding: "0 5px",
            border: sheet.sheet_type === null ? "1px solid transparent" : toolbarButtonStyle.border,
            background: sheet.sheet_type === null ? "transparent" : toolbarButtonStyle.background,
              order: sheet.sheet_type === null ? 100 : undefined,
          }}
        >
          <option value="">{sheet.sheet_type === null ? "▦" : "Borders"}</option>
          <option value="all">All</option>
          <option value="outer">Outer</option>
          <option value="top">Top</option>
          <option value="right">Right</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
          <option value="none">None</option>
        </select>

        <select
          value={selectionFontSize() ?? ""}
          onChange={(event) => {
            const size = Number(event.target.value);
            if (size) void applySelectionFontSize(size);
          }}
          disabled={isFormatting}
          title="Font size"
          style={{
            ...toolbarButtonStyle,
            width: sheet.sheet_type === null ? 46 : 52,
            padding: "0 5px",
            textAlign: "center",
            border: sheet.sheet_type === null ? "1px solid transparent" : toolbarButtonStyle.border,
            background: sheet.sheet_type === null ? "transparent" : toolbarButtonStyle.background,
              order: sheet.sheet_type === null ? 60 : undefined,
          }}
        >
          {selectionFontSize() === null ? <option value="">—</option> : null}
          {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void toggleSelectionFormat("bold")}
          disabled={isFormatting}
          style={{
            ...toolbarButtonStyle,
            fontWeight: 800,
            width: sheet.sheet_type === null ? 32 : undefined,
            minWidth: sheet.sheet_type === null ? 32 : undefined,
            padding: sheet.sheet_type === null ? 0 : toolbarButtonStyle.padding,
            background: selectionHasFormat("bold")
              ? "#fff3e8"
              : sheet.sheet_type === null
                ? "transparent"
                : "#ffffff",
            border: `1px solid ${
              selectionHasFormat("bold")
                ? sheet.sheet_type === null
                  ? "#f97316"
                  : "#2e90fa"
                : sheet.sheet_type === null
                  ? "transparent"
                  : "#cbd5e1"
            }`,
              order: sheet.sheet_type === null ? 70 : undefined,
          }}
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => void toggleSelectionFormat("italic")}
          disabled={isFormatting}
          style={{
            ...toolbarButtonStyle,
            fontStyle: "italic",
            width: sheet.sheet_type === null ? 32 : undefined,
            minWidth: sheet.sheet_type === null ? 32 : undefined,
            padding: sheet.sheet_type === null ? 0 : toolbarButtonStyle.padding,
            background: selectionHasFormat("italic")
              ? "#fff3e8"
              : sheet.sheet_type === null
                ? "transparent"
                : "#ffffff",
            border: `1px solid ${
              selectionHasFormat("italic")
                ? sheet.sheet_type === null
                  ? "#f97316"
                  : "#2e90fa"
                : sheet.sheet_type === null
                  ? "transparent"
                  : "#cbd5e1"
            }`,
              order: sheet.sheet_type === null ? 71 : undefined,
          }}
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => void toggleSelectionFormat("underline")}
          disabled={isFormatting}
          style={{
            ...toolbarButtonStyle,
            textDecoration: "underline",
            width: sheet.sheet_type === null ? 32 : undefined,
            minWidth: sheet.sheet_type === null ? 32 : undefined,
            padding: sheet.sheet_type === null ? 0 : toolbarButtonStyle.padding,
            background: selectionHasFormat("underline")
              ? "#fff3e8"
              : sheet.sheet_type === null
                ? "transparent"
                : "#ffffff",
            border: `1px solid ${
              selectionHasFormat("underline")
                ? sheet.sheet_type === null
                  ? "#f97316"
                  : "#2e90fa"
                : sheet.sheet_type === null
                  ? "transparent"
                  : "#cbd5e1"
            }`,
              order: sheet.sheet_type === null ? 72 : undefined,
          }}
          title="Underline (Ctrl+U)"
        >
          U
        </button>

        <span style={{ width: 1, height: 20, background: "#e2e8f0", margin: "0 2px" }} />

        <button
          type="button"
          onClick={() => void applySelectionAlignment("left")}
          disabled={isFormatting}
          style={{
            ...toolbarButtonStyle,
            width: sheet.sheet_type === null ? 32 : undefined,
            minWidth: sheet.sheet_type === null ? 32 : undefined,
            padding: sheet.sheet_type === null ? 0 : toolbarButtonStyle.padding,
            background: selectionHasAlignment("left")
              ? "#fff3e8"
              : sheet.sheet_type === null
                ? "transparent"
                : "#ffffff",
            border: `1px solid ${
              selectionHasAlignment("left")
                ? sheet.sheet_type === null
                  ? "#f97316"
                  : "#2e90fa"
                : sheet.sheet_type === null
                  ? "transparent"
                  : "#cbd5e1"
            }`,
              order: sheet.sheet_type === null ? 90 : undefined,
          }}
          title="Align left"
        >
          ≡←
        </button>
        <button
          type="button"
          onClick={() => void applySelectionAlignment("center")}
          disabled={isFormatting}
          style={{
            ...toolbarButtonStyle,
            width: sheet.sheet_type === null ? 32 : undefined,
            minWidth: sheet.sheet_type === null ? 32 : undefined,
            padding: sheet.sheet_type === null ? 0 : toolbarButtonStyle.padding,
            background: selectionHasAlignment("center")
              ? "#fff3e8"
              : sheet.sheet_type === null
                ? "transparent"
                : "#ffffff",
            border: `1px solid ${
              selectionHasAlignment("center")
                ? sheet.sheet_type === null
                  ? "#f97316"
                  : "#2e90fa"
                : sheet.sheet_type === null
                  ? "transparent"
                  : "#cbd5e1"
            }`,
              order: sheet.sheet_type === null ? 91 : undefined,
          }}
          title="Align center"
        >
          ≡
        </button>
        <button
          type="button"
          onClick={() => void applySelectionAlignment("right")}
          disabled={isFormatting}
          style={{
            ...toolbarButtonStyle,
            width: sheet.sheet_type === null ? 32 : undefined,
            minWidth: sheet.sheet_type === null ? 32 : undefined,
            padding: sheet.sheet_type === null ? 0 : toolbarButtonStyle.padding,
            background: selectionHasAlignment("right")
              ? "#fff3e8"
              : sheet.sheet_type === null
                ? "transparent"
                : "#ffffff",
            border: `1px solid ${
              selectionHasAlignment("right")
                ? sheet.sheet_type === null
                  ? "#f97316"
                  : "#2e90fa"
                : sheet.sheet_type === null
                  ? "transparent"
                  : "#cbd5e1"
            }`,
              order: sheet.sheet_type === null ? 92 : undefined,
          }}
          title="Align right"
        >
          →≡
        </button>

        <button
          type="button"
          onClick={() =>
            openFindReplace(false)
          }
            style={{ ...toolbarButtonStyle, order: sheet.sheet_type === null ? 120 : undefined }}
          title="Find (Ctrl+F)"
        >
          Find
        </button>

          <div style={{ order: sheet.sheet_type === null ? 130 : undefined, flexShrink: 0 }}>
          <button
            ref={addColumnButtonRef}
            type="button"
            onClick={() => {
              if (showAddColumn) {
                setShowAddColumn(false);
                setAddColumnMenuPosition(null);
                return;
              }

              const rect =
                addColumnButtonRef.current?.getBoundingClientRect();

              if (rect) {
                const menuWidth = 220;
                const viewportPadding = 8;

                setAddColumnMenuPosition({
                  top: rect.bottom + 6,
                  left: Math.max(
                    viewportPadding,
                    Math.min(
                      rect.right - menuWidth,
                      window.innerWidth -
                        menuWidth -
                        viewportPadding,
                    ),
                  ),
                });
              }

              setShowAddColumn(true);
            }}
            style={toolbarButtonStyle}
          >
            + Add Column
          </button>

          {showAddColumn &&
          addColumnMenuPosition &&
          typeof document !== "undefined"
            ? createPortal(
                <div
                  data-samzy-add-column-menu="true"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                  }}
                  style={{
                    position: "fixed",
                    top: addColumnMenuPosition.top,
                    left: addColumnMenuPosition.left,
                    zIndex: 2000,
                    width: 220,
                    maxHeight: "min(420px, calc(100vh - 16px))",
                    overflowY: "auto",
                    padding: 6,
                    boxSizing: "border-box",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    boxShadow: "0 12px 28px rgba(15,23,42,.18)",
                  }}
                >
                  <div
                    style={{
                      padding: 6,
                      display: "grid",
                      gap: 6,
                      borderBottom: "1px solid #eef2f6",
                      marginBottom: 4,
                    }}
                  >
                    <input
                      value={newColumnLabel}
                      onChange={(event) =>
                        setNewColumnLabel(
                          event.target.value,
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void createCustomColumn();
                        }

                        if (event.key === "Escape") {
                          event.preventDefault();
                          setShowAddColumn(false);
                          setAddColumnMenuPosition(null);
                        }
                      }}
                      placeholder="New column name"
                      maxLength={80}
                      autoFocus
                      style={{
                        height: 30,
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "0 8px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 4,
                        fontSize: 11,
                        color: "#101828",
                        background: "#ffffff",
                      }}
                    />

                    <select
                      value={newColumnDataType}
                      onChange={(event) =>
                        setNewColumnDataType(
                          event.target.value as
                            | "text"
                            | "number"
                            | "currency"
                            | "percentage"
                            | "date"
                            | "datetime"
                            | "time"
                            | "boolean",
                        )
                      }
                      style={{
                        height: 30,
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "0 8px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 4,
                        fontSize: 11,
                        color: "#101828",
                        background: "#ffffff",
                      }}
                    >
                      <option value="text">Text / General</option>
                      <option value="number">Number</option>
                      <option value="currency">Currency</option>
                      <option value="percentage">Percentage</option>
                      <option value="date">Date</option>
                      <option value="datetime">Date & Time</option>
                      <option value="time">Time</option>
                      <option value="boolean">Checkbox / Boolean</option>
                    </select>

                    <button
                      type="button"
                      disabled={isCreatingColumn}
                      onClick={() =>
                        void createCustomColumn()
                      }
                      style={{
                        ...menuButtonStyle,
                        fontWeight: 700,
                        color: "#101828",
                      }}
                    >
                      {isCreatingColumn
                        ? "Creating…"
                        : "+ Create custom column"}
                    </button>
                  </div>

                  {availableColumns.length ? (
                    <>
                      <div
                        style={{
                          padding: "4px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#98a2b3",
                          textTransform: "uppercase",
                          letterSpacing: ".04em",
                        }}
                      >
                        Restore hidden columns
                      </div>

                      {availableColumns.map((column) => (
                        <button
                          key={column.key}
                          type="button"
                          onClick={() => void addColumn(column.key)}
                          style={menuButtonStyle}
                        >
                          + {column.label}
                        </button>
                      ))}
                    </>
                  ) : null}
                </div>,
                document.body,
              )
            : null}
        </div>
      </div>

      {showFindReplace ? (
        <div
          data-samzy-find-replace="true"
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          style={{
            position: "fixed",
            top: 188,
            right: 24,
            zIndex: 1400,
            width: 304,
            maxWidth: "calc(100vw - 48px)",
            padding: 8,
            boxSizing: "border-box",
            background: "#ffffff",
            border:
              "1px solid #cbd5e1",
            borderRadius: 8,
            boxShadow:
              "0 14px 34px rgba(15,23,42,.18)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 1fr) auto auto auto auto",
              alignItems: "center",
              gap: 6,
            }}
          >
            <input
              ref={findInputRef}
              value={findQuery}
              onChange={(event) => {
                setFindQuery(
                  event.target.value,
                );
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  event.preventDefault();

                  if (event.shiftKey) {
                    previousFindMatch();
                  } else {
                    nextFindMatch();
                  }
                }

                if (
                  event.key === "Escape"
                ) {
                  event.preventDefault();
                  closeFindReplace();
                }
              }}
              placeholder="Find in Smart Sheet"
              style={{
                flex: 1,
                height: 30,
                boxSizing:
                  "border-box",
                border:
                  "1px solid #d0d5dd",
                borderRadius: 6,
                padding:
                  "0 8px",
                fontSize: 11,
                outline: "none",
              }}
            />

            <span
              style={{
                minWidth: 46,
                color: "#667085",
                fontSize: 10,
                textAlign: "center",
                whiteSpace:
                  "nowrap",
              }}
            >
              {findQuery.trim() === ""
                ? "0 / 0"
                : findMatches.length === 0
                  ? "0 / 0"
                  : `${Math.min(
                      activeFindMatchIndex + 1,
                      findMatches.length,
                    )} / ${findMatches.length}`}
            </span>

            <button
              type="button"
              onClick={previousFindMatch}
              disabled={
                findMatches.length === 0
              }
              title="Previous match (Shift+Enter)"
              style={{
                ...toolbarButtonStyle,
                minWidth: 30,
                padding: "0 7px",
              }}
            >
              ↑
            </button>

            <button
              type="button"
              onClick={nextFindMatch}
              disabled={
                findMatches.length === 0
              }
              title="Next match (Enter)"
              style={{
                ...toolbarButtonStyle,
                minWidth: 30,
                padding: "0 7px",
              }}
            >
              ↓
            </button>

            <button
              type="button"
              onClick={closeFindReplace}
              title="Close"
              style={{
                ...toolbarButtonStyle,
                minWidth: 30,
                padding: "0 7px",
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 6,
            }}
          >
            <button
              type="button"
              onClick={() =>
                setShowReplaceControls(
                  (current) =>
                    !current,
                )
              }
              style={{
                ...toolbarButtonStyle,
                height: 26,
                fontSize: 10,
              }}
            >
              {showReplaceControls
                ? "Hide Replace"
                : "Replace"}
            </button>

            <span
              style={{
                color: "#667085",
                fontSize: 9,
              }}
            >
              Ctrl+F Find · Ctrl+H Replace
            </span>
          </div>

          {showReplaceControls ? (
            <div
              style={{
                marginTop: 7,
                paddingTop: 7,
                borderTop:
                  "1px solid #eef2f6",
              }}
            >
              <input
                value={replaceQuery}
                onChange={(event) => {
                  setReplaceQuery(
                    event.target.value,
                  );
                }}
                placeholder="Replace with"
                style={{
                  width: "100%",
                  height: 30,
                  boxSizing:
                    "border-box",
                  border:
                    "1px solid #d0d5dd",
                  borderRadius: 6,
                  padding:
                    "0 8px",
                  fontSize: 11,
                  outline: "none",
                }}
              />

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 7,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    void replaceCurrentFindMatch();
                  }}
                  disabled={
                    isReplacing ||
                    findMatches.length === 0
                  }
                  style={{
                    ...toolbarButtonStyle,
                    flex: 1,
                    height: 28,
                    cursor:
                      isReplacing
                        ? "wait"
                        : "pointer",
                  }}
                >
                  Replace
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void replaceAllFindMatches();
                  }}
                  disabled={
                    isReplacing ||
                    findMatches.length === 0
                  }
                  style={{
                    ...toolbarButtonStyle,
                    flex: 1,
                    height: 28,
                    cursor:
                      isReplacing
                        ? "wait"
                        : "pointer",
                  }}
                >
                  Replace All
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {columnMenu && selectedColumnRange ? (
        <div
          data-samzy-column-menu="true"
          onContextMenu={(event) => {
            event.preventDefault();
          }}
          style={{
            position: "fixed",
            left: Math.min(
              columnMenu.x,
              typeof window !== "undefined"
                ? window.innerWidth - 256
                : columnMenu.x,
            ),
            top: Math.min(
              columnMenu.y,
              typeof window !== "undefined"
                ? window.innerHeight - 620
                : columnMenu.y,
            ),
            zIndex: 1000,
            width: 244,
            maxHeight:
              typeof window !== "undefined"
                ? Math.max(220, window.innerHeight - 24)
                : 720,
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: 6,
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 7,
            boxShadow:
              "0 12px 28px rgba(15,23,42,.18)",
          }}
        >
          <div
            style={{
              padding: "5px 8px 7px",
              marginBottom: 4,
              borderBottom:
                "1px solid #eef2f6",
              color: "#667085",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {selectedColumnKeys.length === 1
              ? `Column ${columnLetter(selectedColumnRange.startColumn)}`
              : `Columns ${columnLetter(selectedColumnRange.startColumn)}–${columnLetter(selectedColumnRange.endColumn)}`}
          </div>

          <button
            type="button"
            onClick={() => {
              void insertNewCustomColumn(
                "left",
              );
            }}
            style={menuButtonStyle}
          >
            Insert new column left
          </button>

          <button
            type="button"
            onClick={() => {
              void insertNewCustomColumn(
                "right",
              );
            }}
            style={menuButtonStyle}
          >
            Insert new column right
          </button>

          <div
            style={{
              height: 1,
              margin: "4px 0",
              background: "#eef2f6",
            }}
          />

          {selectedColumnKeys.length === 1 ? (
            <>
              <button
                type="button"
                onClick={() => {
                  const key =
                    selectedColumnKeys[0];

                  if (
                    filterEditorColumnKey === key
                  ) {
                    setFilterEditorColumnKey(null);
                  } else {
                    openFilterEditor(key);
                  }
                }}
                style={menuButtonStyle}
              >
                {columnFilters[selectedColumnKeys[0]]
                  ? "Edit filter…"
                  : "Filter column…"}
              </button>

              {columnFilters[selectedColumnKeys[0]] ? (
                <button
                  type="button"
                  onClick={() =>
                    clearColumnFilter(
                      selectedColumnKeys[0],
                    )
                  }
                  style={menuButtonStyle}
                >
                  Clear this filter
                </button>
              ) : null}

              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  style={menuButtonStyle}
                >
                  Clear all filters ({activeFilterCount})
                </button>
              ) : null}

              {filterEditorColumnKey ===
                selectedColumnKeys[0] &&
              filterEditorColumn ? (
                <div
                  onMouseDown={(event) => {
                    event.stopPropagation();
                  }}
                  style={{
                    margin: "5px 0",
                    padding: 8,
                    border:
                      "1px solid #d0d5dd",
                    borderRadius: 6,
                    background:
                      "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      marginBottom: 6,
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#344054",
                    }}
                  >
                    Filter {filterEditorColumn.label}
                  </div>

                  <select
                    value={filterDraftOperator}
                    onChange={(event) => {
                      setFilterDraftOperator(
                        event.target
                          .value as FilterOperator,
                      );
                    }}
                    style={{
                      width: "100%",
                      height: 28,
                      border:
                        "1px solid #d0d5dd",
                      borderRadius: 5,
                      background:
                        "#ffffff",
                      fontSize: 10,
                      padding:
                        "0 6px",
                    }}
                  >
                    {filterEditorColumn.type ===
                    "text" ? (
                      <>
                        <option value="contains">
                          Contains
                        </option>
                        <option value="not_contains">
                          Does not contain
                        </option>
                        <option value="equals">
                          Equals
                        </option>
                        <option value="starts_with">
                          Starts with
                        </option>
                        <option value="ends_with">
                          Ends with
                        </option>
                      </>
                    ) : (
                      <>
                        <option value="equals">
                          Equals
                        </option>
                        <option value="gt">
                          Greater than
                        </option>
                        <option value="gte">
                          Greater than or equal
                        </option>
                        <option value="lt">
                          Less than
                        </option>
                        <option value="lte">
                          Less than or equal
                        </option>
                        <option value="between">
                          Between
                        </option>
                      </>
                    )}

                    <option value="values">
                      Choose values
                    </option>
                    <option value="is_blank">
                      Is blank
                    </option>
                    <option value="is_not_blank">
                      Is not blank
                    </option>
                  </select>

                  {![
                    "is_blank",
                    "is_not_blank",
                    "values",
                  ].includes(
                    filterDraftOperator,
                  ) ? (
                    <input
                      value={filterDraftValue}
                      onChange={(event) =>
                        setFilterDraftValue(
                          event.target.value,
                        )
                      }
                      placeholder={
                        filterEditorColumn.type ===
                        "text"
                          ? "Value"
                          : "Number"
                      }
                      style={{
                        width: "100%",
                        height: 28,
                        marginTop: 6,
                        boxSizing:
                          "border-box",
                        border:
                          "1px solid #d0d5dd",
                        borderRadius: 5,
                        background:
                          "#ffffff",
                        fontSize: 10,
                        padding:
                          "0 7px",
                      }}
                    />
                  ) : null}

                  {filterDraftOperator ===
                  "between" ? (
                    <input
                      value={filterDraftValue2}
                      onChange={(event) =>
                        setFilterDraftValue2(
                          event.target.value,
                        )
                      }
                      placeholder="Second number"
                      style={{
                        width: "100%",
                        height: 28,
                        marginTop: 6,
                        boxSizing:
                          "border-box",
                        border:
                          "1px solid #d0d5dd",
                        borderRadius: 5,
                        background:
                          "#ffffff",
                        fontSize: 10,
                        padding:
                          "0 7px",
                      }}
                    />
                  ) : null}

                  {filterDraftOperator ===
                  "values" ? (
                    <div
                      style={{
                        marginTop: 6,
                        maxHeight: 150,
                        overflowY:
                          "auto",
                        border:
                          "1px solid #e4e7ec",
                        borderRadius: 5,
                        background:
                          "#ffffff",
                      }}
                    >
                      <label
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: 6,
                          padding:
                            "6px 7px",
                          borderBottom:
                            "1px solid #f2f4f7",
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={
                            filterEditorUniqueValues.length >
                              0 &&
                            filterDraftSelectedValues.length ===
                              filterEditorUniqueValues.length
                          }
                          onChange={(event) => {
                            setFilterDraftSelectedValues(
                              event.target
                                .checked
                                ? [
                                    ...filterEditorUniqueValues,
                                  ]
                                : [],
                            );
                          }}
                        />
                        Select all
                      </label>

                      {filterEditorUniqueValues.map(
                        (value) => {
                          const checked =
                            filterDraftSelectedValues.includes(
                              value,
                            );

                          return (
                            <label
                              key={
                                value === ""
                                  ? "__blank__"
                                  : value
                              }
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: 6,
                                padding:
                                  "5px 7px",
                                fontSize: 10,
                                cursor:
                                  "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  checked
                                }
                                onChange={(
                                  event,
                                ) => {
                                  setFilterDraftSelectedValues(
                                    (
                                      current,
                                    ) =>
                                      event
                                        .target
                                        .checked
                                        ? Array.from(
                                            new Set(
                                              [
                                                ...current,
                                                value,
                                              ],
                                            ),
                                          )
                                        : current.filter(
                                            (
                                              candidate,
                                            ) =>
                                              candidate !==
                                              value,
                                          ),
                                  );
                                }}
                              />

                              <span
                                style={{
                                  overflow:
                                    "hidden",
                                  textOverflow:
                                    "ellipsis",
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {value === ""
                                  ? "(Blanks)"
                                  : value}
                              </span>
                            </label>
                          );
                        },
                      )}
                    </div>
                  ) : null}

                  <div
                    style={{
                      display:
                        "flex",
                      gap: 6,
                      marginTop: 7,
                    }}
                  >
                    <button
                      type="button"
                      onClick={applyFilterDraft}
                      style={{
                        ...menuButtonStyle,
                        flex: 1,
                        width: "auto",
                        background:
                          "#111827",
                        color:
                          "#ffffff",
                        textAlign:
                          "center",
                      }}
                    >
                      Apply
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFilterEditorColumnKey(
                          null,
                        )
                      }
                      style={{
                        ...menuButtonStyle,
                        flex: 1,
                        width: "auto",
                        textAlign:
                          "center",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              <div
                style={{
                  height: 1,
                  margin: "4px 0",
                  background: "#eef2f6",
                }}
              />
            </>
          ) : null}

          <button
            type="button"
            onClick={() => {
              void sortSelectedColumn("asc");
            }}
            disabled={isSorting}
            style={{
              ...menuButtonStyle,
              cursor: isSorting
                ? "wait"
                : "pointer",
            }}
          >
            Sort ascending
          </button>

          <button
            type="button"
            onClick={() => {
              void sortSelectedColumn("desc");
            }}
            disabled={isSorting}
            style={{
              ...menuButtonStyle,
              cursor: isSorting
                ? "wait"
                : "pointer",
            }}
          >
            Sort descending
          </button>

          <div
            style={{
              height: 1,
              margin: "4px 0",
              background: "#eef2f6",
            }}
          />

          <button
            type="button"
            onClick={freezeColumnsThroughSelection}
            style={menuButtonStyle}
          >
            {selectedColumnRange.endColumn === 0
              ? "Freeze first column"
              : `Freeze through column ${columnLetter(selectedColumnRange.endColumn)}`}
          </button>

          {frozenColumnCount > 0 ? (
            <button
              type="button"
              onClick={unfreezeAllColumns}
              style={menuButtonStyle}
            >
              Unfreeze columns
            </button>
          ) : null}

          <div
            style={{
              height: 1,
              margin: "4px 0",
              background: "#eef2f6",
            }}
          />

          <button
            type="button"
            onClick={resetSelectedColumnWidths}
            style={menuButtonStyle}
          >
            {selectedColumnKeys.length === 1
              ? "Reset column width"
              : `Reset ${selectedColumnKeys.length} column widths`}
          </button>

          <button
            type="button"
            onClick={resetAllColumnWidths}
            style={menuButtonStyle}
          >
            Reset all column widths
          </button>

          <div
            style={{
              height: 1,
              margin: "4px 0",
              background: "#eef2f6",
            }}
          />

          <div
            style={{
              margin: "4px 0 6px",
              padding: 8,
              border: "1px solid #d0d5dd",
              borderRadius: 6,
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                marginBottom: 6,
                fontSize: 10,
                fontWeight: 800,
                color: "#344054",
              }}
            >
              Column type / number format
            </div>

            <select
              value={
                selectedCustomColumnPresentation() ??
                "text"
              }
              onChange={(event) => {
                void changeSelectedCustomColumnPresentation(
                  event.target.value as
                    | "text"
                    | "number"
                    | "currency"
                    | "percentage"
                    | "date"
                    | "datetime"
                    | "time"
                    | "boolean",
                );
              }}
              disabled={
                isUpdatingColumnPresentation ||
                selectedColumnKeys.length !== 1 ||
                selectedCustomColumnKeys.length !== 1
              }
              title={
                selectedColumnKeys.length === 1 &&
                selectedCustomColumnKeys.length === 1
                  ? undefined
                  : "Column type changes are available for one custom column at a time."
              }
              aria-label="Column type and number format"
              style={{
                width: "100%",
                height: 30,
                boxSizing: "border-box",
                border: "1px solid #98a2b3",
                borderRadius: 5,
                background: "#ffffff",
                color:
                  selectedColumnKeys.length === 1 &&
                  selectedCustomColumnKeys.length === 1
                    ? "#111827"
                    : "#98a2b3",
                fontSize: 11,
                padding: "0 7px",
                outline: "none",
                cursor:
                  isUpdatingColumnPresentation
                    ? "wait"
                    : selectedColumnKeys.length === 1 &&
                        selectedCustomColumnKeys.length === 1
                      ? "pointer"
                      : "not-allowed",
              }}
            >
              <option value="text">
                Text / General
              </option>
              <option value="number">
                Number
              </option>
              <option value="currency">
                Currency (€)
              </option>
              <option value="percentage">
                Percentage (%)
              </option>
              <option value="date">
                Date
              </option>
              <option value="datetime">
                Date & Time
              </option>
              <option value="time">
                Time
              </option>
              <option value="boolean">
                Checkbox / Boolean
              </option>
            </select>

            <div
              style={{
                marginTop: 7,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#475467",
                }}
              >
                Decimal places
              </span>

              <select
                value={
                  selectedCustomColumnKeys.length === 1
                    ? customColumnDecimalPlaces(
                        selectedCustomColumnKeys[0],
                      )
                    : 2
                }
                onChange={(event) => {
                  void changeSelectedCustomColumnDecimalPlaces(
                    Number(
                      event.target.value,
                    ),
                  );
                }}
                disabled={
                  isUpdatingColumnDecimals ||
                  selectedColumnKeys.length !== 1 ||
                  selectedCustomColumnKeys.length !== 1 ||
                  ![
                    "number",
                    "currency",
                    "percentage",
                  ].includes(
                    selectedCustomColumnPresentation() ??
                      "text",
                  )
                }
                aria-label="Column decimal places"
                style={{
                  width: 72,
                  height: 28,
                  boxSizing: "border-box",
                  border: "1px solid #98a2b3",
                  borderRadius: 5,
                  background: "#ffffff",
                  color: "#111827",
                  fontSize: 11,
                  padding: "0 6px",
                  outline: "none",
                  cursor:
                    isUpdatingColumnDecimals
                      ? "wait"
                      : "pointer",
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6].map(
                  (places) => (
                    <option
                      key={places}
                      value={places}
                    >
                      {places}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 9,
                lineHeight: 1.35,
                color: "#667085",
              }}
            >
              Changes column type metadata only. Stored cell values and business calculations are preserved. Date, date/time, time, and boolean custom columns use native cell editors; stored values and business calculations remain preserved.
            </div>
          </div>

          <div
            style={{
              margin: "4px 0 6px",
              padding: 8,
              border: "1px solid #d0d5dd",
              borderRadius: 6,
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                marginBottom: 6,
                fontSize: 10,
                fontWeight: 800,
                color: "#344054",
              }}
            >
              SAMZY semantic mapping
            </div>

            <input
              aria-label="SAMZY semantic role"
              value={semanticRoleDraft}
              onChange={(event) =>
                setSemanticRoleDraft(
                  event.target.value,
                )
              }
              maxLength={120}
              disabled={
                isUpdatingSemanticMapping ||
                selectedColumnKeys.length !== 1 ||
                selectedCustomColumnKeys.length !== 1
              }
              placeholder="e.g. selling price, supplier SKU, logistics cost"
              style={{
                width: "100%",
                height: 30,
                boxSizing: "border-box",
                border: "1px solid #98a2b3",
                borderRadius: 5,
                background: "#ffffff",
                color: "#111827",
                fontFamily: "inherit",
                fontSize: 11,
                padding: "0 7px",
                outline: "none",
              }}
            />

            <div
              style={{
                marginTop: 5,
                padding: "5px 7px",
                borderRadius: 5,
                background: "#ffffff",
                border: "1px solid #e4e7ec",
                fontSize: 9,
                lineHeight: 1.35,
                color: "#667085",
              }}
            >
              Canonical role:{" "}
              <code
                style={{
                  color: "#344054",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {semanticRoleDraft.trim()
                  ? resolveSemanticRole(
                      semanticRoleDraft,
                    ).canonicalRole || "—"
                  : selectedCustomColumnKeys.length === 1
                    ? customColumnCanonicalRole(
                        selectedCustomColumnKeys[0],
                      ) || "—"
                    : "—"}
              </code>
              {semanticRoleDraft.trim() ? (
                <span
                  style={{
                    marginLeft: 6,
                    color: resolveSemanticRole(semanticRoleDraft).recognized
                      ? "#067647"
                      : "#667085",
                    fontWeight: 700,
                  }}
                >
                  {resolveSemanticRole(semanticRoleDraft).recognized
                    ? `${semanticLanguageLabel(resolveSemanticRole(semanticRoleDraft).recognizedLanguage) ?? "Recognized"} alias`
                    : "Custom meaning"}
                </span>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 7,
                display: "flex",
                gap: 6,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  void applySelectedCustomColumnSemanticMapping()
                }
                disabled={
                  isUpdatingSemanticMapping ||
                  selectedCustomColumnKeys.length !== 1 ||
                  semanticRoleDraft.trim().length === 0
                }
                style={{
                  ...menuButtonStyle,
                  flex: "1 1 auto",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                {isUpdatingSemanticMapping
                  ? "Saving…"
                  : "Map meaning"}
              </button>

              <button
                type="button"
                onClick={() =>
                  void clearSelectedCustomColumnSemanticMapping()
                }
                disabled={
                  isUpdatingSemanticMapping ||
                  selectedCustomColumnKeys.length !== 1 ||
                  customColumnSemanticRole(
                    selectedCustomColumnKeys[0] ?? "",
                  ).length === 0
                }
                style={{
                  ...menuButtonStyle,
                  width: 66,
                  justifyContent: "center",
                }}
              >
                Clear
              </button>
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 9,
                lineHeight: 1.35,
                color: "#667085",
              }}
            >
              Optional metadata only. Keep any business wording or language you want. This multilingual recognition layer prepares the same canonical concepts for future OCR + AI document understanding without changing column values, formulas, or calculations.
            </div>
          </div>

          <div
            style={{
              margin: "4px 0 6px",
              padding: 8,
              border: "1px solid #d0d5dd",
              borderRadius: 6,
              background: "#f8fafc",
            }}
          >
            <div
              style={{
                marginBottom: 6,
                fontSize: 10,
                fontWeight: 800,
                color: "#344054",
              }}
            >
              Data validation / dropdown
            </div>

            <textarea
              aria-label="Dropdown values"
              value={columnValidationDraft}
              onChange={(event) =>
                setColumnValidationDraft(
                  event.target.value,
                )
              }
              disabled={
                isUpdatingColumnValidation ||
                selectedColumnKeys.length !== 1 ||
                selectedCustomColumnKeys.length !== 1 ||
                selectedCustomColumnPresentation() !== "text"
              }
              placeholder={"One value per line\nPending\nApproved\nRejected"}
              rows={4}
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
                minHeight: 72,
                padding: "6px 7px",
                border: "1px solid #98a2b3",
                borderRadius: 5,
                background: "#ffffff",
                color: "#111827",
                fontFamily: "inherit",
                fontSize: 11,
                lineHeight: 1.35,
                outline: "none",
              }}
            />

            <div
              style={{
                marginTop: 7,
                display: "flex",
                gap: 6,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  void applySelectedCustomColumnListValidation()
                }
                disabled={
                  isUpdatingColumnValidation ||
                  selectedCustomColumnKeys.length !== 1 ||
                  selectedCustomColumnPresentation() !== "text"
                }
                style={{
                  ...menuButtonStyle,
                  flex: "1 1 auto",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                {isUpdatingColumnValidation
                  ? "Saving…"
                  : "Apply dropdown"}
              </button>

              <button
                type="button"
                onClick={() =>
                  void clearSelectedCustomColumnListValidation()
                }
                disabled={
                  isUpdatingColumnValidation ||
                  selectedCustomColumnKeys.length !== 1 ||
                  customColumnValidationValues(
                    selectedCustomColumnKeys[0] ?? "",
                  ).length === 0
                }
                style={{
                  ...menuButtonStyle,
                  width: 58,
                  justifyContent: "center",
                }}
              >
                Clear
              </button>
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 9,
                lineHeight: 1.35,
                color: "#667085",
              }}
            >
              V1 applies to one Text / General custom column. Existing values are preserved; the Formula Bar remains available for free-form edits.
            </div>
          </div>

          <div
            style={{
              margin: "4px 0 6px",
              padding: 8,
              border: "1px solid #d0d5dd",
              borderRadius: 6,
              background: "#f8fafc",
            }}
          >
            <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 800, color: "#344054" }}>
              Conditional formatting
            </div>

            <select
              aria-label="Conditional formatting operator"
              value={conditionalFormatOperator}
              onChange={(event) =>
                setConditionalFormatOperator(
                  event.target.value as ConditionalFormatOperator,
                )
              }
              disabled={isUpdatingConditionalFormat || selectedCustomColumnKeys.length !== 1}
              style={{ width: "100%", height: 30, boxSizing: "border-box", border: "1px solid #98a2b3", borderRadius: 5, background: "#ffffff", fontSize: 11, padding: "0 6px" }}
            >
              <option value="equals">Equals</option>
              <option value="contains">Text contains</option>
              <option value="gt">Greater than</option>
              <option value="lt">Less than</option>
            </select>

            <input
              aria-label="Conditional formatting value"
              value={conditionalFormatValue}
              onChange={(event) => setConditionalFormatValue(event.target.value)}
              placeholder="Value"
              disabled={isUpdatingConditionalFormat || selectedCustomColumnKeys.length !== 1}
              style={{ width: "100%", height: 30, marginTop: 6, boxSizing: "border-box", border: "1px solid #98a2b3", borderRadius: 5, background: "#ffffff", fontSize: 11, padding: "0 7px" }}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 7, alignItems: "center" }}>
              <label style={{ fontSize: 9, color: "#667085" }}>
                Fill
                <input aria-label="Conditional fill color" type="color" value={conditionalFormatFillColor} onChange={(event) => setConditionalFormatFillColor(event.target.value)} style={{ display: "block", width: 46, height: 28, marginTop: 2 }} />
              </label>
              <label style={{ fontSize: 9, color: "#667085" }}>
                Text
                <input aria-label="Conditional text color" type="color" value={conditionalFormatTextColor} onChange={(event) => setConditionalFormatTextColor(event.target.value)} style={{ display: "block", width: 46, height: 28, marginTop: 2 }} />
              </label>
            </div>

            <div style={{ marginTop: 7, display: "flex", gap: 6 }}>
              <button type="button" onClick={() => void applySelectedCustomColumnConditionalFormatting()} disabled={isUpdatingConditionalFormat || selectedCustomColumnKeys.length !== 1} style={{ ...menuButtonStyle, flex: "1 1 auto", justifyContent: "center", fontWeight: 700 }}>
                {isUpdatingConditionalFormat ? "Saving…" : "Apply rule"}
              </button>
              <button type="button" onClick={() => void clearSelectedCustomColumnConditionalFormatting()} disabled={isUpdatingConditionalFormat || selectedCustomColumnKeys.length !== 1 || !customColumnConditionalFormat(selectedCustomColumnKeys[0] ?? "")} style={{ ...menuButtonStyle, width: 58, justifyContent: "center" }}>
                Clear
              </button>
            </div>

            <div style={{ marginTop: 6, fontSize: 9, lineHeight: 1.35, color: "#667085" }}>
              V1 applies one rule to one custom column. Appearance only; stored values and business calculations stay untouched.
            </div>
          </div>

          {renameColumnEditor ? (
            <div
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              style={{
                margin: "4px 0 6px",
                padding: 8,
                border: "1px solid #d0d5dd",
                borderRadius: 6,
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  marginBottom: 6,
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#344054",
                }}
              >
                Rename column
              </div>

              <input
                autoFocus
                value={renameColumnEditor.label}
                maxLength={80}
                onChange={(event) => {
                  const label = event.target.value;
                  setRenameColumnEditor((current) =>
                    current
                      ? {
                          ...current,
                          label,
                        }
                      : current,
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void submitRenameSelectedCustomColumn();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    setRenameColumnEditor(null);
                  }
                }}
                disabled={isRenamingColumn}
                aria-label="New column name"
                style={{
                  width: "100%",
                  height: 30,
                  boxSizing: "border-box",
                  border: "1px solid #98a2b3",
                  borderRadius: 5,
                  background: "#ffffff",
                  color: "#111827",
                  fontSize: 11,
                  padding: "0 7px",
                  outline: "none",
                }}
              />

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 7,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    void submitRenameSelectedCustomColumn();
                  }}
                  disabled={
                    isRenamingColumn ||
                    !renameColumnEditor.label.trim()
                  }
                  style={{
                    ...menuButtonStyle,
                    flex: 1,
                    width: "auto",
                    background: "#111827",
                    color: "#ffffff",
                    textAlign: "center",
                    cursor: isRenamingColumn
                      ? "wait"
                      : "pointer",
                    opacity:
                      !renameColumnEditor.label.trim()
                        ? 0.55
                        : 1,
                  }}
                >
                  {isRenamingColumn
                    ? "Renaming…"
                    : "Rename"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRenameColumnEditor(null);
                  }}
                  disabled={isRenamingColumn}
                  style={{
                    ...menuButtonStyle,
                    flex: 1,
                    width: "auto",
                    textAlign: "center",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={beginRenameSelectedCustomColumn}
              disabled={
                selectedColumnKeys.length !== 1 ||
                selectedCustomColumnKeys.length !== 1
              }
              title={
                selectedColumnKeys.length === 1 &&
                selectedCustomColumnKeys.length === 1
                  ? undefined
                  : "Rename is available for one custom column at a time."
              }
              style={{
                ...menuButtonStyle,
                color:
                  selectedColumnKeys.length === 1 &&
                  selectedCustomColumnKeys.length === 1
                    ? "#344054"
                    : "#98a2b3",
                cursor:
                  selectedColumnKeys.length === 1 &&
                  selectedCustomColumnKeys.length === 1
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              Rename column…
            </button>
          )}

          <button
            type="button"
            onClick={hideSelectedColumns}
            style={menuButtonStyle}
          >
            {selectedColumnKeys.length === 1
              ? "Hide column"
              : `Hide ${selectedColumnKeys.length} columns`}
          </button>

          <button
            type="button"
            onClick={() => {
              void deleteSelectedCustomColumn();
            }}
            disabled={
              selectedColumnKeys.length !== 1 ||
              selectedCustomColumnKeys.length !== 1
            }
            title={
              selectedColumnKeys.length === 1 &&
              selectedCustomColumnKeys.length === 1
                ? undefined
                : "System business columns are protected. Select one custom column to delete."
            }
            style={{
              ...menuButtonStyle,
              color:
                selectedColumnKeys.length === 1 &&
                selectedCustomColumnKeys.length === 1
                  ? "#b42318"
                  : "#98a2b3",
              cursor:
                selectedColumnKeys.length === 1 &&
                selectedCustomColumnKeys.length === 1
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            {selectedColumnKeys.length === 1 &&
            selectedCustomColumnKeys.length === 1
              ? "Delete custom column…"
              : "Delete column unavailable"}
          </button>
        </div>
      ) : null}

      {sheet.sheet_type === null ? (
        <SmartSheetFormulaBar
          sheetId={sheet.id}
          generalSheet
        />
      ) : null}

      <div
        style={{
          display: "flex",
          width: "100%",
          minWidth: 0,
          height:
            sheet.sheet_type === null
              ? "calc(100vh - 291px)"
              : "calc(100vh - 360px)",
          minHeight:
            sheet.sheet_type === null
              ? 480
              : 330,
          maxHeight:
            sheet.sheet_type === null
              ? "none"
              : 620,
          background: "#ffffff",
          border: "1px solid #aeb6c2",
          boxSizing: "border-box",
        }}
      >
        <div
          ref={gridRef}
          className="samzy-smart-sheet-grid"
          role="grid"
          tabIndex={0}
          onKeyDown={handleGridKeyDown}
          onCopy={handleGridCopy}
          onCut={handleGridCut}
          onPaste={handleGridPaste}
          onWheel={handleGridWheel}
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            height: "100%",
            overflowX: "auto",
            overflowY: "hidden",
            background: "#ffffff",
            outline: "none",
          }}
        >
        <table
          ref={tableRef}
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
                  width={
                    columnWidths[column.key] ??
                    column.width
                  }
                  selected={
                    selectedColumnRange
                      ? columnIndex >= selectedColumnRange.startColumn &&
                        columnIndex <= selectedColumnRange.endColumn
                      : selectedCell?.columnKey === column.key
                  }
                  draggable
                  dragging={draggedColumnKey === column.key}
                  onSelect={(event) => {
                    selectColumn(
                      columnIndex,
                      event.shiftKey,
                    );
                  }}
                  onContextMenu={(event) => {
                    openColumnMenu(
                      event,
                      columnIndex,
                    );
                  }}
                  onDragStart={() => setDraggedColumnKey(column.key)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void handleColumnDrop(column.key)}
                  onDragEnd={() => setDraggedColumnKey(null)}
                  onResizeStart={(event) =>
                    startColumnResize(
                      event,
                      column,
                    )
                  }
                  onAutoFit={(event) =>
                    autoFitColumn(
                      event,
                      column,
                    )
                  }
                  frozenLeft={
                    columnIndex < frozenColumnCount
                      ? frozenColumnOffsets[column.key]
                      : undefined
                  }
                  frozenEdge={
                    frozenColumnCount > 0 &&
                    columnIndex === frozenColumnCount - 1
                  }
                  removable={Boolean(column.optional)}
                  onRemove={() => removeOptionalColumn(column.key)}
                />
              ))}

              {sheet.sheet_type === null &&
              visibleColumns.length < GENERAL_BLANK_COLUMN_COUNT
                ? Array.from(
                    {
                      length:
                        GENERAL_BLANK_COLUMN_COUNT -
                        visibleColumns.length,
                    },
                    (_, offset) => {
                      const columnIndex =
                        visibleColumns.length + offset;

                      return (
                      <th
                        key={`general-blank-column-${columnIndex}`}
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 30,
                          width: GENERAL_BLANK_COLUMN_WIDTH,
                          minWidth: GENERAL_BLANK_COLUMN_WIDTH,
                          maxWidth: GENERAL_BLANK_COLUMN_WIDTH,
                          height: LETTER_ROW_HEIGHT,
                          padding: "0 4px",
                          boxSizing: "border-box",
                          background: "#f3f4f6",
                          borderRight: "1px solid #aeb6c2",
                          borderBottom: "1px solid #aeb6c2",
                          textAlign: "center",
                          fontSize: 10,
                          lineHeight: 1,
                          fontWeight: 600,
                          color: "#475467",
                          userSelect: "none",
                        }}
                      >
                        {columnLetter(columnIndex)}
                      </th>
                      );
                    },
                  )
                : null}
            </tr>

            {sheet.sheet_type !== null ? (
              <>
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
                  {visibleColumns.map((column, columnIndex) => (
                    <ColumnHeader
                      key={column.key}
                      width={
                        columnWidths[column.key] ??
                        column.width
                      }
                      tone={column.tone}
                      frozenLeft={
                        columnIndex < frozenColumnCount
                          ? frozenColumnOffsets[column.key]
                          : undefined
                      }
                      frozenEdge={
                        frozenColumnCount > 0 &&
                        columnIndex === frozenColumnCount - 1
                      }
                    >
                      {column.label}
                      {column.unit ? <HeaderUnit>{column.unit}</HeaderUnit> : null}
                    </ColumnHeader>
                  ))}
                </tr>
              </>
            ) : null}
          </thead>

          <tbody>
            {rows.length === 0 &&
            sheet.sheet_type === null &&
            visibleColumns.length === 0
              ? Array.from(
                  { length: GENERAL_BLANK_ROW_COUNT },
                  (_, rowIndex) => (
                    <tr
                      key={`general-blank-row-${rowIndex}`}
                      style={{
                        height: PRODUCT_ROW_HEIGHT,
                      }}
                    >
                      <RowNumberCell
                        height={PRODUCT_ROW_HEIGHT}
                        selected={false}
                        frozenEdge={false}
                      >
                        {rowIndex + 1}
                      </RowNumberCell>

                      {Array.from(
                        { length: GENERAL_BLANK_COLUMN_COUNT },
                        (_, columnIndex) => (
                          <td
                            key={`general-blank-cell-${rowIndex}-${columnIndex}`}
                            onClick={() => {
                              void materializeGeneralCell(
                                rowIndex,
                                columnIndex,
                              );
                            }}
                            title={`Select ${columnLetter(
                              columnIndex,
                            )}${rowIndex + 1}`}
                            style={{
                              width: GENERAL_BLANK_COLUMN_WIDTH,
                              minWidth: GENERAL_BLANK_COLUMN_WIDTH,
                              maxWidth: GENERAL_BLANK_COLUMN_WIDTH,
                              height: PRODUCT_ROW_HEIGHT,
                              padding: 0,
                              boxSizing: "border-box",
                              background: "#ffffff",
                              borderRight: "1px solid #e5e7eb",
                              borderBottom: "1px solid #e5e7eb",
                              cursor:
                                isRowOperation || isCreatingColumn
                                  ? "wait"
                                  : "cell",
                            }}
                          />
                        ),
                      )}
                    </tr>
                  ),
                )
              : rows.length === 0 ? (
                  <tr
                    style={{
                      height: PRODUCT_ROW_HEIGHT,
                    }}
                  >
                    <RowNumberCell
                      height={PRODUCT_ROW_HEIGHT}
                      selected={false}
                      frozenEdge={false}
                    >
                      <button
                        type="button"
                        disabled={isRowOperation}
                        onClick={() => {
                          void insertFirstRow();
                        }}
                        title="Add first row"
                        aria-label="Add first row"
                        style={{
                          width: "100%",
                          height: "100%",
                          padding: 0,
                          border: 0,
                          background: "transparent",
                          color: "#667085",
                          font: "inherit",
                          fontWeight: 700,
                          cursor: isRowOperation
                            ? "wait"
                            : "pointer",
                        }}
                      >
                        +
                      </button>
                    </RowNumberCell>

                    <td
                      colSpan={Math.max(
                        visibleColumns.length,
                        1,
                      )}
                      style={{
                        height: PRODUCT_ROW_HEIGHT,
                        padding: "0 10px",
                        borderRight: "1px solid #e5e7eb",
                        borderBottom: "1px solid #e5e7eb",
                        background: "#ffffff",
                        color: "#667085",
                        fontSize: 11,
                        textAlign: "left",
                      }}
                    >
                      <button
                        type="button"
                        disabled={isRowOperation}
                        onClick={() => {
                          void insertFirstRow();
                        }}
                        style={{
                          padding: 0,
                          border: 0,
                          background: "transparent",
                          color: "#667085",
                          font: "inherit",
                          cursor: isRowOperation
                            ? "wait"
                            : "pointer",
                        }}
                      >
                        {isRowOperation
                          ? "Adding row…"
                          : "Add first row"}
                      </button>
                    </td>
                  </tr>
                ) : null}

            {filteredRows.map((row, rowIndex) => (
              <tr
                key={row.id}
                style={{
                  display:
                    hiddenRowIdSet.has(row.id) ||
                    rowOutlineGroupHiddenIdSet.has(row.id)
                      ? "none"
                      : undefined,
                  height:
                    rowHeights[row.id] ??
                    PRODUCT_ROW_HEIGHT,
                }}
              >
                <RowNumberCell
                  height={
                    rowHeights[row.id] ??
                    PRODUCT_ROW_HEIGHT
                  }
                  frozenTop={
                    rowIndex < frozenRowCount
                      ? frozenRowOffsets[row.id]
                      : undefined
                  }
                  frozenEdge={
                    frozenRowCount > 0 &&
                    rowIndex === frozenRowCount - 1
                  }
                  selected={
                    selectedCell?.rowIndex ===
                      rowIndex ||
                    rowMenu?.rowId === row.id ||
                    Boolean(
                      selectedRowRange &&
                        rowIndex >= selectedRowRange.startRow &&
                        rowIndex <= selectedRowRange.endRow,
                    )
                  }
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {rowOutlineGroupAnchorMap.get(row.id) ? (
                      <button
                        type="button"
                        aria-label={
                          rowOutlineGroupAnchorMap.get(row.id)?.collapsed
                            ? `Expand grouped rows starting at row ${row.row_number}`
                            : `Collapse grouped rows starting at row ${row.row_number}`
                        }
                        title={
                          rowOutlineGroupAnchorMap.get(row.id)?.collapsed
                            ? "Expand row group"
                            : "Collapse row group"
                        }
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();

                          const group =
                            rowOutlineGroupAnchorMap.get(
                              row.id,
                            );

                          if (group) {
                            toggleRowOutlineGroup(
                              group.id,
                            );
                          }
                        }}
                        style={{
                          position: "absolute",
                          left: 1,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 12,
                          height: 12,
                          padding: 0,
                          border: "1px solid #98a2b3",
                          borderRadius: 2,
                          background: "#ffffff",
                          color: "#344054",
                          fontSize: 10,
                          lineHeight: "10px",
                          fontWeight: 800,
                          cursor: "pointer",
                          zIndex: 280,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {rowOutlineGroupAnchorMap.get(row.id)?.collapsed
                          ? "+"
                          : "−"}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      draggable
                      title={`Row ${row.row_number} — drag to reorder`}
                      aria-label={`Row ${row.row_number} actions and drag handle`}
                      onDragStart={(event) => {
                        beginRowDrag(
                          event,
                          row.id,
                        );
                      }}
                      onDragOver={(event) => {
                        updateRowDropTarget(
                          event,
                          row.id,
                        );
                      }}
                      onDrop={(event) => {
                        void dropDraggedRow(
                          event,
                          row.id,
                        );
                      }}
                      onDragEnd={endRowDrag}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        // Whole-row selection follows desktop spreadsheet behavior:
                        // click selects one row; Shift+click extends from the anchor.
                        setSelectedCell(null);
                        setRangeAnchor(null);
                        setRangeEnd(null);

                        window.dispatchEvent(
                          new CustomEvent("samzy:smart-sheet-selection", {
                            detail: null,
                          }),
                        );

                        if (event.shiftKey && rowSelectionAnchor !== null) {
                          setRowSelectionEnd(rowIndex);

                          // V2: keep the structural menu available for the
                          // completed row range so multi-row actions are one click away.
                          setRowMenu({
                            rowId: row.id,
                            rowIndex,
                            rowNumber: row.row_number,
                          });
                        } else {
                          setRowSelectionAnchor(rowIndex);
                          setRowSelectionEnd(rowIndex);

                          // Keep the existing single-row action menu available.
                          setRowMenu((current) =>
                            current?.rowId === row.id
                              ? null
                              : {
                                  rowId: row.id,
                                  rowIndex,
                                  rowNumber: row.row_number,
                                },
                          );
                        }

                        requestAnimationFrame(() => {
                          gridRef.current?.focus({ preventScroll: true });
                        });
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        padding:
                          rowOutlineGroupAnchorMap.has(row.id)
                            ? "0 0 0 12px"
                            : 0,
                        border: 0,
                        background: "transparent",
                        color: "inherit",
                        font: "inherit",
                        fontWeight: "inherit",
                        cursor:
                          draggedRowId === row.id
                            ? "grabbing"
                            : "grab",
                        opacity:
                          draggedRowId === row.id
                            ? 0.55
                            : 1,
                        boxShadow:
                          rowDropTarget?.rowId === row.id
                            ? rowDropTarget.placement === "before"
                              ? "inset 0 3px 0 #2e90fa"
                              : "inset 0 -3px 0 #2e90fa"
                            : undefined,
                      }}
                    >
                      {row.row_number}
                    </button>

                    <span
                      title="Drag to resize row height"
                      aria-hidden="true"
                      onMouseDown={(event) =>
                        startRowResize(
                          event,
                          row.id,
                        )
                      }
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: -4,
                        height: 8,
                        cursor: "row-resize",
                        zIndex: 260,
                      }}
                    />

                    {rowMenu?.rowId === row.id ? (
                      <div
                        role="menu"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        style={{
                          position: "absolute",
                          left: ROW_NUMBER_WIDTH - 2,
                          ...(rowIndex >= filteredRows.length - 4
                            ? {
                                /*
                                 * Bottom rows sit immediately above the
                                 * sticky totals/footer area. Lift the menu
                                 * one full product-row above the anchor so
                                 * all actions, including Delete row, remain
                                 * inside the scrollable grid viewport.
                                 */
                                bottom:
                                  (rowHeights[row.id] ??
                                    PRODUCT_ROW_HEIGHT) + 4,
                              }
                            : {
                                top: -2,
                              }),
                          zIndex: 250,
                          width: 182,
                          maxHeight:
                            "min(360px, calc(100vh - 390px))",
                          overflowY: "auto",
                          padding: 5,
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          boxShadow:
                            "0 8px 24px rgba(15,23,42,.16)",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            padding: "4px 7px 5px",
                            color: "#667085",
                            fontSize: 9,
                            fontWeight: 700,
                            borderBottom:
                              "1px solid #eef2f6",
                            marginBottom: 3,
                          }}
                        >
                          {selectedRowCount > 1 && selectedRowRange
                            ? `Rows ${
                                filteredRows[selectedRowRange.startRow]?.row_number ??
                                selectedRowRange.startRow + 1
                              }–${
                                filteredRows[selectedRowRange.endRow]?.row_number ??
                                selectedRowRange.endRow + 1
                              }`
                            : `Row ${row.row_number}`}
                        </div>

                        <button
                          type="button"
                          role="menuitem"
                          disabled={isRowOperation}
                          onClick={() => {
                            if (selectedRowCount > 1) {
                              void insertSelectedRows(
                                "above",
                              );
                            } else {
                              void insertRow(
                                "above",
                              );
                            }
                          }}
                          style={rowMenuButtonStyle}
                        >
                          {selectedRowCount > 1
                            ? `Insert ${selectedRowCount} rows above`
                            : "Insert row above"}
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          disabled={isRowOperation}
                          onClick={() => {
                            if (selectedRowCount > 1) {
                              void insertSelectedRows(
                                "below",
                              );
                            } else {
                              void insertRow(
                                "below",
                              );
                            }
                          }}
                          style={rowMenuButtonStyle}
                        >
                          {selectedRowCount > 1
                            ? `Insert ${selectedRowCount} rows below`
                            : "Insert row below"}
                        </button>

                        <div
                          style={{
                            height: 1,
                            background: "#eef2f6",
                            margin: "4px 0",
                          }}
                        />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={freezeRowsThroughSelection}
                          style={rowMenuButtonStyle}
                        >
                          {selectedRowRange?.endRow === 0
                            ? "Freeze first row"
                            : `Freeze through row ${
                                filteredRows[selectedRowRange?.endRow ?? rowIndex]?.row_number ??
                                (selectedRowRange?.endRow ?? rowIndex) + 1
                              }`}
                        </button>

                        {frozenRowCount > 0 ? (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={unfreezeAllRows}
                            style={rowMenuButtonStyle}
                          >
                            Unfreeze rows
                          </button>
                        ) : null}

                        <div
                          style={{
                            height: 1,
                            background: "#eef2f6",
                            margin: "4px 0",
                          }}
                        />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={resetSelectedRowHeights}
                          style={rowMenuButtonStyle}
                        >
                          {selectedRowCount > 1
                            ? `Reset ${selectedRowCount} row heights`
                            : "Reset row height"}
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={resetAllRowHeights}
                          style={rowMenuButtonStyle}
                        >
                          Reset all row heights
                        </button>

                        <div
                          style={{
                            height: 1,
                            background: "#eef2f6",
                            margin: "4px 0",
                          }}
                        />

                        <button
                          type="button"
                          role="menuitem"
                          disabled={
                            isRowOperation ||
                            selectedRowCount !== 1
                          }
                          onClick={() => {
                            void moveRow("up");
                          }}
                          style={rowMenuButtonStyle}
                        >
                          Move row up
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          disabled={
                            isRowOperation ||
                            selectedRowCount !== 1
                          }
                          onClick={() => {
                            void moveRow("down");
                          }}
                          style={rowMenuButtonStyle}
                        >
                          Move row down
                        </button>

                        <div
                          style={{
                            height: 1,
                            background: "#eef2f6",
                            margin: "4px 0",
                          }}
                        />

                        <button
                          type="button"
                          role="menuitem"
                          disabled={
                            isRowOperation ||
                            selectedRowCount === 0
                          }
                          onClick={hideSelectedRows}
                          style={rowMenuButtonStyle}
                        >
                          {selectedRowCount > 1
                            ? `Hide selected rows (${selectedRowCount})`
                            : "Hide row"}
                        </button>

                        {hiddenRowIds.length > 0 ? (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={showAllHiddenRows}
                            style={rowMenuButtonStyle}
                          >
                            {hiddenRowIds.length === 1
                              ? "Show hidden row"
                              : `Show all hidden rows (${hiddenRowIds.length})`}
                          </button>
                        ) : null}

                        <div
                          style={{
                            height: 1,
                            background: "#eef2f6",
                            margin: "4px 0",
                          }}
                        />

                        <button
                          type="button"
                          role="menuitem"
                          disabled={
                            isRowOperation ||
                            selectedRowCount < 2 ||
                            activeFilterCount > 0
                          }
                          title={
                            activeFilterCount > 0
                              ? "Clear active filters before grouping rows."
                              : selectedRowCount < 2
                                ? "Select at least two rows."
                                : undefined
                          }
                          onClick={groupSelectedRows}
                          style={rowMenuButtonStyle}
                        >
                          {selectedRowCount > 1
                            ? `Group selected rows (${selectedRowCount})`
                            : "Group rows"}
                        </button>

                        {selectionTouchesRowGroup ? (
                          <button
                            type="button"
                            role="menuitem"
                            disabled={isRowOperation}
                            onClick={ungroupSelectedRows}
                            style={rowMenuButtonStyle}
                          >
                            Ungroup selected rows
                          </button>
                        ) : null}

                        <div
                          style={{
                            height: 1,
                            background: "#eef2f6",
                            margin: "4px 0",
                          }}
                        />

                        <button
                          type="button"
                          role="menuitem"
                          disabled={isRowOperation}
                          onClick={() => {
                            if (selectedRowCount > 1) {
                              void deleteSelectedRows();
                            } else {
                              void deleteRow();
                            }
                          }}
                          style={{
                            ...rowMenuButtonStyle,
                            color: "#b42318",
                          }}
                        >
                          {selectedRowCount > 1
                            ? `Delete selected rows (${selectedRowCount})`
                            : "Delete row"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </RowNumberCell>

                {visibleColumns.map((column, columnIndex) => (
                  <SelectableGridCell
                    key={column.key}
                    row={row}
                    rowIndex={rowIndex}
                    columnKey={column.key}
                    columnIndex={columnIndex}
                    width={
                      columnWidths[column.key] ??
                      column.width
                    }
                    height={
                      rowHeights[row.id] ??
                      PRODUCT_ROW_HEIGHT
                    }
                    frozenLeft={
                      columnIndex < frozenColumnCount
                        ? frozenColumnOffsets[column.key]
                        : undefined
                    }
                    frozenEdge={
                      frozenColumnCount > 0 &&
                      columnIndex === frozenColumnCount - 1
                    }
                    frozenTop={
                      rowIndex < frozenRowCount
                        ? frozenRowOffsets[row.id]
                        : undefined
                    }
                    frozenRowEdge={
                      frozenRowCount > 0 &&
                      rowIndex === frozenRowCount - 1
                    }
                    tone={column.tone}
                    align={column.align ?? (column.type === "text" ? "left" : "right")}
                    calculated={Boolean(column.calculated)}
                    rawValue={
                      formulaDisplayValue(
                        row,
                        column.key,
                      ) ??
                      getSpreadsheetValue(
                        row,
                        column.key,
                      )
                    }
                    displayOverride={
                      formulaDisplayValue(
                        row,
                        column.key,
                      )
                    }
                    cellType={column.type}
                    cellFormat={effectiveCellFormat(row.id, column.key)}
                    conditionalFormat={column.conditionalFormat}
                    findMatch={
                      findQuery.trim() !== "" &&
                      findMatches.some(
                        (match) =>
                          match.rowId === row.id &&
                          match.columnKey === column.key,
                      )
                    }
                    activeFindMatch={
                      activeFindMatch?.rowId === row.id &&
                      activeFindMatch?.columnKey === column.key
                    }
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
                    rowSelected={
                      selectedRowRange
                        ? rowIndex >= selectedRowRange.startRow &&
                          rowIndex <= selectedRowRange.endRow
                        : false
                    }
                    columnSelected={
                      selectedColumnRange
                        ? columnIndex >= selectedColumnRange.startColumn &&
                          columnIndex <= selectedColumnRange.endColumn
                        : false
                    }
                    inFillPreview={
                      fillPreviewRange
                        ? rowIndex >= fillPreviewRange.startRow &&
                          rowIndex <= fillPreviewRange.endRow &&
                          columnIndex >= fillPreviewRange.startColumn &&
                          columnIndex <= fillPreviewRange.endColumn
                        : false
                    }
                    showFillHandle={
                      fillSourceRange
                        ? rowIndex === fillSourceRange.endRow &&
                          columnIndex === fillSourceRange.endColumn
                        : false
                    }
                    filling={isFilling}
                    onFillStart={startFillDrag}
                    onFillDragEnter={(nextRowIndex, nextColumnIndex) => {
                      if (!isFilling) {
                        return;
                      }

                      setFillTarget({
                        rowIndex: nextRowIndex,
                        columnIndex: nextColumnIndex,
                      });
                    }}
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
                      if (isFilling || !isRangeDraggingRef.current) {
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
                      overlay:
                        spreadsheetCellOverlayMap.get(
                          `${row.id}:${column.key}`,
                        ),
                    })}
                  </SelectableGridCell>
                ))}

                {sheet.sheet_type === null &&
                visibleColumns.length < GENERAL_BLANK_COLUMN_COUNT
                  ? Array.from(
                      {
                        length:
                          GENERAL_BLANK_COLUMN_COUNT -
                          visibleColumns.length,
                      },
                      (_, offset) => {
                        const columnIndex =
                          visibleColumns.length + offset;

                        return (
                          <td
                            key={`general-continuation-cell-${row.id}-${columnIndex}`}
                            onClick={() => {
                              void materializeGeneralCell(
                                rowIndex,
                                columnIndex,
                              );
                            }}
                            title={`Select ${columnLetter(
                              columnIndex,
                            )}${rowIndex + 1}`}
                            style={{
                              width: GENERAL_BLANK_COLUMN_WIDTH,
                              minWidth: GENERAL_BLANK_COLUMN_WIDTH,
                              maxWidth: GENERAL_BLANK_COLUMN_WIDTH,
                              height:
                                rowHeights[row.id] ??
                                PRODUCT_ROW_HEIGHT,
                              padding: 0,
                              boxSizing: "border-box",
                              background: "#ffffff",
                              borderRight: "1px solid #e5e7eb",
                              borderBottom: "1px solid #e5e7eb",
                              cursor:
                                isRowOperation || isCreatingColumn
                                  ? "wait"
                                  : "cell",
                            }}
                          />
                        );
                      },
                    )
                  : null}
              </tr>
            ))}

            {sheet.sheet_type === null &&
            rows.length > 0 &&
            filteredRows.length < GENERAL_BLANK_ROW_COUNT
              ? Array.from(
                  {
                    length:
                      GENERAL_BLANK_ROW_COUNT -
                      filteredRows.length,
                  },
                  (_, offset) => {
                    const rowIndex =
                      filteredRows.length + offset;

                    return (
                      <tr
                        key={`general-continuation-row-${rowIndex}`}
                        style={{
                          height: PRODUCT_ROW_HEIGHT,
                        }}
                      >
                        <RowNumberCell
                          height={PRODUCT_ROW_HEIGHT}
                          selected={false}
                          frozenEdge={false}
                        >
                          {rowIndex + 1}
                        </RowNumberCell>

                        {Array.from(
                          {
                            length: GENERAL_BLANK_COLUMN_COUNT,
                          },
                          (_, columnIndex) => {
                            const width =
                              columnIndex < visibleColumns.length
                                ? columnWidths[
                                    visibleColumns[columnIndex].key
                                  ] ??
                                  visibleColumns[columnIndex].width
                                : GENERAL_BLANK_COLUMN_WIDTH;

                            return (
                              <td
                                key={`general-continuation-row-cell-${rowIndex}-${columnIndex}`}
                                onClick={() => {
                                  void materializeGeneralCell(
                                    rowIndex,
                                    columnIndex,
                                  );
                                }}
                                title={`Select ${columnLetter(
                                  columnIndex,
                                )}${rowIndex + 1}`}
                                style={{
                                  width,
                                  minWidth: width,
                                  maxWidth: width,
                                  height: PRODUCT_ROW_HEIGHT,
                                  padding: 0,
                                  boxSizing: "border-box",
                                  background: "#ffffff",
                                  borderRight: "1px solid #e5e7eb",
                                  borderBottom: "1px solid #e5e7eb",
                                  cursor:
                                    isRowOperation || isCreatingColumn
                                      ? "wait"
                                      : "cell",
                                }}
                              />
                            );
                          },
                        )}
                      </tr>
                    );
                  },
                )
              : null}
          </tbody>

          {sheet.sheet_type !== null ? (
            <tfoot>
              <tr>
                <RowNumberFooter>
                  {activeFilterCount > 0
                    ? `${filteredRows.length}/${rows.length}`
                    : rows.length}
                </RowNumberFooter>

                {visibleColumns.map((column) => (
                  <FooterCell key={column.key} tone={column.tone}>
                    {footerForColumn(column, totals, rows.length)}
                  </FooterCell>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
        </div>

        <div
          aria-hidden="true"
          style={{
            flex: "0 0 10px",
            width: 10,
            height: "100%",
            background: "#ffffff",
            borderLeft: "2px solid #475467",
            borderRight: "1px solid #d0d5dd",
            boxSizing: "border-box",
          }}
        />

        <div
          ref={verticalScrollRef}
          className="samzy-smart-sheet-vertical-rail"
          onScroll={syncVerticalFromRail}
          aria-label="Smart Sheet vertical scrollbar"
          style={{
            flex: "0 0 16px",
            width: 16,
            height: "100%",
            overflowX: "hidden",
            overflowY: "scroll",
            background: "#f8fafc",
            boxSizing: "border-box",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 1,
              height:
                Math.max(
                  gridContentHeight,
                  1,
                ),
            }}
          />
        </div>
      </div>
    </div>
  );
}

function renderCell({
  sheet,
  row,
  column,
  state,
  overlay,
}: {
  sheet: SmartSheet;
  row: SmartSheetRow;
  column: ColumnDefinition;
  state?: SmartSheetCellState;
  overlay?: SmartSheetCellOverlay;
}) {
  const businessValue = getRowValue(row, column.key);

  const overlayValue: string | number | null =
    !overlay || overlay.is_blank
      ? null
      : typeof overlay.value === "string" ||
          typeof overlay.value === "number"
        ? overlay.value
        : overlay.value === null || overlay.value === undefined
          ? null
          : String(overlay.value);

  const value = overlay ? overlayValue : businessValue;

  if (column.validation?.type === "list") {
    return (
      <ListValidationSpreadsheetCell
        sheetId={sheet.id}
        rowId={row.id}
        columnKey={column.key}
        value={value}
        values={column.validation.values}
        editable={column.editable ?? true}
      />
    );
  }

  /*
   * Native Date / DateTime / Time V1.
   *
   * Temporal custom columns use the browser's native spreadsheet-friendly
   * editors while keeping the stored value as a portable ISO-like string.
   * Existing incompatible values are preserved rather than destructively
   * converted when a column's presentation type changes.
   */
  if (
    column.type === "date" ||
    column.type === "datetime" ||
    column.type === "time"
  ) {
    return (
      <TemporalSpreadsheetCell
        sheetId={sheet.id}
        rowId={row.id}
        columnKey={column.key}
        value={value}
        type={column.type}
        editable={column.editable ?? true}
      />
    );
  }

  /*
   * Native Boolean / Checkbox V1.
   *
   * A boolean custom column behaves like an Excel checkbox-backed cell:
   * the visible cell is a checkbox, while the persisted spreadsheet value
   * remains a simple 1/0 scalar so formulas can consume it numerically.
   */
  if (column.type === "boolean") {
    return (
      <BooleanSpreadsheetCell
        sheetId={sheet.id}
        rowId={row.id}
        columnKey={column.key}
        value={value}
        editable={column.editable ?? true}
      />
    );
  }

  /*
   * Overlay cells are presentation-layer spreadsheet content. They are now
   * directly editable, but updateSmartSheetCell() detects the overlay and
   * writes the edit back to smart_sheet_cells ONLY.
   *
   * We intentionally pass state={undefined} so the semantic business cell
   * underneath cannot impose SAME/calculated behavior on the moved visual cell.
   */
  if (overlay) {
    return (
      <SmartSheetCell
        sheetId={sheet.id}
        rowId={row.id}
        columnKey={column.key}
        value={value}
        state={undefined}
        type={column.type}
        align={
          column.align === "left"
            ? "left"
            : column.align === "right"
              ? "right"
              : undefined
        }
        editable={true}
        allowSame={false}
      />
    );
  }

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

function temporalInputValue(
  value: string | number | null,
  type: "date" | "datetime" | "time",
) {
  if (value === null || value === undefined) {
    return "";
  }

  const raw = String(value).trim();

  if (type === "date") {
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1] ?? "";
  }

  if (type === "datetime") {
    const match = raw.match(
      /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/,
    );
    return match ? `${match[1]}T${match[2]}` : "";
  }

  const match = raw.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);

  if (!match) {
    return "";
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return "";
  }

  return `${match[1]}:${match[2]}:${String(seconds).padStart(2, "0")}`;
}

function TemporalSpreadsheetCell({
  sheetId,
  rowId,
  columnKey,
  value,
  type,
  editable,
}: {
  sheetId: string;
  rowId: string;
  columnKey: string;
  value: string | number | null;
  type: "date" | "datetime" | "time";
  editable: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const nativeValue = temporalInputValue(value, type);
  const hasIncompatibleStoredValue =
    value !== null &&
    value !== undefined &&
    String(value).trim() !== "" &&
    nativeValue === "";

  function save(nextValue: string) {
    if (!editable || isPending) {
      return;
    }

    startTransition(async () => {
      const result = await updateSmartSheetCell({
        sheetId,
        rowId,
        columnKey,
        value: nextValue,
      });

      if (!result.ok) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent("samzy:smart-sheet-value-saved", {
          detail: {
            rowId,
            columnKey,
            displayValue: nextValue,
            editValue: nextValue,
          },
        }),
      );

      window.dispatchEvent(
        new CustomEvent("samzy:smart-sheet-edit-committed", {
          detail: {
            rowId,
            columnKey,
            moveDown: false,
          },
        }),
      );
    });
  }

  if (hasIncompatibleStoredValue) {
    return (
      <span
        title="Existing value preserved. Choose a native date/time value to replace it."
        style={{
          display: "block",
          width: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textAlign: "left",
        }}
      >
        {String(value)}
      </span>
    );
  }

  if (type === "time") {
    return (
      <TimeSpreadsheetCell
        value={nativeValue}
        editable={editable}
        isPending={isPending}
        onSave={save}
      />
    );
  }

  return (
    <input
      type={type === "datetime" ? "datetime-local" : type}
      value={nativeValue}
      disabled={!editable || isPending}
      onChange={(event) => save(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      aria-label={type === "date" ? "Date" : "Date and time"}
      style={{
        width: "100%",
        minWidth: 0,
        height: 20,
        boxSizing: "border-box",
        border: "none",
        outline: "none",
        padding: "0 2px",
        margin: 0,
        background: "transparent",
        color: "inherit",
        font: "inherit",
        textAlign: "left",
        cursor: editable ? "pointer" : "default",
        opacity: isPending ? 0.6 : 1,
      }}
    />
  );
}

type TimePickerPart = "hours" | "minutes" | "seconds";

function timeParts(value: string) {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2})$/);

  if (!match) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
    seconds: Number(match[3]),
  };
}

function formatTimeParts(hours: number, minutes: number, seconds: number) {
  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

function adjustTimeBySeconds(value: string, delta: -1 | 1) {
  const { hours, minutes, seconds } = timeParts(value || "00:00:00");
  const total = hours * 3600 + minutes * 60 + seconds;
  const wrapped = (total + delta + 86400) % 86400;

  return formatTimeParts(
    Math.floor(wrapped / 3600),
    Math.floor((wrapped % 3600) / 60),
    wrapped % 60,
  );
}

function TimeSpreadsheetCell({
  value,
  editable,
  isPending,
  onSave,
}: {
  value: string;
  editable: boolean;
  isPending: boolean;
  onSave: (nextValue: string) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [part, setPart] = useState<TimePickerPart>("hours");
  const [draft, setDraft] = useState(value || "00:00:00");
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!open) {
      setDraft(value || "00:00:00");
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const trigger = triggerRef.current;

    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      const popoverWidth = 292;
      const popoverHeight = 392;
      const margin = 8;

      setPosition({
        left: Math.max(
          margin,
          Math.min(rect.left, window.innerWidth - popoverWidth - margin),
        ),
        top:
          rect.bottom + margin + popoverHeight <= window.innerHeight
            ? rect.bottom + margin
            : Math.max(margin, rect.top - popoverHeight - margin),
      });
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function commit(nextValue: string) {
    setDraft(nextValue);
    onSave(nextValue);
  }

  function spin(delta: -1 | 1) {
    if (!editable || isPending) {
      return;
    }

    commit(adjustTimeBySeconds(value || draft || "00:00:00", delta));
  }

  function chooseClockValue(next: number) {
    const current = timeParts(draft);

    const nextDraft =
      part === "hours"
        ? formatTimeParts(next, current.minutes, current.seconds)
        : part === "minutes"
          ? formatTimeParts(current.hours, next, current.seconds)
          : formatTimeParts(current.hours, current.minutes, next);

    setDraft(nextDraft);

    if (part === "hours") {
      setPart("minutes");
    } else if (part === "minutes") {
      setPart("seconds");
    }
  }

  const selected = timeParts(draft);
  const clockValues =
    part === "hours"
      ? Array.from({ length: 24 }, (_, index) => index)
      : Array.from({ length: 12 }, (_, index) => index * 5);

  const selectedClockValue =
    part === "hours"
      ? selected.hours
      : part === "minutes"
        ? selected.minutes
        : selected.seconds;

  return (
    <>
      <div
        style={{
          width: "100%",
          minWidth: 0,
          height: 20,
          display: "flex",
          alignItems: "stretch",
          gap: 1,
          opacity: isPending ? 0.6 : 1,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={triggerRef}
          type="button"
          disabled={!editable || isPending}
          onClick={() => {
            setDraft(value || "00:00:00");
            setPart("hours");
            setOpen((current) => !current);
          }}
          aria-label="Open time picker"
          title="Open time picker"
          style={{
            minWidth: 0,
            flex: "1 1 auto",
            border: "none",
            padding: "0 2px",
            margin: 0,
            background: "transparent",
            color: value ? "inherit" : "#98a2b3",
            font: "inherit",
            textAlign: "left",
            cursor: editable ? "pointer" : "default",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {value || "--:--:--"}{" "}
          <span aria-hidden="true" style={{ fontSize: 11 }}>
            ◷
          </span>
        </button>

        <span
          style={{
            flex: "0 0 14px",
            display: "flex",
            flexDirection: "column",
            height: 20,
          }}
        >
          <button
            type="button"
            aria-label="Increase time by one second"
            title="Increase by 1 second"
            disabled={!editable || isPending}
            onClick={() => spin(1)}
            style={timeSpinnerButtonStyle}
          >
            ▲
          </button>

          <button
            type="button"
            aria-label="Decrease time by one second"
            title="Decrease by 1 second"
            disabled={!editable || isPending}
            onClick={() => spin(-1)}
            style={timeSpinnerButtonStyle}
          >
            ▼
          </button>
        </span>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Time picker"
              onClick={(event) => event.stopPropagation()}
              style={{
                position: "fixed",
                left: position.left,
                top: position.top,
                zIndex: 4000,
                width: 292,
                boxSizing: "border-box",
                border: "1px solid #d0d5dd",
                borderRadius: 12,
                background: "#ffffff",
                boxShadow: "0 14px 36px rgba(16,24,40,.18)",
                padding: 14,
                color: "#101828",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <strong
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Set time
                </strong>

                <button
                  type="button"
                  aria-label="Close time picker"
                  onClick={() => setOpen(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#667085",
                    fontSize: 16,
                    cursor: "pointer",
                    padding: 2,
                  }}
                >
                  ×
                </button>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {(["hours", "minutes", "seconds"] as TimePickerPart[]).map(
                  (item, index) => {
                    const itemValue =
                      item === "hours"
                        ? selected.hours
                        : item === "minutes"
                          ? selected.minutes
                          : selected.seconds;

                    return (
                      <span
                        key={item}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setPart(item)}
                          aria-label={`Edit ${item}`}
                          style={{
                            minWidth: 54,
                            height: 42,
                            border:
                              part === item
                                ? "1px solid #84adff"
                                : "1px solid #eaecf0",
                            borderRadius: 8,
                            background:
                              part === item ? "#eff4ff" : "#f9fafb",
                            color: "#101828",
                            fontSize: 22,
                            fontWeight: 650,
                            fontVariantNumeric: "tabular-nums",
                            cursor: "pointer",
                          }}
                        >
                          {String(itemValue).padStart(2, "0")}
                        </button>

                        {index < 2 ? (
                          <span
                            aria-hidden="true"
                            style={{
                              color: "#667085",
                              fontSize: 20,
                              fontWeight: 700,
                            }}
                          >
                            :
                          </span>
                        ) : null}
                      </span>
                    );
                  },
                )}
              </div>

              <div
                style={{
                  margin: "14px auto 0",
                  width: 222,
                  height: 222,
                  position: "relative",
                  borderRadius: "50%",
                  background: "#f2f4f7",
                  border: "1px solid #eaecf0",
                }}
              >
                {clockValues.map((clockValue, index) => {
                  const angle =
                    (index / clockValues.length) * Math.PI * 2 - Math.PI / 2;
                  const radius = part === "hours" && clockValue >= 12 ? 68 : 88;
                  const x = 111 + Math.cos(angle) * radius;
                  const y = 111 + Math.sin(angle) * radius;
                  const active = selectedClockValue === clockValue;

                  return (
                    <button
                      key={clockValue}
                      type="button"
                      onClick={() => chooseClockValue(clockValue)}
                      aria-label={`${clockValue} ${part}`}
                      style={{
                        position: "absolute",
                        left: x,
                        top: y,
                        transform: "translate(-50%, -50%)",
                        width: part === "hours" && clockValue >= 12 ? 28 : 32,
                        height: part === "hours" && clockValue >= 12 ? 28 : 32,
                        padding: 0,
                        border: active ? "1px solid #2e64e8" : "1px solid transparent",
                        borderRadius: "50%",
                        background: active ? "#2e64e8" : "transparent",
                        color: active ? "#ffffff" : "#344054",
                        fontSize: part === "hours" && clockValue >= 12 ? 10 : 11,
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {String(clockValue).padStart(2, "0")}
                    </button>
                  );
                })}

                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 5,
                    height: 5,
                    transform: "translate(-50%, -50%)",
                    borderRadius: "50%",
                    background: "#667085",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setDraft("00:00:00");
                    setPart("hours");
                  }}
                  style={timePickerSecondaryButtonStyle}
                >
                  Reset
                </button>

                <span style={{ flex: "1 1 auto" }} />

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={timePickerSecondaryButtonStyle}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!editable || isPending}
                  onClick={() => {
                    commit(draft);
                    setOpen(false);
                  }}
                  style={timePickerPrimaryButtonStyle}
                >
                  OK
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

const timeSpinnerButtonStyle: React.CSSProperties = {
  width: 14,
  height: 10,
  minHeight: 0,
  border: "none",
  margin: 0,
  padding: 0,
  background: "transparent",
  color: "#667085",
  fontSize: 7,
  lineHeight: "9px",
  cursor: "pointer",
};

const timePickerSecondaryButtonStyle: React.CSSProperties = {
  height: 30,
  padding: "0 10px",
  border: "1px solid #d0d5dd",
  borderRadius: 6,
  background: "#ffffff",
  color: "#344054",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const timePickerPrimaryButtonStyle: React.CSSProperties = {
  height: 30,
  padding: "0 12px",
  border: "1px solid #2e64e8",
  borderRadius: 6,
  background: "#2e64e8",
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

function ListValidationSpreadsheetCell({
  sheetId,
  rowId,
  columnKey,
  value,
  values,
  editable,
}: {
  sheetId: string;
  rowId: string;
  columnKey: string;
  value: string | number | null;
  values: string[];
  editable: boolean;
}) {
  const [isPending, startTransition] =
    useTransition();
  const currentValue =
    value === null || value === undefined
      ? ""
      : String(value);
  const [draft, setDraft] =
    useState(currentValue);

  useEffect(() => {
    setDraft(currentValue);
  }, [currentValue]);

  const options =
    currentValue && !values.includes(currentValue)
      ? [currentValue, ...values]
      : values;

  function save(nextValue: string) {
    if (!editable || isPending) {
      return;
    }

    setDraft(nextValue);

    startTransition(async () => {
      const result =
        await updateSmartSheetCell({
          sheetId,
          rowId,
          columnKey,
          value: nextValue,
        });

      if (!result.ok) {
        setDraft(currentValue);
        return;
      }

      window.dispatchEvent(
        new CustomEvent(
          "samzy:smart-sheet-value-saved",
          {
            detail: {
              rowId,
              columnKey,
              displayValue: nextValue,
              editValue: nextValue,
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
              moveDown: false,
            },
          },
        ),
      );
    });
  }

  return (
    <select
      aria-label="Validated dropdown cell"
      value={draft}
      disabled={!editable || isPending}
      onMouseDown={(event) => {
        // Keep the spreadsheet cell's range-selection handler from calling
        // preventDefault(), otherwise the native select never opens.
        event.stopPropagation();
      }}
      onClick={(event) =>
        event.stopPropagation()
      }
      onChange={(event) =>
        save(event.target.value)
      }
      style={{
        width: "100%",
        minWidth: 0,
        height: 20,
        boxSizing: "border-box",
        border: "none",
        outline: "none",
        padding: "0 18px 0 2px",
        margin: 0,
        background: "transparent",
        color: draft ? "inherit" : "#98a2b3",
        font: "inherit",
        textAlign: "left",
        cursor: editable ? "pointer" : "default",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      <option value="">-- Select --</option>
      {options.map((option) => (
        <option
          key={option}
          value={option}
        >
          {option}
        </option>
      ))}
    </select>
  );
}

function BooleanSpreadsheetCell({
  sheetId,
  rowId,
  columnKey,
  value,
  editable,
}: {
  sheetId: string;
  rowId: string;
  columnKey: string;
  value: string | number | null;
  editable: boolean;
}) {
  const [
    isPending,
    startTransition,
  ] = useTransition();

  const checked =
    booleanCellValue(value);

  function toggle() {
    if (
      !editable ||
      isPending
    ) {
      return;
    }

    const nextValue =
      checked ? 0 : 1;

    startTransition(
      async () => {
        const result =
          await updateSmartSheetCell({
            sheetId,
            rowId,
            columnKey,
            value: nextValue,
          });

        if (!result.ok) {
          return;
        }

        window.dispatchEvent(
          new CustomEvent(
            "samzy:smart-sheet-value-saved",
            {
              detail: {
                rowId,
                columnKey,
                displayValue:
                  nextValue === 1
                    ? "TRUE"
                    : "FALSE",
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
                moveDown: false,
              },
            },
          ),
        );
      },
    );
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={
        checked
          ? "Checked"
          : "Unchecked"
      }
      disabled={
        !editable ||
        isPending
      }
      onClick={toggle}
      style={{
        width: "100%",
        minHeight: "18px",
        border: "none",
        margin: 0,
        padding: 0,
        background: "transparent",
        cursor:
          editable
            ? "pointer"
            : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        font: "inherit",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 14,
          height: 14,
          boxSizing:
            "border-box",
          border:
            checked
              ? "1px solid #2563eb"
              : "1px solid #98a2b3",
          borderRadius: 3,
          background:
            checked
              ? "#2563eb"
              : "#ffffff",
          color: "#ffffff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          lineHeight: 1,
          fontWeight: 700,
          opacity:
            isPending
              ? 0.6
              : 1,
        }}
      >
        {checked ? "✓" : ""}
      </span>
    </button>
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

type FillDragEnterHandler = (
  rowIndex: number,
  columnIndex: number,
) => void;

function SelectableGridCell({
  children,
  row,
  rowIndex,
  columnKey,
  columnIndex,
  width,
  height,
  frozenLeft,
  frozenEdge,
  frozenTop,
  frozenRowEdge,
  tone = "basic",
  align = "right",
  calculated = false,
  rawValue,
  displayOverride,
  cellType,
  cellFormat,
  conditionalFormat,
  findMatch = false,
  activeFindMatch = false,
  selected = false,
  inRange = false,
  rowSelected = false,
  columnSelected = false,
  inFillPreview = false,
  showFillHandle = false,
  filling = false,
  onFillStart,
  onFillDragEnter,
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
  height: number;
  frozenLeft?: number;
  frozenEdge: boolean;
  frozenTop?: number;
  frozenRowEdge: boolean;
  tone?: Tone;
  align?: Align;
  calculated?: boolean;
  rawValue: unknown;
  displayOverride?: FormulaDisplayValue;
  cellType: CellType;
  cellFormat?: CellFormat;
  conditionalFormat?: ConditionalFormatRule;
  findMatch?: boolean;
  activeFindMatch?: boolean;
  selected?: boolean;
  inRange?: boolean;
  rowSelected?: boolean;
  columnSelected?: boolean;
  inFillPreview?: boolean;
  showFillHandle?: boolean;
  filling?: boolean;
  onFillStart: () => void;
  onFillDragEnter: FillDragEnterHandler;
  onSelect: SelectHandler;
  onRangeDragStart: RangeDragStartHandler;
  onRangeDragEnter: RangeDragEnterHandler;
}) {
  const [isFormulaCellEditing, setIsFormulaCellEditing] =
    useState(false);

  useEffect(() => {
    if (displayOverride === undefined) {
      setIsFormulaCellEditing(false);
      return;
    }

    function handleFormulaEditRequest(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          rowId?: string;
          columnKey?: string;
        }>;

      if (
        customEvent.detail?.rowId === row.id &&
        customEvent.detail?.columnKey === columnKey
      ) {
        setIsFormulaCellEditing(true);
      }
    }

    function handleFormulaEditCommitted(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          rowId?: string;
          columnKey?: string;
        }>;

      if (
        customEvent.detail?.rowId === row.id &&
        customEvent.detail?.columnKey === columnKey
      ) {
        setIsFormulaCellEditing(false);
      }
    }

    window.addEventListener(
      "samzy:smart-sheet-edit",
      handleFormulaEditRequest as EventListener,
    );

    window.addEventListener(
      "samzy:smart-sheet-edit-committed",
      handleFormulaEditCommitted as EventListener,
    );

    return () => {
      window.removeEventListener(
        "samzy:smart-sheet-edit",
        handleFormulaEditRequest as EventListener,
      );

      window.removeEventListener(
        "samzy:smart-sheet-edit-committed",
        handleFormulaEditCommitted as EventListener,
      );
    };
  }, [
    columnKey,
    displayOverride,
    row.id,
  ]);

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
    if (filling) {
      onFillDragEnter(rowIndex, columnIndex);
      return;
    }

    onRangeDragEnter(
      row,
      rowIndex,
      columnKey,
      columnIndex,
    );
  }

  function formattedNumericDisplay() {
    const format = cellFormat?.numberFormat;
    if (!format || format === "general") return null;
    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) return null;

    const decimals = Math.max(0, Math.min(6, cellFormat?.decimalPlaces ?? 2));
    if (format === "number") {
      return rawValue.toLocaleString("en-IE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    if (format === "currency") {
      return rawValue.toLocaleString("en-IE", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    if (format === "percentage") {
      // Smart Sheet percentage columns store percentage points (e.g. 23 = 23%).
      // For those columns display the stored point value; for ordinary numeric cells,
      // spreadsheet-style percentage formatting treats 0.23 as 23%.
      const percentValue = cellType === "percent" ? rawValue : rawValue * 100;
      return `${percentValue.toLocaleString("en-IE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}%`;
    }
    return null;
  }

  const numberDisplay = formattedNumericDisplay();

  const selectionColor = "#f04400";
  const selectionRgb = "240,68,0";

  const conditionalValue =
    displayOverride !== undefined
      ? displayOverride
      : rawValue;
  const conditionalMatched =
    conditionalFormatMatches(
      conditionalFormat,
      conditionalValue,
    );
  const effectiveFillColor =
    conditionalMatched
      ? conditionalFormat?.fillColor
      : cellFormat?.fillColor;
  const effectiveTextColor =
    conditionalMatched
      ? conditionalFormat?.textColor
      : cellFormat?.textColor;

  return (
    <td
      data-sheet-cell={`${row.id}:${columnKey}`}
      data-format-bold={cellFormat?.bold ? "true" : undefined}
      data-format-italic={cellFormat?.italic ? "true" : undefined}
      data-format-underline={cellFormat?.underline ? "true" : undefined}
      data-format-alignment={cellFormat?.alignment ?? undefined}
      data-format-font-size={cellFormat?.fontSize ?? undefined}
      data-format-fill-color={cellFormat?.fillColor ?? undefined}
      data-format-text-color={cellFormat?.textColor ? "true" : undefined}
      data-format-border-top={cellFormat?.borderTop ? "true" : undefined}
      data-format-border-right={cellFormat?.borderRight ? "true" : undefined}
      data-format-border-bottom={cellFormat?.borderBottom ? "true" : undefined}
      data-format-border-left={cellFormat?.borderLeft ? "true" : undefined}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      style={{
        position:
          frozenLeft !== undefined ||
          frozenTop !== undefined
            ? "sticky"
            : "relative",
        top: frozenTop,
        left: frozenLeft,
        width,
        minWidth: width,
        maxWidth: width,
        height,
        padding: "1px 4px",
        boxSizing: "border-box",
        borderTop: cellFormat?.borderTop
          ? "2px solid #344054"
          : undefined,
        borderLeft: cellFormat?.borderLeft
          ? "2px solid #344054"
          : undefined,
        borderRight: frozenEdge
          ? "2px solid #667085"
          : cellFormat?.borderRight
            ? "2px solid #344054"
            : "1px solid #aeb6c2",
        borderBottom: frozenRowEdge
          ? "2px solid #667085"
          : cellFormat?.borderBottom
            ? "2px solid #344054"
            : "1px solid #aeb6c2",
        background: inFillPreview
          ? `linear-gradient(rgba(${selectionRgb},.13), rgba(${selectionRgb},.13)), ${effectiveFillColor ?? toneBackground(tone, false)}`
          : inRange
            ? `linear-gradient(rgba(${selectionRgb},.10), rgba(${selectionRgb},.10)), ${effectiveFillColor ?? toneBackground(tone, false)}`
            : rowSelected
              ? `linear-gradient(rgba(${selectionRgb},.10), rgba(${selectionRgb},.10)), ${effectiveFillColor ?? toneBackground(tone, false)}`
              : columnSelected
                ? `linear-gradient(rgba(${selectionRgb},.10), rgba(${selectionRgb},.10)), ${effectiveFillColor ?? toneBackground(tone, false)}`
                : effectiveFillColor ?? toneBackground(tone, false),
        verticalAlign: "middle",
        textAlign: cellFormat?.alignment ?? align,
        fontSize: cellFormat?.fontSize ?? undefined,
        color: effectiveTextColor ?? (calculated ? "#334155" : "#111827"),
        ...(
          effectiveTextColor
            ? ({
                "--samzy-cell-text-color":
                  effectiveTextColor,
              } as Record<string, string>)
            : {}
        ),
        fontWeight: cellFormat?.bold ? 700 : undefined,
        fontStyle: cellFormat?.italic ? "italic" : undefined,
        textDecoration: cellFormat?.underline ? "underline" : undefined,
        overflow: "hidden",
        boxShadow: calculated
          ? "inset 0 0 0 999px rgba(248,250,252,.20)"
          : "none",
        zIndex:
          frozenLeft !== undefined &&
          frozenTop !== undefined
            ? selected
              ? 38
              : inRange || inFillPreview || rowSelected || columnSelected
                ? 36
                : 34
            : frozenTop !== undefined
              ? selected
                ? 28
                : inRange || inFillPreview || rowSelected || columnSelected
                  ? 26
                  : 24
              : frozenLeft !== undefined
                ? selected
                  ? 18
                  : inRange || inFillPreview || rowSelected || columnSelected
                    ? 16
                    : 14
                : selected
                  ? 7
                  : inRange || inFillPreview || rowSelected || columnSelected
                    ? 5
                    : 1,
        userSelect: "none",
      }}
    >
      <style>{`
        td[data-format-bold="true"],
        td[data-format-bold="true"] * {
          font-weight: 700 !important;
        }
        td[data-format-italic="true"],
        td[data-format-italic="true"] * {
          font-style: italic !important;
        }
        td[data-format-underline="true"],
        td[data-format-underline="true"] * {
          text-decoration: underline !important;
        }
        td[data-format-text-color="true"],
        td[data-format-text-color="true"] * {
          color: var(--samzy-cell-text-color) !important;
        }

        td[data-format-alignment="left"],
        td[data-format-alignment="left"] * {
          text-align: left !important;
        }
        td[data-format-alignment="center"],
        td[data-format-alignment="center"] * {
          text-align: center !important;
        }
        td[data-format-alignment="right"],
        td[data-format-alignment="right"] * {
          text-align: right !important;
        }
        td[data-format-font-size="8"], td[data-format-font-size="8"] * { font-size: 8px !important; }
        td[data-format-font-size="9"], td[data-format-font-size="9"] * { font-size: 9px !important; }
        td[data-format-font-size="10"], td[data-format-font-size="10"] * { font-size: 10px !important; }
        td[data-format-font-size="11"], td[data-format-font-size="11"] * { font-size: 11px !important; }
        td[data-format-font-size="12"], td[data-format-font-size="12"] * { font-size: 12px !important; }
        td[data-format-font-size="14"], td[data-format-font-size="14"] * { font-size: 14px !important; }
        td[data-format-font-size="16"], td[data-format-font-size="16"] * { font-size: 16px !important; }
        td[data-format-font-size="18"], td[data-format-font-size="18"] * { font-size: 18px !important; }
        td[data-format-font-size="20"], td[data-format-font-size="20"] * { font-size: 20px !important; }
        td[data-format-font-size="24"], td[data-format-font-size="24"] * { font-size: 24px !important; }
      `}</style>

      {displayOverride !== undefined &&
      !isFormulaCellEditing ? (
        numberDisplay !== null ? (
          <div
            style={{
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign:
                cellFormat?.alignment ??
                align,
            }}
          >
            {numberDisplay}
          </div>
        ) : (
          <div
            title={
              typeof displayOverride === "string"
                ? displayOverride
                : undefined
            }
            style={{
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign:
                cellFormat?.alignment ??
                (typeof displayOverride === "number"
                  ? "right"
                  : align),
            }}
          >
            {displayOverride === null
              ? ""
              : String(displayOverride)}
          </div>
        )
      ) : numberDisplay !== null && !selected ? (
        <div
          style={{
            width: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign:
              cellFormat?.alignment ??
              align,
          }}
        >
          {numberDisplay}
        </div>
      ) : children}

      {findMatch ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            boxSizing: "border-box",
            background:
              activeFindMatch
                ? "rgba(253,176,34,.24)"
                : "rgba(253,176,34,.14)",
            border:
              activeFindMatch
                ? "2px solid #f79009"
                : "1px solid rgba(247,144,9,.65)",
            zIndex: 47,
          }}
        />
      ) : null}

      {columnSelected ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            boxSizing: "border-box",
            borderLeft: `1px solid rgba(${selectionRgb},.50)`,
            borderRight: `1px solid rgba(${selectionRgb},.50)`,
            zIndex: 44,
          }}
        />
      ) : null}

      {rowSelected ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            boxSizing: "border-box",
            borderTop: `1px solid rgba(${selectionRgb},.50)`,
            borderBottom: `1px solid rgba(${selectionRgb},.50)`,
            zIndex: 45,
          }}
        />
      ) : null}

      {inRange ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            boxSizing: "border-box",
            border: selected
              ? `2px solid ${selectionColor}`
              : `1px solid rgba(${selectionRgb},.45)`,
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
                border: `2px solid ${selectionColor}`,
                zIndex: 50,
              }}
            />
          ) : null}

          {showFillHandle ? (
            <span
              role="button"
              aria-label="Fill handle"
              title="Drag to fill cells"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onFillStart();
              }}
              style={{
                position: "absolute",
                width: 8,
                height: 8,
                right: -4,
                bottom: -4,
                background: selectionColor,
                border: "1px solid #ffffff",
                boxSizing: "border-box",
                cursor: "crosshair",
                pointerEvents: "auto",
                zIndex: 60,
              }}
            />
          ) : null}
        </>
      ) : null}

      {showFillHandle && !selected ? (
        <span
          role="button"
          aria-label="Fill handle"
          title="Drag to fill cells"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onFillStart();
          }}
          style={{
            position: "absolute",
            width: 8,
            height: 8,
            right: -4,
            bottom: -4,
            background: selectionColor,
            border: "1px solid #ffffff",
            boxSizing: "border-box",
            cursor: "crosshair",
            pointerEvents: "auto",
            zIndex: 60,
          }}
        />
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

class FormulaEngineError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function formulaNumberValue(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (typeof value === "string") {
    const normalized =
      value
        .trim()
        .replaceAll(",", ".");

    if (normalized === "") {
      return 0;
    }

    const numeric =
      Number(normalized);

    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  throw new FormulaEngineError(
    "#VALUE!",
  );
}

function formulaRangeNumberValues(
  values: unknown[],
) {
  const numbers: number[] = [];

  for (const value of values) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      numbers.push(value);
      continue;
    }

    if (typeof value === "string") {
      const normalized =
        value
          .trim()
          .replaceAll(",", ".");

      if (normalized === "") {
        continue;
      }

      const numeric =
        Number(normalized);

      if (Number.isFinite(numeric)) {
        numbers.push(numeric);
      }
    }
  }

  return numbers;
}

function columnIndexFromLetters(
  letters: string,
) {
  let columnIndex = 0;

  for (
    const character of
      letters.toUpperCase()
  ) {
    columnIndex =
      columnIndex * 26 +
      (character.charCodeAt(0) - 64);
  }

  return columnIndex - 1;
}

function extractFormulaDependencyAddresses(
  formula: string,
  rowCount: number,
  columnCount: number,
) {
  const dependencies =
    new Set<string>();

  const referencePattern =
    /(\$?[A-Z]+\$?\d+)(?::(\$?[A-Z]+\$?\d+))?/gi;

  let match:
    RegExpExecArray | null = null;

  while (
    (match =
      referencePattern.exec(
        formula,
      )) !== null
  ) {
    const start =
      parseCellReference(
        match[1],
      );

    if (!start) {
      continue;
    }

    const end =
      match[2]
        ? parseCellReference(
            match[2],
          )
        : null;

    if (!end) {
      if (
        start.rowIndex >= 0 &&
        start.rowIndex < rowCount &&
        start.columnIndex >= 0 &&
        start.columnIndex <
          columnCount
      ) {
        dependencies.add(
          `${columnLetter(start.columnIndex)}${start.rowIndex + 1}`,
        );
      }

      continue;
    }

    const startRow =
      Math.min(
        start.rowIndex,
        end.rowIndex,
      );

    const endRow =
      Math.max(
        start.rowIndex,
        end.rowIndex,
      );

    const startColumn =
      Math.min(
        start.columnIndex,
        end.columnIndex,
      );

    const endColumn =
      Math.max(
        start.columnIndex,
        end.columnIndex,
      );

    for (
      let rowIndex = startRow;
      rowIndex <= endRow;
      rowIndex += 1
    ) {
      if (
        rowIndex < 0 ||
        rowIndex >= rowCount
      ) {
        continue;
      }

      for (
        let columnIndex =
          startColumn;
        columnIndex <= endColumn;
        columnIndex += 1
      ) {
        if (
          columnIndex < 0 ||
          columnIndex >=
            columnCount
        ) {
          continue;
        }

        dependencies.add(
          `${columnLetter(columnIndex)}${rowIndex + 1}`,
        );
      }
    }
  }

  return dependencies;
}

function parseCellReference(
  reference: string,
) {
  const match =
    /^(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*)$/.exec(
      reference.trim(),
    );

  if (!match) {
    return null;
  }

  return {
    columnIndex:
      columnIndexFromLetters(
        match[2],
      ),
    rowIndex:
      Number(match[4]) - 1,
    absoluteColumn:
      match[1] === "$",
    absoluteRow:
      match[3] === "$",
  };
}

function translateFormulaReferences(
  formula: string,
  rowDelta: number,
  columnDelta: number,
) {
  if (!formula.trim().startsWith("=")) {
    return formula;
  }

  return formula.replace(
    /\$?[A-Za-z]+\$?[1-9][0-9]*/g,
    (reference) => {
      const parsed =
        parseCellReference(
          reference,
        );

      if (!parsed) {
        return reference;
      }

      const nextColumnIndex =
        parsed.absoluteColumn
          ? parsed.columnIndex
          : parsed.columnIndex +
            columnDelta;

      const nextRowIndex =
        parsed.absoluteRow
          ? parsed.rowIndex
          : parsed.rowIndex +
            rowDelta;

      if (
        nextColumnIndex < 0 ||
        nextRowIndex < 0
      ) {
        return "#REF!";
      }

      return `${
        parsed.absoluteColumn
          ? "$"
          : ""
      }${columnLetter(nextColumnIndex)}${
        parsed.absoluteRow
          ? "$"
          : ""
      }${nextRowIndex + 1}`;
    },
  );
}

/*
 * Formula Engine V3:
 * - direct dependency recalculation stays render-driven from current sheet data
 * - copied/filled formulas translate relative references
 * - $A$1, A$1, and $A1 absolute/mixed references are preserved
 */
function evaluateArithmeticFormula(
  formula: string,
  resolveReference: (
    reference: string,
  ) => number,
  resolveRange: (
    startReference: string,
    endReference: string,
  ) => unknown[],
) {
  const source =
    formula.trim().startsWith("=")
      ? formula.trim().slice(1)
      : formula.trim();

  let index = 0;

  function skipWhitespace() {
    while (
      index < source.length &&
      /\s/.test(source[index])
    ) {
      index += 1;
    }
  }

  function parseExpression(): number {
    return parseComparison();
  }

  /*
   * Formula Engine V4.4 — Excel-style comparison expressions.
   *
   * Comparisons return 1 for TRUE and 0 for FALSE so they can be used
   * directly by IF() while remaining compatible with the numeric formula
   * engine. Supported operators: =, <>, >, >=, <, <=.
   */
  function parseComparison(): number {
    let value =
      parseAdditive();

    while (true) {
      skipWhitespace();

      const remaining =
        source.slice(index);

      const operatorMatch =
        /^(>=|<=|<>|=|>|<)/.exec(
          remaining,
        );

      if (!operatorMatch) {
        break;
      }

      const operator =
        operatorMatch[1];

      index +=
        operator.length;

      const right =
        parseAdditive();

      let result = false;

      switch (operator) {
        case "=":
          result = value === right;
          break;
        case "<>":
          result = value !== right;
          break;
        case ">":
          result = value > right;
          break;
        case ">=":
          result = value >= right;
          break;
        case "<":
          result = value < right;
          break;
        case "<=":
          result = value <= right;
          break;
      }

      value =
        result ? 1 : 0;
    }

    return value;
  }

  function parseAdditive(): number {
    let value =
      parseTerm();

    while (true) {
      skipWhitespace();

      const operator =
        source[index];

      if (
        operator !== "+" &&
        operator !== "-"
      ) {
        break;
      }

      index += 1;

      const right =
        parseTerm();

      value =
        operator === "+"
          ? value + right
          : value - right;
    }

    return value;
  }

  function parseTerm(): number {
    let value =
      parseUnary();

    while (true) {
      skipWhitespace();

      const operator =
        source[index];

      if (
        operator !== "*" &&
        operator !== "/"
      ) {
        break;
      }

      index += 1;

      const right =
        parseUnary();

      if (
        operator === "/" &&
        right === 0
      ) {
        throw new FormulaEngineError(
          "#DIV/0!",
        );
      }

      value =
        operator === "*"
          ? value * right
          : value / right;
    }

    return value;
  }

  function parseUnary(): number {
    skipWhitespace();

    if (source[index] === "+") {
      index += 1;
      return parseUnary();
    }

    if (source[index] === "-") {
      index += 1;
      return -parseUnary();
    }

    return parsePrimary();
  }

  function parseFunctionCall(
    functionName: string,
  ) {
    skipWhitespace();

    if (source[index] !== "(") {
      throw new FormulaEngineError(
        "#ERROR!",
      );
    }

    index += 1;

    const scalarValues: number[] =
      [];
    const rangeValues: unknown[] =
      [];

    skipWhitespace();

    if (source[index] === ")") {
      index += 1;
      return evaluateFunction(
        functionName,
        scalarValues,
        rangeValues,
      );
    }

    while (true) {
      skipWhitespace();

      const remaining =
        source.slice(index);

      const rangeMatch =
        /^(\$?[A-Za-z]+\$?[1-9][0-9]*)\s*:\s*(\$?[A-Za-z]+\$?[1-9][0-9]*)/.exec(
          remaining,
        );

      if (rangeMatch) {
        index +=
          rangeMatch[0].length;

        rangeValues.push(
          ...resolveRange(
            rangeMatch[1],
            rangeMatch[2],
          ),
        );
      } else {
        scalarValues.push(
          parseExpression(),
        );
      }

      skipWhitespace();

      if (source[index] === ")") {
        index += 1;
        break;
      }

      if (
        source[index] !== "," &&
        source[index] !== ";"
      ) {
        throw new FormulaEngineError(
          "#ERROR!",
        );
      }

      index += 1;
    }

    return evaluateFunction(
      functionName,
      scalarValues,
      rangeValues,
    );
  }

  function evaluateFunction(
    functionName: string,
    scalarValues: number[],
    rangeValues: unknown[],
  ) {
    const rangeNumbers =
      formulaRangeNumberValues(
        rangeValues,
      );

    const values = [
      ...scalarValues,
      ...rangeNumbers,
    ];

    switch (
      functionName.toUpperCase()
    ) {
      case "SUM":
        return values.reduce(
          (sum, value) =>
            sum + value,
          0,
        );

      case "AVERAGE":
        if (values.length === 0) {
          throw new FormulaEngineError(
            "#DIV/0!",
          );
        }

        return (
          values.reduce(
            (sum, value) =>
              sum + value,
            0,
          ) / values.length
        );

      case "MIN":
        if (values.length === 0) {
          return 0;
        }

        return Math.min(
          ...values,
        );

      case "MAX":
        if (values.length === 0) {
          return 0;
        }

        return Math.max(
          ...values,
        );

      case "COUNT":
        return values.length;

      case "IF":
        if (
          scalarValues.length < 2 ||
          scalarValues.length > 3 ||
          rangeValues.length > 0
        ) {
          throw new FormulaEngineError(
            "#ERROR!",
          );
        }

        return scalarValues[0] !== 0
          ? scalarValues[1]
          : scalarValues.length >= 3
            ? scalarValues[2]
            : 0;

      case "AND":
        if (
          scalarValues.length < 1 ||
          rangeValues.length > 0
        ) {
          throw new FormulaEngineError(
            "#ERROR!",
          );
        }

        return scalarValues.every(
          (value) => value !== 0,
        )
          ? 1
          : 0;

      case "OR":
        if (
          scalarValues.length < 1 ||
          rangeValues.length > 0
        ) {
          throw new FormulaEngineError(
            "#ERROR!",
          );
        }

        return scalarValues.some(
          (value) => value !== 0,
        )
          ? 1
          : 0;

      case "NOT":
        if (
          scalarValues.length !== 1 ||
          rangeValues.length > 0
        ) {
          throw new FormulaEngineError(
            "#ERROR!",
          );
        }

        return scalarValues[0] === 0
          ? 1
          : 0;

      default:
        throw new FormulaEngineError(
          "#NAME?",
        );
    }
  }

  function parsePrimary(): number {
    skipWhitespace();

    if (source[index] === "(") {
      index += 1;

      const value =
        parseExpression();

      skipWhitespace();

      if (source[index] !== ")") {
        throw new FormulaEngineError(
          "#ERROR!",
        );
      }

      index += 1;
      return value;
    }

    const remaining =
      source.slice(index);

    /*
     * Formula Engine V4.2 compatibility:
     * Structural edits can persist Excel-style error tokens directly
     * inside formulas, for example =#REF!+#REF!.
     * Propagate those tokens instead of collapsing them to #ERROR!.
     */
    const errorTokenMatch =
      /^(#REF!|#VALUE!|#DIV\/0!|#CIRC!|#ERROR!|#NAME\?)/i.exec(
        remaining,
      );

    if (errorTokenMatch) {
      index +=
        errorTokenMatch[0].length;

      throw new FormulaEngineError(
        errorTokenMatch[0].toUpperCase(),
      );
    }

    const identifierMatch =
      /^[A-Za-z]+/.exec(
        remaining,
      );

    if (identifierMatch) {
      const identifier =
        identifierMatch[0];

      const afterIdentifier =
        source
          .slice(
            index +
              identifier.length,
          )
          .trimStart();

      if (
        afterIdentifier.startsWith("(")
      ) {
        index +=
          identifier.length;

        return parseFunctionCall(
          identifier,
        );
      }
    }

    const referenceMatch =
      /^\$?[A-Za-z]+\$?[1-9][0-9]*/.exec(
        remaining,
      );

    if (referenceMatch) {
      index +=
        referenceMatch[0].length;

      return resolveReference(
        referenceMatch[0],
      );
    }

    const numberMatch =
      /^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)/.exec(
        remaining,
      );

    if (numberMatch) {
      index +=
        numberMatch[0].length;

      const value =
        Number(
          numberMatch[0],
        );

      if (!Number.isFinite(value)) {
        throw new FormulaEngineError(
          "#VALUE!",
        );
      }

      return value;
    }

    throw new FormulaEngineError(
      "#ERROR!",
    );
  }

  if (!source) {
    throw new FormulaEngineError(
      "#ERROR!",
    );
  }

  const result =
    parseExpression();

  skipWhitespace();

  if (index !== source.length) {
    throw new FormulaEngineError(
      "#ERROR!",
    );
  }

  if (!Number.isFinite(result)) {
    throw new FormulaEngineError(
      "#VALUE!",
    );
  }

  return result;
}

function booleanCellValue(
  value: string | number | null,
) {
  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized =
      value.trim().toUpperCase();

    return (
      normalized === "TRUE" ||
      normalized === "1" ||
      normalized === "YES" ||
      normalized === "CHECKED"
    );
  }

  return false;
}

function formulaBarValue(
  value: string | number | null,
  type: CellType,
) {
  if (type === "boolean") {
    return booleanCellValue(value)
      ? "TRUE"
      : "FALSE";
  }

  if (
    type === "date" ||
    type === "datetime" ||
    type === "time"
  ) {
    return value === null ||
      value === undefined
      ? ""
      : String(value);
  }

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

function ColumnInsertChoices({
  columns,
  onChoose,
}: {
  columns: ColumnDefinition[];
  onChoose: (key: string) => void;
}) {
  if (columns.length === 0) {
    return (
      <div
        style={{
          margin: "2px 4px 5px",
          padding: "6px 8px",
          borderRadius: 4,
          background: "#f8fafc",
          color: "#667085",
          fontSize: 9,
        }}
      >
        No hidden or available columns.
      </div>
    );
  }

  return (
    <div
      style={{
        margin: "2px 4px 5px",
        padding: 4,
        maxHeight: 150,
        overflowY: "auto",
        border: "1px solid #eaecf0",
        borderRadius: 5,
        background: "#f8fafc",
      }}
    >
      {columns.map(
        (column) => (
          <button
            key={column.key}
            type="button"
            onClick={() =>
              onChoose(
                column.key,
              )
            }
            style={{
              ...menuButtonStyle,
              background:
                "#f8fafc",
              fontSize: 9,
            }}
          >
            + {column.label}
          </button>
        ),
      )}
    </div>
  );
}


function LetterHeader({
  letter,
  width,
  selected,
  draggable,
  dragging,
  onSelect,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onResizeStart,
  onAutoFit,
  frozenLeft,
  frozenEdge,
  removable,
  onRemove,
}: {
  letter: string;
  width: number;
  selected: boolean;
  draggable: boolean;
  dragging: boolean;
  onSelect: (event: MouseEvent<HTMLTableCellElement>) => void;
  onContextMenu: (event: MouseEvent<HTMLTableCellElement>) => void;
  onDragStart: () => void;
  onDragOver: (event: DragEvent<HTMLTableCellElement>) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onResizeStart: (event: MouseEvent<HTMLSpanElement>) => void;
  onAutoFit: (event: MouseEvent<HTMLSpanElement>) => void;
  frozenLeft?: number;
  frozenEdge: boolean;
  removable: boolean;
  onRemove: () => void;
}) {
  return (
    <th
      draggable={draggable}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={dragging ? "samzy-column-dragging" : undefined}
      title="Click to select column · Shift+click to select a range · Drag to move"
      style={{
        position: "sticky",
        top: 0,
        left: frozenLeft,
        zIndex: frozenLeft !== undefined ? 46 : 30,
        width,
        minWidth: width,
        maxWidth: width,
        height: LETTER_ROW_HEIGHT,
        padding: "0 4px",
        boxSizing: "border-box",
        background: selected ? "#fff3e8" : "#f3f4f6",
        borderRight: frozenEdge
          ? "2px solid #667085"
          : "1px solid #aeb6c2",
        borderBottom: selected ? "2px solid #f04400" : "1px solid #aeb6c2",
        textAlign: "center",
        fontSize: 10,
        lineHeight: 1,
        fontWeight: selected ? 750 : 600,
        color: selected ? "#f04400" : "#475467",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <span>{letter}</span>
      <span
        aria-hidden="true"
        title="Drag to resize column · Double-click to AutoFit"
        onMouseDown={onResizeStart}
        onDoubleClick={onAutoFit}
        style={{
          position: "absolute",
          top: 0,
          right: -3,
          width: 7,
          height: "100%",
          cursor: "col-resize",
          zIndex: 30,
        }}
      />

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
  frozenLeft,
  frozenEdge,
}: {
  children: React.ReactNode;
  width: number;
  tone: Tone;
  frozenLeft?: number;
  frozenEdge: boolean;
}) {
  return (
    <th
      style={{
        position: "sticky",
        top: LETTER_ROW_HEIGHT + GROUP_ROW_HEIGHT,
        left: frozenLeft,
        zIndex: frozenLeft !== undefined ? 44 : 27,
        width,
        minWidth: width,
        maxWidth: width,
        height: COLUMN_HEADER_HEIGHT,
        padding: "2px 4px",
        boxSizing: "border-box",
        background: toneBackground(tone, true),
        borderRight: frozenEdge
          ? "2px solid #667085"
          : "1px solid #aeb6c2",
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
  height,
  frozenTop,
  frozenEdge,
}: {
  children: React.ReactNode;
  selected: boolean;
  height: number;
  frozenTop?: number;
  frozenEdge: boolean;
}) {
  return (
    <td
      style={{
        position: "sticky",
        top: frozenTop,
        left: 0,
        zIndex:
          frozenTop !== undefined
            ? selected
              ? 36
              : 34
            : selected
              ? 16
              : 12,
        width: ROW_NUMBER_WIDTH,
        minWidth: ROW_NUMBER_WIDTH,
        maxWidth: ROW_NUMBER_WIDTH,
        height,
        padding: "1px 4px",
        boxSizing: "border-box",
        background: selected ? "#fff3e8" : "#f8fafc",
        borderRight: selected ? "2px solid #f04400" : "1px solid #8c97a6",
        borderBottom: frozenEdge
          ? "2px solid #667085"
          : "1px solid #aeb6c2",
        verticalAlign: "middle",
        textAlign: "center",
        color: selected ? "#f04400" : "#64748b",
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

const rowMenuButtonStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 28,
  padding: "5px 8px",
  border: 0,
  borderRadius: 4,
  background: "#ffffff",
  color: "#111827",
  fontSize: 10,
  fontWeight: 600,
  textAlign: "left",
  cursor: "pointer",
};


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