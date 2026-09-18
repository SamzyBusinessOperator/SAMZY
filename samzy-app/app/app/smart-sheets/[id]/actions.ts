"use server";

import { createHash, randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type ActionResult = {
  ok: boolean;
  message?: string;
};

type CellValue =
  | string
  | number
  | null;

type UpdateCellInput = {
  sheetId: string;
  rowId: string;
  columnKey: string;
  value: CellValue;
};

type AddSmartSheetColumnDataType =
  | "text"
  | "number"
  | "currency"
  | "percentage"
  | "date"
  | "datetime"
  | "time"
  | "boolean";

type AddSmartSheetColumnInput = {
  sheetId: string;
  label: string;
  dataType: AddSmartSheetColumnDataType;
  anchorColumnKey?: string;
  side?: "left" | "right";
};

type AddSmartSheetColumnResult = ActionResult & {
  column?: {
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
};

type DeleteSmartSheetColumnInput = {
  sheetId: string;
  columnKey: string;
};

type DeleteSmartSheetColumnResult = ActionResult & {
  deletedColumnKey?: string;
};


type RenameSmartSheetColumnInput = {
  sheetId: string;
  columnKey: string;
  label: string;
};

type RenameSmartSheetColumnResult = ActionResult & {
  column?: {
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
};

type SetSmartSheetColumnHiddenInput = {
  sheetId: string;
  columnKey: string;
  hidden: boolean;
};

type ReorderSmartSheetColumnsInput = {
  sheetId: string;
  orderedColumnKeys: string[];
};

type SetSmartSheetColumnWidthsInput = {
  sheetId: string;
  columns: Array<{
    columnKey: string;
    width: number;
  }>;
};

type SetSmartSheetColumnPresentationInput = {
  sheetId: string;
  columnKey: string;
  presentation:
    | "text"
    | "number"
    | "currency"
    | "percentage"
    | "date"
    | "datetime"
    | "time"
    | "boolean";
};

type SetSmartSheetColumnPresentationResult =
  ActionResult & {
    column?: {
      id: string;
      column_key: string;
      data_type: string;
      number_format: string | null;
      decimal_places: number | null;
      is_system: boolean;
    };
  };

type SetSmartSheetColumnListValidationInput = {
  sheetId: string;
  columnKey: string;
  values: string[];
};

type SetSmartSheetColumnListValidationResult =
  ActionResult & {
    column?: {
      id: string;
      column_key: string;
      metadata: unknown;
      is_system: boolean;
    };
  };

type SmartSheetConditionalFormatRule = {
  operator: "equals" | "contains" | "gt" | "lt";
  value: string;
  fillColor: string;
  textColor: string;
};

type SetSmartSheetColumnConditionalFormattingInput = {
  sheetId: string;
  columnKey: string;
  rule: SmartSheetConditionalFormatRule | null;
};

type SetSmartSheetColumnConditionalFormattingResult =
  ActionResult & {
    column?: {
      id: string;
      column_key: string;
      metadata: unknown;
      is_system: boolean;
    };
  };

type SetSmartSheetColumnSemanticMappingInput = {
  sheetId: string;
  columnKey: string;
  semanticRole: string | null;
};

type SetSmartSheetColumnSemanticMappingResult =
  ActionResult & {
    column?: {
      id: string;
      column_key: string;
      semantic_role: string | null;
      business_mapping: unknown;
      is_system: boolean;
    };
  };

function canonicalizeSmartSheetSemanticRole(
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

/*
 * V4.10d multilingual semantic recognition foundation.
 *
 * This remains advisory metadata only. The user's original wording is kept
 * exactly in semantic_role. Recognition never renames a column, blocks an
 * unknown term, changes a formula, or mutates business calculations.
 *
 * The registry is deliberately a deterministic safety/preview layer rather
 * than the final multilingual intelligence system. Future OCR + AI document
 * understanding can write to the same canonical concept metadata using
 * recognition_source="ai" and its own confidence/language evidence.
 */
type SmartSheetSemanticAlias = {
  canonicalRole: string;
  language: string;
};

const SMART_SHEET_SEMANTIC_ROLE_ALIASES: Record<
  string,
  SmartSheetSemanticAlias
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

function resolveSmartSheetSemanticRole(value: string) {
  const normalizedRole =
    canonicalizeSmartSheetSemanticRole(value);
  const alias = SMART_SHEET_SEMANTIC_ROLE_ALIASES[normalizedRole];

  return {
    normalizedRole,
    canonicalRole: alias?.canonicalRole ?? normalizedRole,
    recognized: Boolean(normalizedRole && alias),
    recognizedLanguage: alias?.language ?? null,
    recognitionSource: alias ? "alias_registry" : "custom",
    recognitionConfidence: alias ? 1 : null,
  };
}

type SetSmartSheetColumnDecimalPlacesInput = {
  sheetId: string;
  columnKey: string;
  decimalPlaces: number;
};

type SetSmartSheetColumnDecimalPlacesResult =
  ActionResult & {
    column?: {
      id: string;
      column_key: string;
      data_type: string;
      number_format: string | null;
      decimal_places: number | null;
      is_system: boolean;
    };
  };

type BatchPasteCellInput = {
  rowId: string;
  columnKey: string;
  value: CellValue;

  /*
   * Spreadsheet overlay intent. Fill Handle uses this when the SOURCE cell
   * is a smart_sheet_cells overlay. The destination must then be written to
   * the visible spreadsheet layer instead of mutating the semantic business
   * field underneath it. Ordinary paste callers leave this undefined.
   */
  preserveBusiness?: boolean;
  sourceRowId?: string | null;
  sourceColumnKey?: string | null;
};

type BatchPasteInput = {
  sheetId: string;
  cells: BatchPasteCellInput[];
};

type ClearCellInput = {
  rowId: string;
  columnKey: string;
};

type ClearCellsInput = {
  sheetId: string;
  cells: ClearCellInput[];
};

type CutPasteCellsInput = {
  sheetId: string;
  sourceCells: ClearCellInput[];
  destinationCells: BatchPasteCellInput[];
  destinationFormats?: ApplyFormatPainterInput["cells"];
};

type PasteCellsWithFormattingInput = {
  sheetId: string;
  cells: BatchPasteCellInput[];
  formats: ApplyFormatPainterInput["cells"];
};

type ShiftSmartSheetCellsInput = {
  sheetId: string;
  orderedRowIds: string[];
  startRowIndex: number;
  endRowIndex: number;
  columnKeys: string[];
  direction: "down" | "up";
};

type ShiftSmartSheetCellsLeftInput = {
  sheetId: string;
  rowIds: string[];
  orderedColumnKeys: string[];
  startColumnIndex: number;
  endColumnIndex: number;
};

type ShiftSmartSheetCellsRightInput = {
  sheetId: string;
  rowIds: string[];
  orderedColumnKeys: string[];
  startColumnIndex: number;
  endColumnIndex: number;
};

type CellMode =
  | "manual"
  | "ocr"
  | "calculated"
  | "same";

type PricingDriver =
  | "price"
  | "markup";

type SupabaseServerClient =
  Awaited<
    ReturnType<typeof createClient>
  >;


type SmartSheetStructuralHistory = {
  rowSnapshot: Record<string, unknown>;
  states: Record<string, unknown>[];
  shouldExist: boolean;
};

type SmartSheetHistorySnapshot = {
  rowIds: string[];
  rows: Record<string, unknown>[];
  states: Record<string, unknown>[];
  sheet: Record<string, unknown> | null;
  formats?: Record<string, unknown>[];
  overlays?: Record<string, unknown>[];
  structure?: SmartSheetStructuralHistory;
  structures?: SmartSheetStructuralHistory[];
};

type HistoryStatusResult = ActionResult & {
  canUndo?: boolean;
  canRedo?: boolean;
};

type InsertRowResult = ActionResult & {
  rowId?: string;
  rowNumber?: number;
};

type InsertRowsResult = ActionResult & {
  insertedCount?: number;
  firstRowId?: string;
  firstRowNumber?: number;
  lastRowNumber?: number;
};

type DeleteRowResult = ActionResult & {
  deletedRowNumber?: number;
  nextRowId?: string;
  nextRowNumber?: number;
};

type DeleteRowsResult = ActionResult & {
  deletedCount?: number;
  nextRowId?: string;
  nextRowNumber?: number;
};


type SortDirection = "asc" | "desc";

type SortRowsResult = ActionResult & {
  sortedCount?: number;
};

type CellFormatKind =
  | "bold"
  | "italic"
  | "underline"
  | "align_left"
  | "align_center"
  | "align_right";

type SmartSheetCellFormat = {
  row_id: string;
  column_key: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  text_alignment: "left" | "center" | "right" | null;
  font_size: number | null;
  number_format: "general" | "number" | "currency" | "percentage" | null;
  decimal_places: number | null;
  fill_color: string | null;
  text_color: string | null;
  border_top: boolean;
  border_right: boolean;
  border_bottom: boolean;
  border_left: boolean;
};

type ApplyCellFormattingInput = {
  sheetId: string;
  cells: Array<{ rowId: string; columnKey: string }>;
  format: CellFormatKind;
  enabled: boolean;
};

type ClearCellFormattingInput = {
  sheetId: string;
  cells: Array<{ rowId: string; columnKey: string }>;
};

type ApplyCellFontSizeInput = {
  sheetId: string;
  cells: Array<{ rowId: string; columnKey: string }>;
  fontSize: number;
};

type NumberFormatKind = "general" | "number" | "currency" | "percentage";

type ApplyCellNumberFormatInput = {
  sheetId: string;
  cells: Array<{ rowId: string; columnKey: string }>;
  numberFormat: NumberFormatKind;
};

type ApplyCellTextColorInput = {
  sheetId: string;
  cells: Array<{ rowId: string; columnKey: string }>;
  textColor: string | null;
};

type ApplyCellFillColorInput = {
  sheetId: string;
  cells: Array<{ rowId: string; columnKey: string }>;
  fillColor: string | null;
};

type CellBorderKind =
  | "all"
  | "outer"
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "none";

type ApplyCellBordersInput = {
  sheetId: string;
  cells: Array<{ rowId: string; columnKey: string }>;
  border: CellBorderKind;
};

type FormatPainterValue = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlignment: "left" | "center" | "right" | null;
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

type ApplyFormatPainterInput = {
  sheetId: string;
  cells: Array<{
    rowId: string;
    columnKey: string;
    format: FormatPainterValue;
  }>;
};

type AdjustCellDecimalPlacesInput = {
  sheetId: string;
  cells: Array<{ rowId: string; columnKey: string }>;
  delta: -1 | 1;
};


/* =========================================================
   EDITABLE COLUMN DEFINITIONS
   ========================================================= */

const textColumns = new Set([
  "description",
  "sku_snapshot",
  "barcode_snapshot",
  "pack_size",
  "notes",
]);

const numericInputColumns =
  new Set([
    "quantity",
    "supplier_cost_ex_vat",
    "item_cost",
    "vat_rate",
  ]);

const calculatedNumericColumns =
  new Set([
    "transport_rate",
    "transported_cost",
    "c_ivacp_price",

    "shop_sem_price",
    "shop_sem_markup",

    "shop_com_price",
    "shop_com_markup",

    "special_price",
    "special_markup",

    "big_wholesale_price",
    "big_wholesale_markup",

    "rest_com_price",
    "rest_com_markup",

    "public_price",
  ]);

/*
 * Formula-backed cells that may still be explicitly overridden by the user.
 * The formula remains stored underneath in formula_value.
 */
const formulaOverrideColumns = new Set([
  "transported_cost",
  "c_ivacp_price",
]);


const sameAllowedColumns =
  new Set([
    "item_cost",
    "transported_cost",
    "c_ivacp_price",

    "shop_sem_price",
    "shop_sem_markup",

    "shop_com_price",
    "shop_com_markup",

    "special_price",
    "special_markup",

    "big_wholesale_price",
    "big_wholesale_markup",

    "rest_com_price",
    "rest_com_markup",

    "public_price",
  ]);

const driverColumns =
  new Set([
    "shop_sem_driver",
    "shop_com_driver",
    "special_driver",
    "big_wholesale_driver",
    "rest_com_driver",
  ]);


/* =========================================================
   PRICE / MARKUP DRIVER MAP
   ========================================================= */

const pricingDriverMap: Record<
  string,
  {
    driverColumn: string;
    driver: PricingDriver;
  }
> = {
  shop_sem_price: {
    driverColumn:
      "shop_sem_driver",
    driver: "price",
  },

  shop_sem_markup: {
    driverColumn:
      "shop_sem_driver",
    driver: "markup",
  },

  shop_com_price: {
    driverColumn:
      "shop_com_driver",
    driver: "price",
  },

  shop_com_markup: {
    driverColumn:
      "shop_com_driver",
    driver: "markup",
  },

  special_price: {
    driverColumn:
      "special_driver",
    driver: "price",
  },

  special_markup: {
    driverColumn:
      "special_driver",
    driver: "markup",
  },

  big_wholesale_price: {
    driverColumn:
      "big_wholesale_driver",
    driver: "price",
  },

  big_wholesale_markup: {
    driverColumn:
      "big_wholesale_driver",
    driver: "markup",
  },

  rest_com_price: {
    driverColumn:
      "rest_com_driver",
    driver: "price",
  },

  rest_com_markup: {
    driverColumn:
      "rest_com_driver",
    driver: "markup",
  },
};


/* =========================================================
   PRICE / MARKUP PAIRS
   ========================================================= */

const pairedPricingColumnMap: Record<
  string,
  string
> = {
  shop_sem_price:
    "shop_sem_markup",

  shop_sem_markup:
    "shop_sem_price",

  shop_com_price:
    "shop_com_markup",

  shop_com_markup:
    "shop_com_price",

  special_price:
    "special_markup",

  special_markup:
    "special_price",

  big_wholesale_price:
    "big_wholesale_markup",

  big_wholesale_markup:
    "big_wholesale_price",

  rest_com_price:
    "rest_com_markup",

  rest_com_markup:
    "rest_com_price",
};


/* =========================================================
   CALCULATED MODE DRIVER MAP
   ========================================================= */

const calculatedDriverMap: Record<
  string,
  {
    driverColumn: string;
    driver: PricingDriver;
  }
> = {
  shop_sem_price: {
    driverColumn:
      "shop_sem_driver",
    driver: "markup",
  },

  shop_sem_markup: {
    driverColumn:
      "shop_sem_driver",
    driver: "price",
  },

  shop_com_price: {
    driverColumn:
      "shop_com_driver",
    driver: "markup",
  },

  shop_com_markup: {
    driverColumn:
      "shop_com_driver",
    driver: "price",
  },

  special_price: {
    driverColumn:
      "special_driver",
    driver: "markup",
  },

  special_markup: {
    driverColumn:
      "special_driver",
    driver: "price",
  },

  big_wholesale_price: {
    driverColumn:
      "big_wholesale_driver",
    driver: "markup",
  },

  big_wholesale_markup: {
    driverColumn:
      "big_wholesale_driver",
    driver: "price",
  },

  rest_com_price: {
    driverColumn:
      "rest_com_driver",
    driver: "markup",
  },

  rest_com_markup: {
    driverColumn:
      "rest_com_driver",
    driver: "price",
  },
};


/* =========================================================
   AUTHORIZATION
   ========================================================= */

async function getAuthorizedContext(
  sheetId: string,
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Authentication required.",
    );
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (
    membershipError ||
    !membership
  ) {
    throw new Error(
      membershipError?.message ||
        "Organization membership required.",
    );
  }

  const {
    data: sheet,
    error: sheetError,
  } = await supabase
    .from("smart_sheets")
    .select(`
      id,
      organization_id,
      status
    `)
    .eq("id", sheetId)
    .eq(
      "organization_id",
      membership.organization_id,
    )
    .maybeSingle();

  if (
    sheetError ||
    !sheet
  ) {
    throw new Error(
      sheetError?.message ||
        "Smart Sheet not found.",
    );
  }

  if (
    sheet.status !== "draft" &&
    sheet.status !==
      "processing"
  ) {
    throw new Error(
      "This Smart Sheet is no longer freely editable.",
    );
  }

  return {
    supabase,
    user,
    organizationId:
      membership.organization_id,
    sheet,
  };
}


/* =========================================================
   VERIFY ROW
   ========================================================= */

async function verifyRow(
  supabase: SupabaseServerClient,
  sheetId: string,
  rowId: string,
  organizationId: string,
) {
  const {
    data: row,
    error,
  } = await supabase
    .from("smart_sheet_rows")
    .select("*")
    .eq("id", rowId)
    .eq(
      "smart_sheet_id",
      sheetId,
    )
    .eq(
      "organization_id",
      organizationId,
    )
    .maybeSingle();

  if (
    error ||
    !row
  ) {
    throw new Error(
      error?.message ||
        "Smart Sheet row not found.",
    );
  }

  return row;
}


/* =========================================================
   FORMULA ENGINE V4.3 — COLUMN INSERT REFERENCE INTEGRITY
   ========================================================= */

/*
 * Structural column insertion follows spreadsheet semantics:
 * $ locks a column during COPY/FILL, but inserting a physical column still
 * moves references at or to the right of the insertion boundary.
 *
 * Formula addresses are based on the sheet's physical column order, so a new
 * column inserted at zero-based position N shifts spreadsheet column N + 1
 * and every column to its right by one letter.
 */
function spreadsheetColumnLettersToNumber(
  letters: string,
) {
  let value = 0;

  for (const character of letters.toUpperCase()) {
    const code = character.charCodeAt(0);

    if (code < 65 || code > 90) {
      return null;
    }

    value = value * 26 + (code - 64);
  }

  return value > 0 ? value : null;
}

function spreadsheetColumnNumberToLetters(
  columnNumber: number,
) {
  if (
    !Number.isInteger(columnNumber) ||
    columnNumber < 1
  ) {
    return null;
  }

  let remaining = columnNumber;
  let letters = "";

  while (remaining > 0) {
    const remainder = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    remaining = Math.floor((remaining - 1) / 26);
  }

  return letters;
}

function translateFormulaReferencesForInsertedColumn(
  formula: string,
  insertedColumnNumber: number,
) {
  if (
    !formula.trim().startsWith("=") ||
    !Number.isInteger(insertedColumnNumber) ||
    insertedColumnNumber < 1
  ) {
    return formula;
  }

  return formula.replace(
    /(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*)/g,
    (
      reference,
      absoluteColumn: string,
      columnLetters: string,
      absoluteRow: string,
      rowDigits: string,
    ) => {
      const columnNumber =
        spreadsheetColumnLettersToNumber(columnLetters);

      if (
        columnNumber === null ||
        columnNumber < insertedColumnNumber
      ) {
        return reference;
      }

      const nextColumnLetters =
        spreadsheetColumnNumberToLetters(columnNumber + 1);

      if (!nextColumnLetters) {
        return reference;
      }

      return `${absoluteColumn}${nextColumnLetters}${absoluteRow}${rowDigits}`;
    },
  );
}

async function updateFormulaReferencesForInsertedColumn(
  supabase: SupabaseServerClient,
  sheetId: string,
  organizationId: string,
  formulaOverlays: FormulaOverlayForRowInsert[],
  insertedColumnNumber: number,
) {
  for (const overlay of formulaOverlays) {
    const nextFormula =
      translateFormulaReferencesForInsertedColumn(
        overlay.formula,
        insertedColumnNumber,
      );

    if (nextFormula === overlay.formula) {
      continue;
    }

    const { error } = await supabase
      .from("smart_sheet_cells")
      .update({ value: nextFormula })
      .eq("id", overlay.id)
      .eq("smart_sheet_id", sheetId)
      .eq("organization_id", organizationId);

    if (error) {
      throw new Error(error.message);
    }
  }
}

/* =========================================================
   ADD GENERIC SMART SHEET COLUMN
   ========================================================= */

export async function addSmartSheetColumn(
  input: AddSmartSheetColumnInput,
): Promise<AddSmartSheetColumnResult> {
  try {
    const {
      supabase,
      organizationId,
    } = await getAuthorizedContext(
      input.sheetId,
    );

    const label = input.label.trim();

    if (!label) {
      throw new Error(
        "Column name is required.",
      );
    }

    if (label.length > 80) {
      throw new Error(
        "Column name must be 80 characters or fewer.",
      );
    }

    const allowedDataTypes =
      new Set<AddSmartSheetColumnDataType>([
        "text",
        "number",
        "currency",
        "percentage",
        "date",
        "datetime",
        "time",
        "boolean",
      ]);

    if (!allowedDataTypes.has(input.dataType)) {
      throw new Error(
        "Unsupported column type.",
      );
    }

    const {
      data: existingColumns,
      error: positionError,
    } = await supabase
      .from("smart_sheet_columns")
      .select("id,column_key,position")
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .order(
        "position",
        {
          ascending: true,
        },
      );

    if (positionError) {
      throw new Error(
        positionError.message,
      );
    }

    const orderedColumns =
      existingColumns ?? [];

    const formulaOverlays =
      await getFormulaOverlaysForRowInsert(
        supabase,
        input.sheetId,
        organizationId,
      );

    let nextPosition =
      orderedColumns.length;

    if (input.anchorColumnKey) {
      const anchorIndex =
        orderedColumns.findIndex(
          (column) =>
            String(column.column_key) ===
            input.anchorColumnKey,
        );

      if (anchorIndex === -1) {
        throw new Error(
          "Insertion anchor column was not found.",
        );
      }

      nextPosition =
        input.side === "right"
          ? anchorIndex + 1
          : anchorIndex;

      /*
       * Position is intentionally non-unique. Shift from the end toward the
       * insertion point so existing UUID identities and cell associations are
       * preserved while a real new column receives the requested slot.
       */
      for (
        let index = orderedColumns.length - 1;
        index >= nextPosition;
        index -= 1
      ) {
        const column =
          orderedColumns[index];

        const {
          error: shiftError,
        } = await supabase
          .from("smart_sheet_columns")
          .update({
            position: index + 1,
          })
          .eq(
            "id",
            column.id,
          )
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          );

        if (shiftError) {
          throw new Error(
            shiftError.message,
          );
        }
      }
    }

    const columnKey =
      `custom_${crypto.randomUUID().replaceAll("-", "")}`;

    const {
      data: insertedColumn,
      error: insertError,
    } = await supabase
      .from("smart_sheet_columns")
      .insert({
        organization_id:
          organizationId,
        smart_sheet_id:
          input.sheetId,
        column_key:
          columnKey,
        label,
        position:
          nextPosition,
        width: 120,
        hidden: false,
        data_type:
          input.dataType,
        number_format:
          input.dataType === "currency"
            ? "currency"
            : input.dataType === "percentage"
              ? "percentage"
              : input.dataType === "number"
                ? "number"
                : null,
        decimal_places: null,
        semantic_role: null,
        formula_definition: null,
        business_mapping: null,
        metadata: {
          custom: true,
        },
        is_system: false,
      })
      .select(`
        id,
        column_key,
        label,
        position,
        width,
        hidden,
        data_type,
        number_format,
        decimal_places,
        semantic_role,
        formula_definition,
        business_mapping,
        metadata,
        is_system
      `)
      .single();

    if (
      insertError ||
      !insertedColumn
    ) {
      throw new Error(
        insertError?.message ||
          "Unable to create column.",
      );
    }

    await updateFormulaReferencesForInsertedColumn(
      supabase,
      input.sheetId,
      organizationId,
      formulaOverlays,
      nextPosition + 1,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      column: insertedColumn,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create column.",
    };
  }
}


/* =========================================================
   FORMULA ENGINE V4.3b — COLUMN DELETE REFERENCE INTEGRITY
   ========================================================= */

function translateFormulaReferencesForDeletedColumn(
  formula: string,
  deletedColumnNumber: number,
) {
  if (
    !formula.trim().startsWith("=") ||
    !Number.isInteger(deletedColumnNumber) ||
    deletedColumnNumber < 1
  ) {
    return formula;
  }

  const translateSingleReference = (
    absoluteColumn: string,
    columnLetters: string,
    absoluteRow: string,
    rowDigits: string,
  ) => {
    const columnNumber =
      spreadsheetColumnLettersToNumber(columnLetters);

    if (columnNumber === null) {
      return `${absoluteColumn}${columnLetters}${absoluteRow}${rowDigits}`;
    }

    if (columnNumber === deletedColumnNumber) {
      return "#REF!";
    }

    if (columnNumber < deletedColumnNumber) {
      return `${absoluteColumn}${columnLetters}${absoluteRow}${rowDigits}`;
    }

    const nextColumnLetters =
      spreadsheetColumnNumberToLetters(columnNumber - 1);

    return nextColumnLetters
      ? `${absoluteColumn}${nextColumnLetters}${absoluteRow}${rowDigits}`
      : "#REF!";
  };

  /*
   * Handle ranges before standalone references so deleting one boundary of a
   * range shrinks the range instead of producing #REF!:X. Examples:
   * D1:E9 deleting D -> D1:D9 (old E becomes D)
   * D1:F9 deleting E -> D1:E9
   * D1:D9 deleting D -> #REF!
   */
  const withTranslatedRanges = formula.replace(
    /(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*):(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*)/g,
    (
      rangeReference,
      startAbsoluteColumn: string,
      startColumnLetters: string,
      startAbsoluteRow: string,
      startRowDigits: string,
      endAbsoluteColumn: string,
      endColumnLetters: string,
      endAbsoluteRow: string,
      endRowDigits: string,
    ) => {
      const startColumnNumber =
        spreadsheetColumnLettersToNumber(startColumnLetters);
      const endColumnNumber =
        spreadsheetColumnLettersToNumber(endColumnLetters);

      if (
        startColumnNumber === null ||
        endColumnNumber === null
      ) {
        return rangeReference;
      }

      const low = Math.min(startColumnNumber, endColumnNumber);
      const high = Math.max(startColumnNumber, endColumnNumber);

      if (
        deletedColumnNumber === low &&
        deletedColumnNumber === high
      ) {
        return "#REF!";
      }

      let nextStartColumnNumber = startColumnNumber;
      let nextEndColumnNumber = endColumnNumber;

      if (deletedColumnNumber < low) {
        nextStartColumnNumber -= 1;
        nextEndColumnNumber -= 1;
      } else if (deletedColumnNumber > high) {
        return rangeReference;
      } else if (startColumnNumber <= endColumnNumber) {
        if (deletedColumnNumber === startColumnNumber) {
          nextStartColumnNumber = startColumnNumber;
          nextEndColumnNumber = endColumnNumber - 1;
        } else {
          nextEndColumnNumber = endColumnNumber - 1;
        }
      } else {
        if (deletedColumnNumber === startColumnNumber) {
          nextStartColumnNumber = startColumnNumber - 1;
        } else {
          nextStartColumnNumber = startColumnNumber - 1;
        }

        if (deletedColumnNumber === endColumnNumber) {
          nextEndColumnNumber = endColumnNumber;
        }
      }

      const nextStartLetters =
        spreadsheetColumnNumberToLetters(nextStartColumnNumber);
      const nextEndLetters =
        spreadsheetColumnNumberToLetters(nextEndColumnNumber);

      if (!nextStartLetters || !nextEndLetters) {
        return "#REF!";
      }

      return `${startAbsoluteColumn}${nextStartLetters}${startAbsoluteRow}${startRowDigits}:${endAbsoluteColumn}${nextEndLetters}${endAbsoluteRow}${endRowDigits}`;
    },
  );

  return withTranslatedRanges.replace(
    /(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*)/g,
    (
      reference,
      absoluteColumn: string,
      columnLetters: string,
      absoluteRow: string,
      rowDigits: string,
      offset: number,
      wholeFormula: string,
    ) => {
      /* Do not re-translate references that are already part of a range. */
      const previousCharacter = wholeFormula[offset - 1] ?? "";
      const referenceEnd = offset + reference.length;
      const nextCharacter = wholeFormula[referenceEnd] ?? "";

      if (previousCharacter === ":" || nextCharacter === ":") {
        return reference;
      }

      return translateSingleReference(
        absoluteColumn,
        columnLetters,
        absoluteRow,
        rowDigits,
      );
    },
  );
}

async function updateFormulaReferencesForDeletedColumn(
  supabase: SupabaseServerClient,
  sheetId: string,
  organizationId: string,
  formulaOverlays: FormulaOverlayForRowInsert[],
  deletedColumnNumber: number,
) {
  for (const overlay of formulaOverlays) {
    const nextFormula =
      translateFormulaReferencesForDeletedColumn(
        overlay.formula,
        deletedColumnNumber,
      );

    if (nextFormula === overlay.formula) {
      continue;
    }

    const { error } = await supabase
      .from("smart_sheet_cells")
      .update({ value: nextFormula })
      .eq("id", overlay.id)
      .eq("smart_sheet_id", sheetId)
      .eq("organization_id", organizationId);

    if (error) {
      throw new Error(error.message);
    }
  }
}

/* =========================================================
   DELETE GENERIC SMART SHEET COLUMN
   ========================================================= */

export async function deleteSmartSheetColumn(
  input: DeleteSmartSheetColumnInput,
): Promise<DeleteSmartSheetColumnResult> {
  try {
    const {
      supabase,
      organizationId,
    } = await getAuthorizedContext(
      input.sheetId,
    );

    const columnKey =
      input.columnKey.trim();

    if (!columnKey) {
      throw new Error(
        "Column key is required.",
      );
    }

    const {
      data: column,
      error: columnError,
    } = await supabase
      .from("smart_sheet_columns")
      .select("id,column_key,is_system,position")
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "column_key",
        columnKey,
      )
      .maybeSingle();

    if (
      columnError ||
      !column
    ) {
      throw new Error(
        columnError?.message ||
          "Smart Sheet column not found.",
      );
    }

    if (column.is_system) {
      throw new Error(
        "System business columns are protected and cannot be deleted.",
      );
    }

    const formulaOverlays =
      await getFormulaOverlaysForRowInsert(
        supabase,
        input.sheetId,
        organizationId,
      );

    const deletedColumnNumber =
      Number(column.position) + 1;

    /*
     * A custom column owns only spreadsheet-layer content. Remove that content
     * explicitly before deleting its metadata. smart_sheet_rows and business
     * calculations are never touched.
     */
    for (const table of [
      "smart_sheet_cell_formats",
      "smart_sheet_cell_states",
      "smart_sheet_cells",
    ]) {
      const {
        error: cleanupError,
      } = await supabase
        .from(table)
        .delete()
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .eq(
          "column_key",
          columnKey,
        );

      if (cleanupError) {
        throw new Error(
          cleanupError.message,
        );
      }
    }

    const {
      error: deleteError,
    } = await supabase
      .from("smart_sheet_columns")
      .delete()
      .eq(
        "id",
        column.id,
      )
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      );

    if (deleteError) {
      throw new Error(
        deleteError.message,
      );
    }

    const {
      data: remainingColumns,
      error: remainingError,
    } = await supabase
      .from("smart_sheet_columns")
      .select("id")
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .order(
        "position",
        {
          ascending: true,
        },
      );

    if (remainingError) {
      throw new Error(
        remainingError.message,
      );
    }

    await updateFormulaReferencesForDeletedColumn(
      supabase,
      input.sheetId,
      organizationId,
      formulaOverlays,
      deletedColumnNumber,
    );

    for (
      let position = 0;
      position < (remainingColumns ?? []).length;
      position += 1
    ) {
      const remainingColumn =
        (remainingColumns ?? [])[position];

      const {
        error: normalizeError,
      } = await supabase
        .from("smart_sheet_columns")
        .update({
          position,
        })
        .eq(
          "id",
          remainingColumn.id,
        )
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        );

      if (normalizeError) {
        throw new Error(
          normalizeError.message,
        );
      }
    }

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      deletedColumnKey:
        columnKey,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to delete column.",
    };
  }
}


/* =========================================================
   RENAME GENERIC SMART SHEET COLUMN
   ========================================================= */

export async function renameSmartSheetColumn(
  input: RenameSmartSheetColumnInput,
): Promise<RenameSmartSheetColumnResult> {
  try {
    const {
      supabase,
      user,
      organizationId,
    } = await getAuthorizedContext(
      input.sheetId,
    );

    const label = input.label.trim();

    if (!label) {
      throw new Error(
        "Column name is required.",
      );
    }

    if (label.length > 80) {
      throw new Error(
        "Column name must be 80 characters or fewer.",
      );
    }

    const {
      data: column,
      error: columnError,
    } = await supabase
      .from("smart_sheet_columns")
      .select("id,is_system,column_key,label")
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "column_key",
        input.columnKey,
      )
      .maybeSingle();

    if (
      columnError ||
      !column
    ) {
      throw new Error(
        columnError?.message ||
          "Smart Sheet column not found.",
      );
    }

    if (column.is_system) {
      throw new Error(
        "System column renaming is not enabled yet.",
      );
    }

    const {
      data: updatedColumn,
      error: updateError,
    } = await supabase
      .from("smart_sheet_columns")
      .update({
        label,
        updated_by:
          user.id,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        column.id,
      )
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .select(`
        id,
        column_key,
        label,
        position,
        width,
        hidden,
        data_type,
        number_format,
        decimal_places,
        semantic_role,
        formula_definition,
        business_mapping,
        metadata,
        is_system
      `)
      .single();

    if (
      updateError ||
      !updatedColumn
    ) {
      throw new Error(
        updateError?.message ||
          "Column rename was not persisted.",
      );
    }

    if (
      updatedColumn.label !== label
    ) {
      throw new Error(
        "Column rename verification failed.",
      );
    }

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      column: updatedColumn,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to rename column.",
    };
  }
}


/* =========================================================
   PERSIST CUSTOM SMART SHEET COLUMN VISIBILITY
   ========================================================= */

export async function setSmartSheetColumnHidden(
  input: SetSmartSheetColumnHiddenInput,
): Promise<ActionResult> {
  try {
    const {
      supabase,
      user,
      organizationId,
    } = await getAuthorizedContext(
      input.sheetId,
    );

    const {
      data: column,
      error: columnError,
    } = await supabase
      .from("smart_sheet_columns")
      .select("id,is_system,column_key,hidden")
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "column_key",
        input.columnKey,
      )
      .maybeSingle();

    if (
      columnError ||
      !column
    ) {
      throw new Error(
        columnError?.message ||
          "Smart Sheet column not found.",
      );
    }

    /*
     * Persistent Hide/Show V1 is deliberately limited to custom columns.
     * Existing system-column hide/restore behavior remains untouched.
     */
    if (column.is_system) {
      throw new Error(
        "Persistent visibility is not enabled for system columns yet.",
      );
    }

    const {
      data: updatedColumn,
      error: updateError,
    } = await supabase
      .from("smart_sheet_columns")
      .update({
        hidden: input.hidden,
        updated_by:
          user.id,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        column.id,
      )
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .select("id,hidden")
      .single();

    if (
      updateError ||
      !updatedColumn
    ) {
      throw new Error(
        updateError?.message ||
          "Column visibility was not persisted.",
      );
    }

    if (
      updatedColumn.hidden !==
      input.hidden
    ) {
      throw new Error(
        "Column visibility verification failed.",
      );
    }

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update column visibility.",
    };
  }
}


/* =========================================================
   FORMULA ENGINE V4.3c — COLUMN REORDER REFERENCE INTEGRITY
   ========================================================= */

function translateFormulaReferencesForReorderedColumns(
  formula: string,
  oldOrderedColumnKeys: string[],
  newOrderedColumnKeys: string[],
) {
  if (!formula.trim().startsWith("=")) {
    return formula;
  }

  const newPositionByKey = new Map(
    newOrderedColumnKeys.map((key, index) => [key, index + 1]),
  );

  const translateSingleReference = (
    reference: string,
    absoluteColumn: string,
    columnLetters: string,
    absoluteRow: string,
    rowDigits: string,
  ) => {
    const oldColumnNumber =
      spreadsheetColumnLettersToNumber(columnLetters);

    if (
      oldColumnNumber === null ||
      oldColumnNumber < 1 ||
      oldColumnNumber > oldOrderedColumnKeys.length
    ) {
      return reference;
    }

    const columnKey =
      oldOrderedColumnKeys[oldColumnNumber - 1];

    const newColumnNumber =
      newPositionByKey.get(columnKey);

    if (!newColumnNumber) {
      return reference;
    }

    const nextLetters =
      spreadsheetColumnNumberToLetters(newColumnNumber);

    return nextLetters
      ? `${absoluteColumn}${nextLetters}${absoluteRow}${rowDigits}`
      : reference;
  };

  /*
   * Ranges are structural sets of logical columns, not two unrelated endpoint
   * references. Translate the whole range first so reordering columns inside a
   * range does not collapse or reverse it. If the same logical member columns
   * remain contiguous after the reorder, serialize their new bounding letters.
   * Example: D1:F1 with [Cost, Item, W/T], moving Cost from D -> F remains
   * D1:F1 because the same three logical columns still occupy D:F.
   */
  const withTranslatedRanges = formula.replace(
    /(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*):(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*)/g,
    (
      rangeReference,
      startAbsoluteColumn: string,
      startColumnLetters: string,
      startAbsoluteRow: string,
      startRowDigits: string,
      endAbsoluteColumn: string,
      endColumnLetters: string,
      endAbsoluteRow: string,
      endRowDigits: string,
    ) => {
      const startColumnNumber =
        spreadsheetColumnLettersToNumber(startColumnLetters);
      const endColumnNumber =
        spreadsheetColumnLettersToNumber(endColumnLetters);

      if (
        startColumnNumber === null ||
        endColumnNumber === null ||
        startColumnNumber < 1 ||
        endColumnNumber < 1 ||
        startColumnNumber > oldOrderedColumnKeys.length ||
        endColumnNumber > oldOrderedColumnKeys.length
      ) {
        return rangeReference;
      }

      const low = Math.min(startColumnNumber, endColumnNumber);
      const high = Math.max(startColumnNumber, endColumnNumber);

      const logicalRangeKeys =
        oldOrderedColumnKeys.slice(low - 1, high);

      const mappedPositions = logicalRangeKeys
        .map((key) => newPositionByKey.get(key) ?? null);

      if (mappedPositions.some((position) => position === null)) {
        return rangeReference;
      }

      const numericPositions = mappedPositions as number[];
      const uniquePositions = new Set(numericPositions);
      const nextLow = Math.min(...numericPositions);
      const nextHigh = Math.max(...numericPositions);

      const remainsContiguous =
        uniquePositions.size === numericPositions.length &&
        nextHigh - nextLow + 1 === numericPositions.length;

      if (!remainsContiguous) {
        /*
         * A single A1 range cannot exactly represent a now-discontiguous logical
         * set. Keep the established endpoint-identity behavior for that advanced
         * case rather than silently widening the range to unrelated columns.
         */
        const translatedStart = translateSingleReference(
          `${startAbsoluteColumn}${startColumnLetters}${startAbsoluteRow}${startRowDigits}`,
          startAbsoluteColumn,
          startColumnLetters,
          startAbsoluteRow,
          startRowDigits,
        );
        const translatedEnd = translateSingleReference(
          `${endAbsoluteColumn}${endColumnLetters}${endAbsoluteRow}${endRowDigits}`,
          endAbsoluteColumn,
          endColumnLetters,
          endAbsoluteRow,
          endRowDigits,
        );

        return `${translatedStart}:${translatedEnd}`;
      }

      const forward = startColumnNumber <= endColumnNumber;
      const nextStartNumber = forward ? nextLow : nextHigh;
      const nextEndNumber = forward ? nextHigh : nextLow;

      const nextStartLetters =
        spreadsheetColumnNumberToLetters(nextStartNumber);
      const nextEndLetters =
        spreadsheetColumnNumberToLetters(nextEndNumber);

      if (!nextStartLetters || !nextEndLetters) {
        return rangeReference;
      }

      return `${startAbsoluteColumn}${nextStartLetters}${startAbsoluteRow}${startRowDigits}:${endAbsoluteColumn}${nextEndLetters}${endAbsoluteRow}${endRowDigits}`;
    },
  );

  return withTranslatedRanges.replace(
    /(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*)/g,
    (
      reference,
      absoluteColumn: string,
      columnLetters: string,
      absoluteRow: string,
      rowDigits: string,
      offset: number,
      wholeFormula: string,
    ) => {
      const previousCharacter = wholeFormula[offset - 1] ?? "";
      const referenceEnd = offset + reference.length;
      const nextCharacter = wholeFormula[referenceEnd] ?? "";

      if (previousCharacter === ":" || nextCharacter === ":") {
        return reference;
      }

      return translateSingleReference(
        reference,
        absoluteColumn,
        columnLetters,
        absoluteRow,
        rowDigits,
      );
    },
  );
}

async function updateFormulaReferencesForReorderedColumns(
  supabase: SupabaseServerClient,
  sheetId: string,
  organizationId: string,
  formulaOverlays: FormulaOverlayForRowInsert[],
  oldOrderedColumnKeys: string[],
  newOrderedColumnKeys: string[],
) {
  for (const overlay of formulaOverlays) {
    const nextFormula =
      translateFormulaReferencesForReorderedColumns(
        overlay.formula,
        oldOrderedColumnKeys,
        newOrderedColumnKeys,
      );

    if (nextFormula === overlay.formula) {
      continue;
    }

    const { error } = await supabase
      .from("smart_sheet_cells")
      .update({ value: nextFormula })
      .eq("id", overlay.id)
      .eq("smart_sheet_id", sheetId)
      .eq("organization_id", organizationId);

    if (error) {
      throw new Error(error.message);
    }
  }
}


/* =========================================================
   PERSIST SMART SHEET COLUMN ORDER
   ========================================================= */

export async function reorderSmartSheetColumns(
  input: ReorderSmartSheetColumnsInput,
): Promise<ActionResult> {
  try {
    const {
      supabase,
      user,
      organizationId,
    } = await getAuthorizedContext(
      input.sheetId,
    );

    const orderedColumnKeys =
      input.orderedColumnKeys.map(
        (key) => key.trim(),
      );

    if (
      orderedColumnKeys.length === 0
    ) {
      throw new Error(
        "Column order is required.",
      );
    }

    const uniqueKeys =
      new Set(orderedColumnKeys);

    if (
      uniqueKeys.size !==
      orderedColumnKeys.length
    ) {
      throw new Error(
        "Column order contains duplicate columns.",
      );
    }

    const {
      data: existingColumns,
      error: existingColumnsError,
    } = await supabase
      .from("smart_sheet_columns")
      .select("id,column_key,position")
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .order(
        "position",
        {
          ascending: true,
        },
      );

    if (existingColumnsError) {
      throw new Error(
        existingColumnsError.message,
      );
    }

    const existingKeys =
      (existingColumns ?? []).map(
        (column) =>
          String(column.column_key),
      );

    const formulaOverlays =
      await getFormulaOverlaysForRowInsert(
        supabase,
        input.sheetId,
        organizationId,
      );

    if (
      existingKeys.length !==
      orderedColumnKeys.length
    ) {
      throw new Error(
        "Column order is incomplete.",
      );
    }

    const existingKeySet =
      new Set(existingKeys);

    for (const key of orderedColumnKeys) {
      if (!existingKeySet.has(key)) {
        throw new Error(
          `Unknown Smart Sheet column: ${key}`,
        );
      }
    }

    const idByKey =
      new Map(
        (existingColumns ?? []).map(
          (column) => [
            String(column.column_key),
            String(column.id),
          ],
        ),
      );

    /*
     * Position is intentionally not unique in the database, so each column can
     * be updated directly to its final zero-based position without temporary
     * sentinel positions or identity changes.
     */
    for (
      let position = 0;
      position < orderedColumnKeys.length;
      position += 1
    ) {
      const columnKey =
        orderedColumnKeys[position];

      const columnId =
        idByKey.get(columnKey);

      if (!columnId) {
        throw new Error(
          `Smart Sheet column not found: ${columnKey}`,
        );
      }

      const {
        error: updateError,
      } = await supabase
        .from("smart_sheet_columns")
        .update({
          position,
          updated_by:
            user.id,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          columnId,
        )
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        );

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }
    }

    const {
      data: verificationColumns,
      error: verificationError,
    } = await supabase
      .from("smart_sheet_columns")
      .select("column_key,position")
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .order(
        "position",
        {
          ascending: true,
        },
      );

    if (verificationError) {
      throw new Error(
        verificationError.message,
      );
    }

    const verifiedOrder =
      (verificationColumns ?? []).map(
        (column) =>
          String(column.column_key),
      );

    if (
      verifiedOrder.length !==
        orderedColumnKeys.length ||
      verifiedOrder.some(
        (key, index) =>
          key !== orderedColumnKeys[index],
      )
    ) {
      throw new Error(
        "Column order verification failed.",
      );
    }

    await updateFormulaReferencesForReorderedColumns(
      supabase,
      input.sheetId,
      organizationId,
      formulaOverlays,
      existingKeys,
      orderedColumnKeys,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to reorder Smart Sheet columns.",
    };
  }
}


/* =========================================================
   PERSIST SMART SHEET COLUMN WIDTHS
   ========================================================= */

export async function setSmartSheetColumnWidths(
  input: SetSmartSheetColumnWidthsInput,
): Promise<ActionResult> {
  try {
    const {
      supabase,
      user,
      organizationId,
    } = await getAuthorizedContext(
      input.sheetId,
    );

    if (
      !Array.isArray(input.columns) ||
      input.columns.length === 0
    ) {
      throw new Error(
        "At least one column width is required.",
      );
    }

    const normalizedColumns =
      input.columns.map((column) => ({
        columnKey:
          column.columnKey.trim(),
        width:
          Math.round(column.width),
      }));

    const uniqueKeys =
      new Set(
        normalizedColumns.map(
          (column) =>
            column.columnKey,
        ),
      );

    if (
      uniqueKeys.size !==
      normalizedColumns.length
    ) {
      throw new Error(
        "Column width update contains duplicate columns.",
      );
    }

    for (const column of normalizedColumns) {
      if (!column.columnKey) {
        throw new Error(
          "Column key is required.",
        );
      }

      if (
        !Number.isFinite(
          column.width,
        ) ||
        column.width < 54 ||
        column.width > 420
      ) {
        throw new Error(
          "Column width must be between 54 and 420 pixels.",
        );
      }
    }

    const requestedKeys =
      normalizedColumns.map(
        (column) =>
          column.columnKey,
      );

    const {
      data: existingColumns,
      error: existingColumnsError,
    } = await supabase
      .from("smart_sheet_columns")
      .select("id,column_key")
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .in(
        "column_key",
        requestedKeys,
      );

    if (existingColumnsError) {
      throw new Error(
        existingColumnsError.message,
      );
    }

    if (
      (existingColumns ?? []).length !==
      normalizedColumns.length
    ) {
      throw new Error(
        "One or more Smart Sheet columns were not found.",
      );
    }

    const idByKey =
      new Map(
        (existingColumns ?? []).map(
          (column) => [
            String(column.column_key),
            String(column.id),
          ],
        ),
      );

    for (const column of normalizedColumns) {
      const columnId =
        idByKey.get(
          column.columnKey,
        );

      if (!columnId) {
        throw new Error(
          `Smart Sheet column not found: ${column.columnKey}`,
        );
      }

      const {
        error: updateError,
      } = await supabase
        .from("smart_sheet_columns")
        .update({
          width:
            column.width,
          updated_by:
            user.id,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          columnId,
        )
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        );

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }
    }

    const {
      data: verificationColumns,
      error: verificationError,
    } = await supabase
      .from("smart_sheet_columns")
      .select("column_key,width")
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .in(
        "column_key",
        requestedKeys,
      );

    if (verificationError) {
      throw new Error(
        verificationError.message,
      );
    }

    const verifiedWidthByKey =
      new Map(
        (verificationColumns ?? []).map(
          (column) => [
            String(column.column_key),
            Number(column.width),
          ],
        ),
      );

    for (const column of normalizedColumns) {
      if (
        verifiedWidthByKey.get(
          column.columnKey,
        ) !== column.width
      ) {
        throw new Error(
          `Column width verification failed: ${column.columnKey}`,
        );
      }
    }

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to persist Smart Sheet column widths.",
    };
  }
}


/* =========================================================
   PERSIST CUSTOM COLUMN TYPE / NUMBER FORMAT
   ========================================================= */

export async function setSmartSheetColumnPresentation(
  input: SetSmartSheetColumnPresentationInput,
): Promise<SetSmartSheetColumnPresentationResult> {
  try {
    const {
      supabase,
      user,
      organizationId,
    } = await getAuthorizedContext(
      input.sheetId,
    );

    const columnKey =
      input.columnKey.trim();

    if (!columnKey) {
      throw new Error(
        "Column key is required.",
      );
    }

    const allowedPresentations =
      new Set([
        "text",
        "number",
        "currency",
        "percentage",
        "date",
        "datetime",
        "time",
        "boolean",
      ]);

    if (
      !allowedPresentations.has(
        input.presentation,
      )
    ) {
      throw new Error(
        "Unsupported column type.",
      );
    }

    const {
      data: column,
      error: columnError,
    } = await supabase
      .from("smart_sheet_columns")
      .select(
        "id,column_key,is_system,data_type,number_format,decimal_places",
      )
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "column_key",
        columnKey,
      )
      .maybeSingle();

    if (
      columnError ||
      !column
    ) {
      throw new Error(
        columnError?.message ||
          "Smart Sheet column not found.",
      );
    }

    /*
     * V1 deliberately changes presentation metadata only for custom columns.
     * System columns still participate in SAMZY's pricing / business engine,
     * so their semantic behavior remains protected in this step.
     */
    if (column.is_system) {
      throw new Error(
        "Column type changes are currently available for custom columns only.",
      );
    }

    const numberFormat =
      input.presentation === "number" ||
      input.presentation === "currency" ||
      input.presentation === "percentage"
        ? input.presentation
        : null;

    const {
      data: updatedColumn,
      error: updateError,
    } = await supabase
      .from("smart_sheet_columns")
      .update({
        data_type:
          input.presentation,
        number_format:
          numberFormat,
        updated_by:
          user.id,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        column.id,
      )
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .select(
        "id,column_key,data_type,number_format,decimal_places,is_system",
      )
      .single();

    if (
      updateError ||
      !updatedColumn
    ) {
      throw new Error(
        updateError?.message ||
          "Column type was not persisted.",
      );
    }

    if (
      updatedColumn.data_type !==
        input.presentation ||
      updatedColumn.number_format !==
        numberFormat
    ) {
      throw new Error(
        "Column type verification failed.",
      );
    }

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      column:
        updatedColumn,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update column type.",
    };
  }
}


/* =========================================================
   PERSIST CUSTOM COLUMN LIST VALIDATION / DROPDOWN
   ========================================================= */

export async function setSmartSheetColumnListValidation(
  input: SetSmartSheetColumnListValidationInput,
): Promise<SetSmartSheetColumnListValidationResult> {
  try {
    const {
      supabase,
      user,
      organizationId,
    } = await getAuthorizedContext(
      input.sheetId,
    );

    const columnKey =
      input.columnKey.trim();

    if (!columnKey) {
      throw new Error(
        "Column key is required.",
      );
    }

    const normalizedValues =
      Array.from(
        new Set(
          input.values
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        ),
      );

    if (normalizedValues.length > 200) {
      throw new Error(
        "A dropdown can contain up to 200 values.",
      );
    }

    if (
      normalizedValues.some(
        (value) => value.length > 120,
      )
    ) {
      throw new Error(
        "Each dropdown value must be 120 characters or fewer.",
      );
    }

    const {
      data: column,
      error: columnError,
    } = await supabase
      .from("smart_sheet_columns")
      .select(
        "id,column_key,is_system,data_type,metadata",
      )
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "column_key",
        columnKey,
      )
      .maybeSingle();

    if (
      columnError ||
      !column
    ) {
      throw new Error(
        columnError?.message ||
          "Smart Sheet column not found.",
      );
    }

    if (column.is_system) {
      throw new Error(
        "Dropdown validation is currently available for custom columns only.",
      );
    }

    if (column.data_type !== "text") {
      throw new Error(
        "Dropdown validation V1 is available for Text / General custom columns.",
      );
    }

    const currentMetadata =
      column.metadata &&
      typeof column.metadata === "object" &&
      !Array.isArray(column.metadata)
        ? {
            ...(column.metadata as Record<string, unknown>),
          }
        : {};

    if (normalizedValues.length > 0) {
      currentMetadata.validation = {
        type: "list",
        values: normalizedValues,
      };
    } else {
      delete currentMetadata.validation;
    }

    const {
      data: updatedColumn,
      error: updateError,
    } = await supabase
      .from("smart_sheet_columns")
      .update({
        metadata: currentMetadata,
        updated_by: user.id,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        column.id,
      )
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .select(
        "id,column_key,metadata,is_system",
      )
      .single();

    if (
      updateError ||
      !updatedColumn
    ) {
      throw new Error(
        updateError?.message ||
          "Dropdown validation was not persisted.",
      );
    }

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      column: updatedColumn,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update dropdown validation.",
    };
  }
}


/* =========================================================
   PERSIST CUSTOM COLUMN SEMANTIC MAPPING
   ========================================================= */

export async function setSmartSheetColumnSemanticMapping(
  input: SetSmartSheetColumnSemanticMappingInput,
): Promise<SetSmartSheetColumnSemanticMappingResult> {
  try {
    const { supabase, user, organizationId } =
      await getAuthorizedContext(input.sheetId);

    const columnKey = input.columnKey.trim();
    if (!columnKey) {
      throw new Error("Column key is required.");
    }

    const semanticRole =
      input.semanticRole === null
        ? null
        : input.semanticRole.trim();

    if (semanticRole && semanticRole.length > 120) {
      throw new Error(
        "Semantic role must be 120 characters or fewer.",
      );
    }

    const semanticResolution =
      semanticRole
        ? resolveSmartSheetSemanticRole(semanticRole)
        : null;

    const canonicalRole =
      semanticResolution?.canonicalRole ?? null;

    if (semanticRole && !canonicalRole) {
      throw new Error(
        "Semantic role must contain at least one letter or number.",
      );
    }

    const { data: column, error: columnError } =
      await supabase
        .from("smart_sheet_columns")
        .select(
          "id,column_key,is_system,semantic_role,business_mapping",
        )
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId)
        .eq("column_key", columnKey)
        .maybeSingle();

    if (columnError || !column) {
      throw new Error(
        columnError?.message || "Smart Sheet column not found.",
      );
    }

    /*
     * V4.10d remains metadata-only and custom-column-only.
     * It teaches SAMZY what a free spreadsheet column means without
     * changing the column's values, formulas, presentation, or business
     * calculations.
     */
    if (column.is_system) {
      throw new Error(
        "Semantic mapping V1 is currently available for custom columns only.",
      );
    }

    const currentBusinessMapping =
      column.business_mapping &&
      typeof column.business_mapping === "object" &&
      !Array.isArray(column.business_mapping)
        ? {
            ...(column.business_mapping as Record<string, unknown>),
          }
        : {};

    if (semanticRole && canonicalRole) {
      currentBusinessMapping.semantic_role = semanticRole;
      currentBusinessMapping.normalized_role =
        semanticResolution?.normalizedRole ?? canonicalRole;
      currentBusinessMapping.canonical_role = canonicalRole;
      currentBusinessMapping.recognition =
        semanticResolution?.recognized ? "alias" : "custom";
      currentBusinessMapping.recognized_language =
        semanticResolution?.recognizedLanguage ?? null;
      currentBusinessMapping.recognition_source =
        semanticResolution?.recognitionSource ?? "custom";
      currentBusinessMapping.recognition_confidence =
        semanticResolution?.recognitionConfidence ?? null;
      currentBusinessMapping.source = "manual";
      currentBusinessMapping.semantic_mapping_version = 3;
    } else {
      delete currentBusinessMapping.semantic_role;
      delete currentBusinessMapping.normalized_role;
      delete currentBusinessMapping.canonical_role;
      delete currentBusinessMapping.recognition;
      delete currentBusinessMapping.recognized_language;
      delete currentBusinessMapping.recognition_source;
      delete currentBusinessMapping.recognition_confidence;
      delete currentBusinessMapping.source;
      delete currentBusinessMapping.semantic_mapping_version;
    }

    const businessMapping =
      Object.keys(currentBusinessMapping).length > 0
        ? currentBusinessMapping
        : null;

    const { data: updatedColumn, error: updateError } =
      await supabase
        .from("smart_sheet_columns")
        .update({
          semantic_role: semanticRole || null,
          business_mapping: businessMapping,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", column.id)
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId)
        .select(
          "id,column_key,semantic_role,business_mapping,is_system",
        )
        .single();

    if (updateError || !updatedColumn) {
      throw new Error(
        updateError?.message || "Semantic mapping was not persisted.",
      );
    }

    const persistedBusinessMapping =
      updatedColumn.business_mapping &&
      typeof updatedColumn.business_mapping === "object" &&
      !Array.isArray(updatedColumn.business_mapping)
        ? updatedColumn.business_mapping as Record<string, unknown>
        : null;

    if (
      updatedColumn.semantic_role !==
        (semanticRole || null) ||
      (
        canonicalRole !== null &&
        persistedBusinessMapping?.canonical_role !==
          canonicalRole
      ) ||
      (
        canonicalRole === null &&
        persistedBusinessMapping?.canonical_role !==
          undefined
      )
    ) {
      throw new Error(
        "Semantic mapping verification failed.",
      );
    }

    revalidateSmartSheet(input.sheetId);

    return {
      ok: true,
      column: updatedColumn,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update semantic mapping.",
    };
  }
}


/* =========================================================
   PERSIST CUSTOM COLUMN CONDITIONAL FORMATTING
   ========================================================= */

export async function setSmartSheetColumnConditionalFormatting(
  input: SetSmartSheetColumnConditionalFormattingInput,
): Promise<SetSmartSheetColumnConditionalFormattingResult> {
  try {
    const { supabase, user, organizationId } =
      await getAuthorizedContext(input.sheetId);

    const columnKey = input.columnKey.trim();
    if (!columnKey) {
      throw new Error("Column key is required.");
    }

    const { data: column, error: columnError } =
      await supabase
        .from("smart_sheet_columns")
        .select("id,column_key,is_system,metadata")
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId)
        .eq("column_key", columnKey)
        .maybeSingle();

    if (columnError || !column) {
      throw new Error(
        columnError?.message || "Smart Sheet column not found.",
      );
    }

    if (column.is_system) {
      throw new Error(
        "Conditional formatting V1 is currently available for custom columns only.",
      );
    }

    const currentMetadata =
      column.metadata &&
      typeof column.metadata === "object" &&
      !Array.isArray(column.metadata)
        ? { ...(column.metadata as Record<string, unknown>) }
        : {};

    if (input.rule) {
      const allowedOperators =
        new Set(["equals", "contains", "gt", "lt"]);
      if (!allowedOperators.has(input.rule.operator)) {
        throw new Error("Unsupported conditional formatting operator.");
      }

      const value = input.rule.value.trim();
      if (!value) {
        throw new Error("Conditional formatting value is required.");
      }

      const colorPattern = /^#[0-9a-fA-F]{6}$/;
      if (!colorPattern.test(input.rule.fillColor) || !colorPattern.test(input.rule.textColor)) {
        throw new Error("Conditional formatting colors are invalid.");
      }

      currentMetadata.conditional_format = {
        operator: input.rule.operator,
        value,
        fillColor: input.rule.fillColor,
        textColor: input.rule.textColor,
      };
    } else {
      delete currentMetadata.conditional_format;
    }

    const { data: updatedColumn, error: updateError } =
      await supabase
        .from("smart_sheet_columns")
        .update({
          metadata: currentMetadata,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", column.id)
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId)
        .select("id,column_key,metadata,is_system")
        .single();

    if (updateError || !updatedColumn) {
      throw new Error(
        updateError?.message || "Conditional formatting was not persisted.",
      );
    }

    revalidateSmartSheet(input.sheetId);

    return { ok: true, column: updatedColumn };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update conditional formatting.",
    };
  }
}


/* =========================================================
   PERSIST CUSTOM COLUMN DECIMAL PLACES
   ========================================================= */

export async function setSmartSheetColumnDecimalPlaces(
  input: SetSmartSheetColumnDecimalPlacesInput,
): Promise<SetSmartSheetColumnDecimalPlacesResult> {
  try {
    const {
      supabase,
      user,
      organizationId,
    } = await getAuthorizedContext(
      input.sheetId,
    );

    const columnKey =
      input.columnKey.trim();

    if (!columnKey) {
      throw new Error(
        "Column key is required.",
      );
    }

    if (
      !Number.isInteger(
        input.decimalPlaces,
      ) ||
      input.decimalPlaces < 0 ||
      input.decimalPlaces > 6
    ) {
      throw new Error(
        "Decimal places must be a whole number between 0 and 6.",
      );
    }

    const {
      data: column,
      error: columnError,
    } = await supabase
      .from("smart_sheet_columns")
      .select(
        "id,column_key,is_system,data_type,number_format,decimal_places",
      )
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "column_key",
        columnKey,
      )
      .maybeSingle();

    if (
      columnError ||
      !column
    ) {
      throw new Error(
        columnError?.message ||
          "Smart Sheet column not found.",
      );
    }

    if (column.is_system) {
      throw new Error(
        "Column decimal places are currently available for custom columns only.",
      );
    }

    if (
      column.data_type !== "number" &&
      column.data_type !== "currency" &&
      column.data_type !== "percentage"
    ) {
      throw new Error(
        "Decimal places require a Number, Currency, or Percentage column.",
      );
    }

    const numberFormat =
      column.data_type;

    const {
      data: updatedColumn,
      error: updateError,
    } = await supabase
      .from("smart_sheet_columns")
      .update({
        number_format:
          numberFormat,
        decimal_places:
          input.decimalPlaces,
        updated_by:
          user.id,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        column.id,
      )
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .select(
        "id,column_key,data_type,number_format,decimal_places,is_system",
      )
      .single();

    if (
      updateError ||
      !updatedColumn
    ) {
      throw new Error(
        updateError?.message ||
          "Column decimal places were not persisted.",
      );
    }

    if (
      updatedColumn.decimal_places !==
        input.decimalPlaces ||
      updatedColumn.number_format !==
        numberFormat
    ) {
      throw new Error(
        "Column decimal-place verification failed.",
      );
    }

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      column:
        updatedColumn,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update column decimal places.",
    };
  }
}


/* =========================================================
   UPDATE CELL
   ========================================================= */

export async function updateSmartSheetCell(
  input: UpdateCellInput,
): Promise<ActionResult> {
  try {
    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    await verifyRow(
      supabase,
      input.sheetId,
      input.rowId,
      organizationId,
    );

    const historyBefore = await captureSmartSheetHistorySnapshot(
      supabase, input.sheetId, organizationId, [input.rowId],
    );

    const columnKey =
      input.columnKey;

    /* =====================================================
       SPREADSHEET OVERLAY CELL
       =====================================================
       A Shift Left overlay is spreadsheet content, not the
       semantic business field underneath it.

       Editing an overlay therefore updates smart_sheet_cells
       ONLY. We deliberately do not:
       - update smart_sheet_rows
       - change business cell state / driver
       - recalculate the row
       - recalculate the sheet

       This keeps Excel-style freedom at the presentation layer
       while protecting SAMZY's calculation model.
       ===================================================== */

    const {
      data: existingOverlay,
      error: overlayReadError,
    } = await supabase
      .from("smart_sheet_cells")
      .select("id,is_blank,value")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .eq("row_id", input.rowId)
      .eq("column_key", columnKey)
      .maybeSingle();

    if (overlayReadError) {
      throw new Error(
        overlayReadError.message,
      );
    }

    if (existingOverlay) {
      const isBlank =
        input.value === null ||
        input.value === "";

      const overlayValue =
        isBlank
          ? null
          : input.value;

      const {
        error: overlayUpdateError,
      } = await supabase
        .from("smart_sheet_cells")
        .update({
          value:
            overlayValue,
          is_blank:
            isBlank,
          source:
            "user",
        })
        .eq(
          "id",
          existingOverlay.id,
        )
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        );

      if (overlayUpdateError) {
        throw new Error(
          overlayUpdateError.message,
        );
      }

      await recordSmartSheetHistory(
        supabase,
        input.sheetId,
        organizationId,
        "edit",
        `Edit spreadsheet cell ${columnKey}`,
        historyBefore,
      );

      revalidateSmartSheet(
        input.sheetId,
      );

      return {
        ok: true,
      };
    }

    /*
     * Generic custom columns are spreadsheet structure, not business fields.
     * Their values live only in smart_sheet_cells. No smart_sheet_rows field,
     * pricing driver, business cell state, row calculation, or sheet total is
     * changed by editing one of these cells.
     */
    const {
      data: dynamicColumn,
      error: dynamicColumnError,
    } = await supabase
      .from("smart_sheet_columns")
      .select("id,is_system")
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "column_key",
        columnKey,
      )
      .maybeSingle();

    if (dynamicColumnError) {
      throw new Error(
        dynamicColumnError.message,
      );
    }

    if (
      dynamicColumn &&
      !dynamicColumn.is_system
    ) {
      const isBlank =
        input.value === null ||
        input.value === "";

      const {
        error: customCellInsertError,
      } = await supabase
        .from("smart_sheet_cells")
        .insert({
          organization_id:
            organizationId,
          smart_sheet_id:
            input.sheetId,
          row_id:
            input.rowId,
          column_key:
            columnKey,
          value:
            isBlank
              ? null
              : input.value,
          is_blank:
            isBlank,
          source:
            "user",
          source_column_key:
            null,
          source_row_id:
            null,
        });

      if (customCellInsertError) {
        throw new Error(
          customCellInsertError.message,
        );
      }

      await recordSmartSheetHistory(
        supabase,
        input.sheetId,
        organizationId,
        "edit",
        `Edit custom spreadsheet cell ${columnKey}`,
        historyBefore,
      );

      revalidateSmartSheet(
        input.sheetId,
      );

      return {
        ok: true,
      };
    }

    const isText =
      textColumns.has(
        columnKey,
      );

    const isNumericInput =
      numericInputColumns.has(
        columnKey,
      );

    const isCalculated =
      calculatedNumericColumns.has(
        columnKey,
      );

    if (
      !isText &&
      !isNumericInput &&
      !isCalculated
    ) {
      throw new Error(
        "This Smart Sheet column cannot be edited.",
      );
    }

    /* =====================================================
       TEXT CELL
       ===================================================== */

    if (isText) {
      const textValue =
        input.value === null
          ? null
          : String(
              input.value,
            );

      const { error } =
        await supabase
          .from(
            "smart_sheet_rows",
          )
          .update({
            [columnKey]:
              textValue,
          })
          .eq(
            "id",
            input.rowId,
          )
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      await upsertCellMode({
        supabase,
        organizationId,
        sheetId:
          input.sheetId,
        rowId:
          input.rowId,
        columnKey,
        mode: "manual",
      });

      await recordSmartSheetHistory(
        supabase, input.sheetId, organizationId, "edit", `Edit ${columnKey}`, historyBefore,
      );

      revalidateSmartSheet(
        input.sheetId,
      );

      return {
        ok: true,
      };
    }

    /* =====================================================
       NUMERIC CELL
       ===================================================== */

    if (
      input.value === null ||
      input.value === ""
    ) {
      throw new Error(
        "Enter a numeric value.",
      );
    }

    const numericValue =
      Number(
        input.value,
      );

    if (
      !Number.isFinite(
        numericValue,
      )
    ) {
      throw new Error(
        "Enter a valid numeric value.",
      );
    }

    if (
      columnKey ===
        "quantity" &&
      numericValue < 0
    ) {
      throw new Error(
        "Quantity cannot be negative.",
      );
    }

    if (
      (
        columnKey ===
          "vat_rate" ||
        columnKey ===
          "transport_rate"
      ) &&
      numericValue < 0
    ) {
      throw new Error(
        "Percentage cannot be negative.",
      );
    }

    const rowPatch: Record<
      string,
      unknown
    > = {
      [columnKey]:
        numericValue,
    };

    const driverRule =
      pricingDriverMap[
        columnKey
      ];

    if (driverRule) {
      rowPatch[
        driverRule.driverColumn
      ] =
        driverRule.driver;
    }

    const { error } =
      await supabase
        .from(
          "smart_sheet_rows",
        )
        .update(rowPatch)
        .eq(
          "id",
          input.rowId,
        )
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    /*
     * Edited cell becomes MANUAL.
     */
    await upsertNumericCellState({
      supabase,
      organizationId,
      sheetId:
        input.sheetId,
      rowId:
        input.rowId,
      columnKey,
      value:
        numericValue,
      mode: "manual",
    });

    /*
     * Opposite price/markup cell
     * becomes CALCULATED.
     */
    const pairedColumn =
      pairedPricingColumnMap[
        columnKey
      ];

    if (pairedColumn) {
      await resetPairedPricingCell({
        supabase,
        organizationId,
        sheetId:
          input.sheetId,
        rowId:
          input.rowId,
        columnKey:
          pairedColumn,
      });
    }

    await recalculateRow(
      supabase,
      input.rowId,
    );

    await recalculateSheet(
      supabase,
      input.sheetId,
    );

    await recordSmartSheetHistory(
      supabase, input.sheetId, organizationId, "edit", `Edit ${columnKey}`, historyBefore,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,

      message:
        error instanceof Error
          ? error.message
          : "Unable to update Smart Sheet cell.",
    };
  }
}



/* =========================================================
   BATCH / MULTI-CELL PASTE
   ========================================================= */

export async function pasteSmartSheetCells(
  input: BatchPasteInput,
): Promise<ActionResult> {
  try {
    if (
      !Array.isArray(input.cells) ||
      input.cells.length === 0
    ) {
      throw new Error(
        "No cells were provided for paste.",
      );
    }

    /*
     * Keep a reasonable server-side ceiling so a malformed
     * clipboard payload cannot create an unbounded request.
     */
    if (input.cells.length > 1000) {
      throw new Error(
        "Paste is limited to 1,000 cells at a time.",
      );
    }

    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    /*
     * Authorize every destination row once, then reuse the
     * verified row data while applying the paste.
     */
    const uniqueRowIds =
      Array.from(
        new Set(
          input.cells.map(
            (cell) => cell.rowId,
          ),
        ),
      );

    const verifiedRows =
      new Map<
        string,
        Record<string, unknown>
      >();

    for (const rowId of uniqueRowIds) {
      const row =
        await verifyRow(
          supabase,
          input.sheetId,
          rowId,
          organizationId,
        );

      verifiedRows.set(
        rowId,
        row as Record<
          string,
          unknown
        >,
      );
    }

    const historyBefore = await captureSmartSheetHistorySnapshot(
      supabase, input.sheetId, organizationId, uniqueRowIds,
    );

    /*
     * Overlay-aware paste:
     * existing smart_sheet_cells represent the visual spreadsheet layer.
     * Pasting into one of those cells must update the overlay, not the hidden
     * semantic business field underneath it.
     */
    const {
      data: destinationOverlays,
      error: destinationOverlaysError,
    } = await supabase
      .from("smart_sheet_cells")
      .select("id,row_id,column_key")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .in("row_id", uniqueRowIds);

    if (destinationOverlaysError) {
      throw new Error(destinationOverlaysError.message);
    }

    const destinationOverlayMap =
      new Map<
        string,
        { id: string }
      >(
        (destinationOverlays ?? []).map(
          (overlay) => [
            `${overlay.row_id}:${overlay.column_key}`,
            { id: String(overlay.id) },
          ],
        ),
      );

    /*
     * Generic custom columns are spreadsheet-only destinations.
     * A blank custom cell has no smart_sheet_cells row yet, so paste must
     * recognize the column metadata and create the overlay instead of
     * falling through to the legacy business-column compatibility checks.
     */
    const {
      data: customPasteColumns,
      error: customPasteColumnsError,
    } = await supabase
      .from("smart_sheet_columns")
      .select("column_key")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .eq("is_system", false);

    if (customPasteColumnsError) {
      throw new Error(customPasteColumnsError.message);
    }

    const customPasteColumnKeys = new Set(
      (customPasteColumns ?? []).map((column) =>
        String(column.column_key),
      ),
    );

    const affectedRowIds =
      new Set<string>();

    const explicitFormulaOverrides: Array<{
      rowId: string;
      columnKey: string;
      value: number;
    }> = [];

    let pastedCount = 0;
    let skippedCount = 0;

    for (const cell of input.cells) {
      const columnKey =
        cell.columnKey;

      const row =
        verifiedRows.get(
          cell.rowId,
        );

      if (!row) {
        skippedCount += 1;
        continue;
      }

      const destinationOverlay =
        destinationOverlayMap.get(
          `${cell.rowId}:${columnKey}`,
        );

      /* =====================================================
         FILL HANDLE — OVERLAY SOURCE
         =====================================================
         If the source being tiled by Fill Handle is an overlay, copy the
         visible spreadsheet value into smart_sheet_cells at the destination.
         Never reinterpret that value as the destination business field.

         This also deliberately stores an intentional blank overlay when the
         source overlay is blank, so a hidden business value at the destination
         cannot leak back through the visual layer.
         ===================================================== */
      if (cell.preserveBusiness) {
        const isBlank =
          cell.value === null ||
          cell.value === "";

        const overlayPatch = {
          value:
            isBlank
              ? null
              : cell.value,
          is_blank:
            isBlank,
          source:
            "fill",
          source_row_id:
            cell.sourceRowId ?? null,
          source_column_key:
            cell.sourceColumnKey ?? null,
        };

        if (destinationOverlay) {
          const { error: overlayFillUpdateError } =
            await supabase
              .from("smart_sheet_cells")
              .update(overlayPatch)
              .eq("id", destinationOverlay.id)
              .eq("smart_sheet_id", input.sheetId)
              .eq("organization_id", organizationId);

          if (overlayFillUpdateError) {
            throw new Error(overlayFillUpdateError.message);
          }
        } else {
          const { error: overlayFillInsertError } =
            await supabase
              .from("smart_sheet_cells")
              .insert({
                organization_id:
                  organizationId,
                smart_sheet_id:
                  input.sheetId,
                row_id:
                  cell.rowId,
                column_key:
                  columnKey,
                ...overlayPatch,
              });

          if (overlayFillInsertError) {
            throw new Error(overlayFillInsertError.message);
          }

        }

        pastedCount += 1;
        continue;
      }

      if (destinationOverlay) {
        const isBlank =
          cell.value === null ||
          cell.value === "";

        const {
          error: overlayPasteError,
        } = await supabase
          .from("smart_sheet_cells")
          .update({
            value:
              isBlank
                ? null
                : cell.value,
            is_blank:
              isBlank,
            source:
              "user",
          })
          .eq(
            "id",
            destinationOverlay.id,
          )
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          );

        if (overlayPasteError) {
          throw new Error(
            overlayPasteError.message,
          );
        }

        pastedCount += 1;
        continue;
      }

      if (customPasteColumnKeys.has(columnKey)) {
        const isBlank =
          cell.value === null ||
          cell.value === "";

        const { error: customPasteError } =
          await supabase
            .from("smart_sheet_cells")
            .insert({
              organization_id: organizationId,
              smart_sheet_id: input.sheetId,
              row_id: cell.rowId,
              column_key: columnKey,
              value: isBlank ? null : cell.value,
              is_blank: isBlank,
              source: "user",
              source_column_key: null,
              source_row_id: null,
            });

        if (customPasteError) {
          throw new Error(customPasteError.message);
        }

        pastedCount += 1;
        continue;
      }

      const isText =
        textColumns.has(
          columnKey,
        );

      const isNumericInput =
        numericInputColumns.has(
          columnKey,
        );

      const isCalculated =
        calculatedNumericColumns.has(
          columnKey,
        );

      if (
        !isText &&
        !isNumericInput &&
        !isCalculated
      ) {
        skippedCount += 1;
        continue;
      }

      const rawText =
        cell.value === null ||
        cell.value === undefined
          ? ""
          : String(
              cell.value,
            ).trim();

      /* =====================================================
         SAME
         ===================================================== */

      if (
        rawText.toUpperCase() ===
          "SAME"
      ) {
        if (
          !sameAllowedColumns.has(
            columnKey,
          )
        ) {
          skippedCount += 1;
          continue;
        }

        const {
          data: existingState,
          error: stateReadError,
        } = await supabase
          .from(
            "smart_sheet_cell_states",
          )
          .select(`
            previous_value,
            effective_value
          `)
          .eq(
            "row_id",
            cell.rowId,
          )
          .eq(
            "column_key",
            columnKey,
          )
          .maybeSingle();

        if (stateReadError) {
          throw new Error(
            stateReadError.message,
          );
        }

        const currentRowValue =
          Number(
            row[
              columnKey
            ],
          );

        const preservedValue =
          existingState
            ?.previous_value !==
              null &&
          existingState
            ?.previous_value !==
              undefined
            ? Number(
                existingState
                  .previous_value,
              )
            : currentRowValue;

        if (
          !Number.isFinite(
            preservedValue,
          )
        ) {
          skippedCount += 1;
          continue;
        }

        const {
          error: sameStateError,
        } = await supabase
          .from(
            "smart_sheet_cell_states",
          )
          .upsert(
            {
              organization_id:
                organizationId,

              smart_sheet_id:
                input.sheetId,

              row_id:
                cell.rowId,

              column_key:
                columnKey,

              mode:
                "same",

              source:
                "user",

              previous_value:
                preservedValue,

              manual_value:
                null,

              effective_value:
                preservedValue,

              is_review_required:
                false,
            },
            {
              onConflict:
                "row_id,column_key",
            },
          );

        if (sameStateError) {
          throw new Error(
            sameStateError.message,
          );
        }

        const rowPatch: Record<
          string,
          unknown
        > = {
          [columnKey]:
            preservedValue,
        };

        const driverRule =
          pricingDriverMap[
            columnKey
          ];

        if (driverRule) {
          rowPatch[
            driverRule.driverColumn
          ] =
            driverRule.driver;
        }

        const {
          error: sameRowError,
        } = await supabase
          .from(
            "smart_sheet_rows",
          )
          .update(rowPatch)
          .eq(
            "id",
            cell.rowId,
          )
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          );

        if (sameRowError) {
          throw new Error(
            sameRowError.message,
          );
        }

        const pairedColumn =
          pairedPricingColumnMap[
            columnKey
          ];

        if (pairedColumn) {
          await resetPairedPricingCell({
            supabase,
            organizationId,
            sheetId:
              input.sheetId,
            rowId:
              cell.rowId,
            columnKey:
              pairedColumn,
          });
        }

        row[
          columnKey
        ] =
          preservedValue;

        if (driverRule) {
          row[
            driverRule.driverColumn
          ] =
            driverRule.driver;
        }

        affectedRowIds.add(
          cell.rowId,
        );

        pastedCount += 1;

        continue;
      }

      /* =====================================================
         TEXT
         ===================================================== */

      if (isText) {
        const textValue =
          cell.value === null
            ? null
            : String(
                cell.value,
              );

        const {
          error: textError,
        } = await supabase
          .from(
            "smart_sheet_rows",
          )
          .update({
            [columnKey]:
              textValue,
          })
          .eq(
            "id",
            cell.rowId,
          )
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          );

        if (textError) {
          throw new Error(
            textError.message,
          );
        }

        await upsertCellMode({
          supabase,
          organizationId,
          sheetId:
            input.sheetId,
          rowId:
            cell.rowId,
          columnKey,
          mode:
            "manual",
        });

        row[
          columnKey
        ] =
          textValue;

        affectedRowIds.add(
          cell.rowId,
        );

        pastedCount += 1;

        continue;
      }

      /* =====================================================
         NUMERIC
         ===================================================== */

      if (rawText === "") {
        skippedCount += 1;
        continue;
      }

      const normalizedValue =
        rawText
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
        skippedCount += 1;
        continue;
      }

      if (
        columnKey ===
          "quantity" &&
        numericValue < 0
      ) {
        skippedCount += 1;
        continue;
      }

      if (
        (
          columnKey ===
            "vat_rate" ||
          columnKey ===
            "transport_rate"
        ) &&
        numericValue < 0
      ) {
        skippedCount += 1;
        continue;
      }

      const rowPatch: Record<
        string,
        unknown
      > = {
        [columnKey]:
          numericValue,
      };

      const driverRule =
        pricingDriverMap[
          columnKey
        ];

      if (driverRule) {
        rowPatch[
          driverRule.driverColumn
        ] =
          driverRule.driver;
      }

      const {
        error: numericError,
      } = await supabase
        .from(
          "smart_sheet_rows",
        )
        .update(
          rowPatch,
        )
        .eq(
          "id",
          cell.rowId,
        )
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        );

      if (numericError) {
        throw new Error(
          numericError.message,
        );
      }

      await upsertNumericCellState({
        supabase,
        organizationId,
        sheetId:
          input.sheetId,
        rowId:
          cell.rowId,
        columnKey,
        value:
          numericValue,
        mode:
          "manual",
      });

      if (
        isCalculated &&
        formulaOverrideColumns.has(columnKey)
      ) {
        explicitFormulaOverrides.push({
          rowId: cell.rowId,
          columnKey,
          value: numericValue,
        });
      }

      const pairedColumn =
        pairedPricingColumnMap[
          columnKey
        ];

      if (pairedColumn) {
        await resetPairedPricingCell({
          supabase,
          organizationId,
          sheetId:
            input.sheetId,
          rowId:
            cell.rowId,
          columnKey:
            pairedColumn,
        });
      }

      row[
        columnKey
      ] =
        numericValue;

      if (driverRule) {
        row[
          driverRule.driverColumn
        ] =
          driverRule.driver;
      }

      affectedRowIds.add(
        cell.rowId,
      );

      pastedCount += 1;
    }

    if (
      pastedCount === 0
    ) {
      throw new Error(
        "No compatible editable cells were found in the pasted range.",
      );
    }

    /*
     * Recalculate each affected row once, then recalculate the
     * whole sheet once. This avoids a full recalculation after
     * every pasted cell.
     */
    for (
      const rowId of
      affectedRowIds
    ) {
      await recalculateRow(
        supabase,
        rowId,
      );
    }

    await recalculateSheet(
      supabase,
      input.sheetId,
    );

    /*
     * Spreadsheet freedom: when a user explicitly pastes/fills a value into
     * Item W/T or C/IVACP, that destination is a manual override. The first
     * recalculation refreshes formula_value. Re-assert the explicit manual
     * value afterwards, then recalculate once more so downstream formulas use
     * the manual override while the underlying formula remains available.
     */
    if (explicitFormulaOverrides.length > 0) {
      for (const override of explicitFormulaOverrides) {
        const { error: overrideRowError } = await supabase
          .from("smart_sheet_rows")
          .update({
            [override.columnKey]: override.value,
          })
          .eq("id", override.rowId)
          .eq("smart_sheet_id", input.sheetId)
          .eq("organization_id", organizationId);

        if (overrideRowError) {
          throw new Error(overrideRowError.message);
        }

        await upsertNumericCellState({
          supabase,
          organizationId,
          sheetId: input.sheetId,
          rowId: override.rowId,
          columnKey: override.columnKey,
          value: override.value,
          mode: "manual",
        });
      }

      await recalculateSheet(
        supabase,
        input.sheetId,
      );
    }

    await recordSmartSheetHistory(
      supabase, input.sheetId, organizationId, "paste", `Paste ${pastedCount} cells`, historyBefore,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      message:
        skippedCount > 0
          ? `${pastedCount} cells pasted. ${skippedCount} cells skipped.`
          : `${pastedCount} cells pasted.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to paste Smart Sheet cells.",
    };
  }
}



/* =========================================================
   INSERT / DELETE CELLS — VERTICAL SHIFT
   ========================================================= */

export async function shiftSmartSheetCells(
  input: ShiftSmartSheetCellsInput,
): Promise<ActionResult> {
  try {
    if (
      !Array.isArray(input.orderedRowIds) ||
      input.orderedRowIds.length === 0
    ) {
      throw new Error(
        "No Smart Sheet rows were provided for the cell shift.",
      );
    }

    if (
      !Array.isArray(input.columnKeys) ||
      input.columnKeys.length === 0
    ) {
      throw new Error(
        "No Smart Sheet columns were selected.",
      );
    }

    const startRowIndex =
      Math.max(
        0,
        Math.min(
          input.startRowIndex,
          input.endRowIndex,
        ),
      );

    const endRowIndex =
      Math.min(
        input.orderedRowIds.length - 1,
        Math.max(
          input.startRowIndex,
          input.endRowIndex,
        ),
      );

    if (
      startRowIndex >
      endRowIndex
    ) {
      throw new Error(
        "The selected cell range is not valid.",
      );
    }

    const shiftHeight =
      endRowIndex -
      startRowIndex +
      1;

    const allowedColumns =
      new Set([
        ...textColumns,
        ...numericInputColumns,
        ...calculatedNumericColumns,
      ]);

    const columnKeys =
      Array.from(
        new Set(
          input.columnKeys.filter(
            (columnKey) =>
              allowedColumns.has(
                columnKey,
              ),
          ),
        ),
      );

    if (
      columnKeys.length === 0
    ) {
      throw new Error(
        "The selected range does not contain editable Smart Sheet columns.",
      );
    }

    if (
      columnKeys.length *
        (
          input.orderedRowIds.length -
          startRowIndex
        ) >
      3000
    ) {
      throw new Error(
        "Cell shifting is limited to 3,000 affected cells at a time.",
      );
    }

    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    /*
     * Use the physical Smart Sheet row order supplied by the grid. Every row
     * is re-authorized server-side before any mutation.
     */
    const orderedRowIds =
      Array.from(
        new Set(
          input.orderedRowIds,
        ),
      );

    for (
      const rowId of
      orderedRowIds
    ) {
      await verifyRow(
        supabase,
        input.sheetId,
        rowId,
        organizationId,
      );
    }


    /*
     * Mixed-range vertical shift compatibility.
     *
     * If a selected rectangle contains BOTH spreadsheet overlays and ordinary
     * business-backed cells, the whole vertical operation must stay on the
     * visible spreadsheet layer. Moving only the overlay members as overlays
     * while moving the business-backed members through smart_sheet_rows would
     * reinterpret a single spreadsheet gesture as a business-data mutation and
     * can trigger recalculation / change the sheet total.
     *
     * Therefore mixed vertical shifting is presentation-only:
     * - resolve every source cell by visible priority: overlay -> SAME -> row value
     * - write every destination as smart_sheet_cells
     * - preserve smart_sheet_rows and smart_sheet_cell_states exactly
     * - move formatting with the visible cells
     * - do not recalculate the business model
     * - record exact before/after history snapshots for Undo/Redo
     *
     * Pure business ranges and pure overlay ranges continue through their
     * already-proven paths below.
     */
    {
      const selectedRowIds =
        orderedRowIds.slice(
          startRowIndex,
          endRowIndex + 1,
        );

      const {
        data: selectedRangeOverlays,
        error: selectedRangeOverlaysError,
      } =
        await supabase
          .from(
            "smart_sheet_cells",
          )
          .select("row_id,column_key")
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          )
          .in(
            "row_id",
            selectedRowIds,
          )
          .in(
            "column_key",
            columnKeys,
          );

      if (selectedRangeOverlaysError) {
        throw new Error(
          selectedRangeOverlaysError.message,
        );
      }

      const selectedCellCount =
        selectedRowIds.length *
        columnKeys.length;

      const selectedOverlayCount =
        (selectedRangeOverlays ?? [])
          .length;

      const isMixedSelectedRange =
        selectedOverlayCount > 0 &&
        selectedOverlayCount <
          selectedCellCount;

      if (isMixedSelectedRange) {
        const mixedAffectedRowIds =
          orderedRowIds.slice(
            startRowIndex,
          );

        const mixedHistoryBefore =
          await captureSmartSheetHistorySnapshot(
            supabase,
            input.sheetId,
            organizationId,
            mixedAffectedRowIds,
          );

        const {
          data: mixedRows,
          error: mixedRowsError,
        } =
          await supabase
            .from(
              "smart_sheet_rows",
            )
            .select("*")
            .eq(
              "smart_sheet_id",
              input.sheetId,
            )
            .eq(
              "organization_id",
              organizationId,
            )
            .in(
              "id",
              mixedAffectedRowIds,
            );

        if (mixedRowsError) {
          throw new Error(
            mixedRowsError.message,
          );
        }

        const mixedRowMap =
          new Map<
            string,
            Record<string, unknown>
          >(
            (mixedRows ?? []).map(
              (row) => [
                String(row.id),
                row as Record<
                  string,
                  unknown
                >,
              ],
            ),
          );

        const {
          data: mixedStates,
          error: mixedStatesError,
        } =
          await supabase
            .from(
              "smart_sheet_cell_states",
            )
            .select("row_id,column_key,mode")
            .eq(
              "smart_sheet_id",
              input.sheetId,
            )
            .eq(
              "organization_id",
              organizationId,
            )
            .in(
              "row_id",
              mixedAffectedRowIds,
            )
            .in(
              "column_key",
              columnKeys,
            );

        if (mixedStatesError) {
          throw new Error(
            mixedStatesError.message,
          );
        }

        const mixedStateModeMap =
          new Map<string, string>(
            (mixedStates ?? []).map(
              (state) => [
                `${state.row_id}:${state.column_key}`,
                String(
                  state.mode ?? "",
                ),
              ],
            ),
          );

        const {
          data: mixedOverlays,
          error: mixedOverlaysError,
        } =
          await supabase
            .from(
              "smart_sheet_cells",
            )
            .select("*")
            .eq(
              "smart_sheet_id",
              input.sheetId,
            )
            .eq(
              "organization_id",
              organizationId,
            )
            .in(
              "row_id",
              mixedAffectedRowIds,
            )
            .in(
              "column_key",
              columnKeys,
            );

        if (mixedOverlaysError) {
          throw new Error(
            mixedOverlaysError.message,
          );
        }

        const mixedOverlayMap =
          new Map<
            string,
            Record<string, unknown>
          >(
            (mixedOverlays ?? []).map(
              (overlay) => [
                `${overlay.row_id}:${overlay.column_key}`,
                overlay as Record<
                  string,
                  unknown
                >,
              ],
            ),
          );

        const {
          data: mixedFormats,
          error: mixedFormatsError,
        } =
          await supabase
            .from(
              "smart_sheet_cell_formats",
            )
            .select("*")
            .eq(
              "smart_sheet_id",
              input.sheetId,
            )
            .eq(
              "organization_id",
              organizationId,
            )
            .in(
              "row_id",
              mixedAffectedRowIds,
            )
            .in(
              "column_key",
              columnKeys,
            );

        if (mixedFormatsError) {
          throw new Error(
            mixedFormatsError.message,
          );
        }

        const mixedFormatMap =
          new Map<
            string,
            Record<string, unknown>
          >(
            (mixedFormats ?? []).map(
              (format) => [
                `${format.row_id}:${format.column_key}`,
                format as Record<
                  string,
                  unknown
                >,
              ],
            ),
          );

        const nextMixedOverlays: Record<
          string,
          unknown
        >[] = [];

        const nextMixedFormats: Record<
          string,
          unknown
        >[] = [];

        for (
          let destinationIndex =
            startRowIndex;
          destinationIndex <
            orderedRowIds.length;
          destinationIndex += 1
        ) {
          const destinationRowId =
            orderedRowIds[
              destinationIndex
            ];

          const sourceIndex =
            input.direction === "down"
              ? destinationIndex -
                shiftHeight
              : destinationIndex +
                shiftHeight;

          const hasSource =
            input.direction === "down"
              ? sourceIndex >=
                startRowIndex
              : sourceIndex <
                orderedRowIds.length;

          const sourceRowId =
            hasSource
              ? orderedRowIds[
                  sourceIndex
                ]
              : null;

          for (
            const columnKey of
            columnKeys
          ) {
            if (!sourceRowId) {
              nextMixedOverlays.push({
                organization_id:
                  organizationId,
                smart_sheet_id:
                  input.sheetId,
                row_id:
                  destinationRowId,
                column_key:
                  columnKey,
                value:
                  null,
                is_blank:
                  true,
                source:
                  "vertical_shift_mixed",
                source_column_key:
                  columnKey,
                source_row_id:
                  null,
              });

              continue;
            }

            const sourceOverlay =
              mixedOverlayMap.get(
                `${sourceRowId}:${columnKey}`,
              ) ?? null;

            if (sourceOverlay) {
              const copiedOverlay = {
                ...sourceOverlay,
              } as Record<
                string,
                unknown
              >;

              delete copiedOverlay.id;
              delete copiedOverlay.created_at;
              delete copiedOverlay.updated_at;

              copiedOverlay.organization_id =
                organizationId;
              copiedOverlay.smart_sheet_id =
                input.sheetId;
              copiedOverlay.row_id =
                destinationRowId;
              copiedOverlay.column_key =
                columnKey;
              copiedOverlay.source =
                "vertical_shift_mixed";
              copiedOverlay.source_column_key =
                columnKey;
              copiedOverlay.source_row_id =
                sourceRowId;

              nextMixedOverlays.push(
                copiedOverlay,
              );
            } else {
              const sourceRow =
                mixedRowMap.get(
                  sourceRowId,
                ) ?? null;

              const sourceMode =
                mixedStateModeMap.get(
                  `${sourceRowId}:${columnKey}`,
                );

              const rawSourceValue =
                sourceRow
                  ? (
                      sourceRow[
                        columnKey
                      ] ??
                      null
                    )
                  : null;

              const visibleSourceValue =
                sourceMode === "same"
                  ? "SAME"
                  : rawSourceValue;

              const sourceIsBlank =
                visibleSourceValue ===
                  null ||
                visibleSourceValue ===
                  undefined ||
                visibleSourceValue ===
                  "";

              nextMixedOverlays.push({
                organization_id:
                  organizationId,
                smart_sheet_id:
                  input.sheetId,
                row_id:
                  destinationRowId,
                column_key:
                  columnKey,
                value:
                  sourceIsBlank
                    ? null
                    : visibleSourceValue,
                is_blank:
                  sourceIsBlank,
                source:
                  "vertical_shift_mixed",
                source_column_key:
                  columnKey,
                source_row_id:
                  sourceRowId,
              });
            }

            const sourceFormat =
              mixedFormatMap.get(
                `${sourceRowId}:${columnKey}`,
              ) ?? null;

            if (sourceFormat) {
              const copiedFormat = {
                ...sourceFormat,
              } as Record<
                string,
                unknown
              >;

              delete copiedFormat.id;
              delete copiedFormat.created_at;
              delete copiedFormat.updated_at;

              copiedFormat.organization_id =
                organizationId;
              copiedFormat.smart_sheet_id =
                input.sheetId;
              copiedFormat.row_id =
                destinationRowId;
              copiedFormat.column_key =
                columnKey;

              nextMixedFormats.push(
                copiedFormat,
              );
            }
          }
        }

        const {
          error: mixedOverlayDeleteError,
        } =
          await supabase
            .from(
              "smart_sheet_cells",
            )
            .delete()
            .eq(
              "smart_sheet_id",
              input.sheetId,
            )
            .eq(
              "organization_id",
              organizationId,
            )
            .in(
              "row_id",
              mixedAffectedRowIds,
            )
            .in(
              "column_key",
              columnKeys,
            );

        if (mixedOverlayDeleteError) {
          throw new Error(
            mixedOverlayDeleteError.message,
          );
        }

        const {
          error: mixedFormatDeleteError,
        } =
          await supabase
            .from(
              "smart_sheet_cell_formats",
            )
            .delete()
            .eq(
              "smart_sheet_id",
              input.sheetId,
            )
            .eq(
              "organization_id",
              organizationId,
            )
            .in(
              "row_id",
              mixedAffectedRowIds,
            )
            .in(
              "column_key",
              columnKeys,
            );

        if (mixedFormatDeleteError) {
          throw new Error(
            mixedFormatDeleteError.message,
          );
        }

        if (
          nextMixedOverlays.length >
          0
        ) {
          const {
            error: mixedOverlayInsertError,
          } =
            await supabase
              .from(
                "smart_sheet_cells",
              )
              .insert(
                nextMixedOverlays,
              );

          if (mixedOverlayInsertError) {
            throw new Error(
              mixedOverlayInsertError.message,
            );
          }
        }

        if (
          nextMixedFormats.length >
          0
        ) {
          const {
            error: mixedFormatInsertError,
          } =
            await supabase
              .from(
                "smart_sheet_cell_formats",
              )
              .insert(
                nextMixedFormats,
              );

          if (mixedFormatInsertError) {
            throw new Error(
              mixedFormatInsertError.message,
            );
          }
        }

        const mixedHistoryAfter =
          await captureSmartSheetHistorySnapshot(
            supabase,
            input.sheetId,
            organizationId,
            mixedAffectedRowIds,
          );

        const mixedLabel =
          input.direction === "down"
            ? `Insert Cells Shift Down — mixed presentation range (${shiftHeight} row${shiftHeight === 1 ? "" : "s"} × ${columnKeys.length} column${columnKeys.length === 1 ? "" : "s"})`
            : `Delete Cells Shift Up — mixed presentation range (${shiftHeight} row${shiftHeight === 1 ? "" : "s"} × ${columnKeys.length} column${columnKeys.length === 1 ? "" : "s"})`;

        await recordSmartSheetHistorySnapshots(
          supabase,
          input.sheetId,
          organizationId,
          "cell_shift",
          mixedLabel,
          mixedHistoryBefore,
          mixedHistoryAfter,
        );

        revalidateSmartSheet(
          input.sheetId,
        );

        return {
          ok: true,
          message:
            input.direction === "down"
              ? `${shiftHeight * columnKeys.length} mixed spreadsheet cell${shiftHeight * columnKeys.length === 1 ? "" : "s"} inserted; visible cells shifted down without changing business data.`
              : `${shiftHeight * columnKeys.length} mixed spreadsheet cell${shiftHeight * columnKeys.length === 1 ? "" : "s"} deleted; visible cells shifted up without changing business data.`,
        };
      }
    }

    /*
     * Overlay-only Shift Up compatibility.
     *
     * The original structured Shift Up engine implements Excel-style
     * "delete cells, shift up" semantics for business-backed cells. A visible
     * smart_sheet_cells overlay, however, is spreadsheet presentation content
     * and must move upward as the user sees it, without rewriting the semantic
     * business cell underneath.
     *
     * Keep this branch deliberately narrow: it runs only when EVERY selected
     * cell is already an overlay. Mixed overlay/business ranges continue through
     * the existing engine and will be handled in the dedicated mixed-range
     * compatibility milestone.
     */
    if (
      input.direction === "up" &&
      startRowIndex >= shiftHeight
    ) {
      const selectedRowIds =
        orderedRowIds.slice(
          startRowIndex,
          endRowIndex + 1,
        );

      const {
        data: selectedOverlays,
        error: selectedOverlaysError,
      } =
        await supabase
          .from(
            "smart_sheet_cells",
          )
          .select("*")
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          )
          .in(
            "row_id",
            selectedRowIds,
          )
          .in(
            "column_key",
            columnKeys,
          );

      if (selectedOverlaysError) {
        throw new Error(
          selectedOverlaysError.message,
        );
      }

      const expectedOverlayCount =
        selectedRowIds.length *
        columnKeys.length;

      if (
        (selectedOverlays ?? []).length ===
        expectedOverlayCount
      ) {
        const targetRowIds =
          selectedRowIds.map(
            (_, offset) =>
              orderedRowIds[
                startRowIndex -
                  shiftHeight +
                  offset
              ],
          );

        const impactedRowIds =
          Array.from(
            new Set([
              ...targetRowIds,
              ...selectedRowIds,
            ]),
          );

        const historyBeforeOverlayUp =
          await captureSmartSheetHistorySnapshot(
            supabase,
            input.sheetId,
            organizationId,
            impactedRowIds,
          );

        const {
          data: selectedFormats,
          error: selectedFormatsError,
        } =
          await supabase
            .from(
              "smart_sheet_cell_formats",
            )
            .select("*")
            .eq(
              "smart_sheet_id",
              input.sheetId,
            )
            .eq(
              "organization_id",
              organizationId,
            )
            .in(
              "row_id",
              selectedRowIds,
            )
            .in(
              "column_key",
              columnKeys,
            );

        if (selectedFormatsError) {
          throw new Error(
            selectedFormatsError.message,
          );
        }

        const selectedOverlayMap =
          new Map<
            string,
            Record<string, unknown>
          >(
            (selectedOverlays ?? []).map(
              (overlay) => [
                `${overlay.row_id}:${overlay.column_key}`,
                overlay as Record<
                  string,
                  unknown
                >,
              ],
            ),
          );

        const selectedFormatMap =
          new Map<
            string,
            Record<string, unknown>
          >(
            (selectedFormats ?? []).map(
              (format) => [
                `${format.row_id}:${format.column_key}`,
                format as Record<
                  string,
                  unknown
                >,
              ],
            ),
          );

        const movedOverlayRows: Record<
          string,
          unknown
        >[] = [];

        const movedFormatRows: Record<
          string,
          unknown
        >[] = [];

        for (
          let offset = 0;
          offset < selectedRowIds.length;
          offset += 1
        ) {
          const sourceRowId =
            selectedRowIds[offset];
          const targetRowId =
            targetRowIds[offset];

          for (
            const columnKey of
            columnKeys
          ) {
            const sourceOverlay =
              selectedOverlayMap.get(
                `${sourceRowId}:${columnKey}`,
              );

            if (!sourceOverlay) {
              continue;
            }

            const copiedOverlay = {
              ...sourceOverlay,
            } as Record<
              string,
              unknown
            >;

            delete copiedOverlay.id;
            delete copiedOverlay.created_at;
            delete copiedOverlay.updated_at;

            copiedOverlay.organization_id =
              organizationId;
            copiedOverlay.smart_sheet_id =
              input.sheetId;
            copiedOverlay.row_id =
              targetRowId;
            copiedOverlay.column_key =
              columnKey;
            copiedOverlay.source =
              "vertical_shift";
            copiedOverlay.source_column_key =
              columnKey;
            copiedOverlay.source_row_id =
              sourceRowId;

            movedOverlayRows.push(
              copiedOverlay,
            );

            /*
             * Keep the vacated source visibly blank. This is crucial when a
             * structured business value exists underneath the overlay.
             */
            movedOverlayRows.push({
              organization_id:
                organizationId,
              smart_sheet_id:
                input.sheetId,
              row_id:
                sourceRowId,
              column_key:
                columnKey,
              value:
                null,
              is_blank:
                true,
              source:
                "vertical_shift",
              source_column_key:
                columnKey,
              source_row_id:
                sourceRowId,
            });

            const sourceFormat =
              selectedFormatMap.get(
                `${sourceRowId}:${columnKey}`,
              );

            if (sourceFormat) {
              const copiedFormat = {
                ...sourceFormat,
              } as Record<
                string,
                unknown
              >;

              delete copiedFormat.id;
              delete copiedFormat.created_at;
              delete copiedFormat.updated_at;

              copiedFormat.organization_id =
                organizationId;
              copiedFormat.smart_sheet_id =
                input.sheetId;
              copiedFormat.row_id =
                targetRowId;
              copiedFormat.column_key =
                columnKey;

              movedFormatRows.push(
                copiedFormat,
              );
            }
          }
        }

        const {
          error: overlayUpDeleteError,
        } =
          await supabase
            .from(
              "smart_sheet_cells",
            )
            .delete()
            .eq(
              "smart_sheet_id",
              input.sheetId,
            )
            .eq(
              "organization_id",
              organizationId,
            )
            .in(
              "row_id",
              impactedRowIds,
            )
            .in(
              "column_key",
              columnKeys,
            );

        if (overlayUpDeleteError) {
          throw new Error(
            overlayUpDeleteError.message,
          );
        }

        const {
          error: formatUpDeleteError,
        } =
          await supabase
            .from(
              "smart_sheet_cell_formats",
            )
            .delete()
            .eq(
              "smart_sheet_id",
              input.sheetId,
            )
            .eq(
              "organization_id",
              organizationId,
            )
            .in(
              "row_id",
              impactedRowIds,
            )
            .in(
              "column_key",
              columnKeys,
            );

        if (formatUpDeleteError) {
          throw new Error(
            formatUpDeleteError.message,
          );
        }

        if (movedOverlayRows.length > 0) {
          const {
            error: overlayUpInsertError,
          } =
            await supabase
              .from(
                "smart_sheet_cells",
              )
              .insert(
                movedOverlayRows,
              );

          if (overlayUpInsertError) {
            throw new Error(
              overlayUpInsertError.message,
            );
          }
        }

        if (movedFormatRows.length > 0) {
          const {
            error: formatUpInsertError,
          } =
            await supabase
              .from(
                "smart_sheet_cell_formats",
              )
              .insert(
                movedFormatRows,
              );

          if (formatUpInsertError) {
            throw new Error(
              formatUpInsertError.message,
            );
          }
        }

        const historyAfterOverlayUp =
          await captureSmartSheetHistorySnapshot(
            supabase,
            input.sheetId,
            organizationId,
            impactedRowIds,
          );

        const overlayUpLabel =
          `Shift Up (${shiftHeight} row${shiftHeight === 1 ? "" : "s"} × ${columnKeys.length} column${columnKeys.length === 1 ? "" : "s"})`;

        await recordSmartSheetHistorySnapshots(
          supabase,
          input.sheetId,
          organizationId,
          "cell_shift",
          overlayUpLabel,
          historyBeforeOverlayUp,
          historyAfterOverlayUp,
        );

        revalidateSmartSheet(
          input.sheetId,
        );

        return {
          ok: true,
          message:
            `${shiftHeight * columnKeys.length} overlay cell${shiftHeight * columnKeys.length === 1 ? "" : "s"} shifted up.`,
        };
      }
    }

    const affectedRowIds =
      orderedRowIds.slice(
        startRowIndex,
      );

    const historyBefore =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        affectedRowIds,
      );

    const {
      data: currentRows,
      error: currentRowsError,
    } =
      await supabase
        .from(
          "smart_sheet_rows",
        )
        .select("*")
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "id",
          affectedRowIds,
        );

    if (currentRowsError) {
      throw new Error(
        currentRowsError.message,
      );
    }

    const rowMap =
      new Map<
        string,
        Record<string, unknown>
      >(
        (
          currentRows ?? []
        ).map(
          (row) => [
            String(row.id),
            row as Record<
              string,
              unknown
            >,
          ],
        ),
      );

    const {
      data: currentStates,
      error: currentStatesError,
    } =
      await supabase
        .from(
          "smart_sheet_cell_states",
        )
        .select("*")
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "row_id",
          affectedRowIds,
        )
        .in(
          "column_key",
          columnKeys,
        );

    if (currentStatesError) {
      throw new Error(
        currentStatesError.message,
      );
    }

    const stateMap =
      new Map<
        string,
        Record<string, unknown>
      >(
        (
          currentStates ?? []
        ).map(
          (state) => [
            `${state.row_id}:${state.column_key}`,
            state as Record<
              string,
              unknown
            >,
          ],
        ),
      );

    const {
      data: currentFormats,
      error: currentFormatsError,
    } =
      await supabase
        .from(
          "smart_sheet_cell_formats",
        )
        .select("*")
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "row_id",
          affectedRowIds,
        )
        .in(
          "column_key",
          columnKeys,
        );

    if (currentFormatsError) {
      throw new Error(
        currentFormatsError.message,
      );
    }

    const formatMap =
      new Map<
        string,
        Record<string, unknown>
      >(
        (
          currentFormats ?? []
        ).map(
          (format) => [
            `${format.row_id}:${format.column_key}`,
            format as Record<
              string,
              unknown
            >,
          ],
        ),
      );

    /*
     * Vertical overlay compatibility:
     * smart_sheet_cells is the visible spreadsheet layer. When a visible
     * overlay participates in Shift Up/Down, move that overlay vertically
     * without reinterpreting or overwriting the hidden business cell beneath it.
     */
    const {
      data: currentOverlays,
      error: currentOverlaysError,
    } =
      await supabase
        .from(
          "smart_sheet_cells",
        )
        .select("*")
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "row_id",
          affectedRowIds,
        )
        .in(
          "column_key",
          columnKeys,
        );

    if (currentOverlaysError) {
      throw new Error(
        currentOverlaysError.message,
      );
    }

    const overlayMap =
      new Map<
        string,
        Record<string, unknown>
      >(
        (
          currentOverlays ?? []
        ).map(
          (overlay) => [
            `${overlay.row_id}:${overlay.column_key}`,
            overlay as Record<
              string,
              unknown
            >,
          ],
        ),
      );

    const destinationStateRows: Record<
      string,
      unknown
    >[] = [];

    const destinationFormatRows: Record<
      string,
      unknown
    >[] = [];

    const destinationOverlayRows: Record<
      string,
      unknown
    >[] = [];

    /*
     * Build every destination patch from the ORIGINAL snapshot before any
     * database updates. This prevents cascading/overwriting while shifting.
     */
    for (
      let destinationIndex =
        startRowIndex;
      destinationIndex <
        orderedRowIds.length;
      destinationIndex += 1
    ) {
      const destinationRowId =
        orderedRowIds[
          destinationIndex
        ];

      const destinationPatch:
        Record<
          string,
          unknown
        > = {};

      const sourceIndex =
        input.direction ===
        "down"
          ? destinationIndex -
            shiftHeight
          : destinationIndex +
            shiftHeight;

      const hasSource =
        input.direction ===
        "down"
          ? sourceIndex >=
            startRowIndex
          : sourceIndex <
            orderedRowIds.length;

      const sourceRowId =
        hasSource
          ? orderedRowIds[
              sourceIndex
            ]
          : null;

      const sourceRow =
        sourceRowId
          ? rowMap.get(
              sourceRowId,
            ) ?? null
          : null;

      for (
        const columnKey of
        columnKeys
      ) {
        const isText =
          textColumns.has(
            columnKey,
          );

        const isNumericInput =
          numericInputColumns.has(
            columnKey,
          );

        const isCalculated =
          calculatedNumericColumns.has(
            columnKey,
          );

        const destinationOverlay =
          overlayMap.get(
            `${destinationRowId}:${columnKey}`,
          ) ?? null;

        const sourceOverlay =
          sourceRowId
            ? overlayMap.get(
                `${sourceRowId}:${columnKey}`,
              ) ?? null
            : null;

        /*
         * If the source is an overlay, the visible spreadsheet value moves but
         * the destination business cell underneath it must remain untouched.
         *
         * If this is a newly vacated position that previously held an overlay,
         * preserve the hidden business cell and write an intentional blank
         * overlay so that hidden data does not reappear.
         */
        const preserveDestinationBusiness =
          Boolean(sourceOverlay) ||
          (
            !hasSource &&
            Boolean(destinationOverlay)
          );

        const sourceValue =
          sourceRow
            ? (
                sourceRow[
                  columnKey
                ] ??
                null
              )
            : null;

        const sourceState =
          sourceRowId
            ? stateMap.get(
                `${sourceRowId}:${columnKey}`,
              ) ?? null
            : null;

        const destinationState =
          stateMap.get(
            `${destinationRowId}:${columnKey}`,
          ) ?? null;

        const driverRule =
          pricingDriverMap[
            columnKey
          ];

        if (
          preserveDestinationBusiness
        ) {
          /*
           * State rows are replaced as a batch below. Reinsert the destination
           * state unchanged so the hidden semantic cell is preserved exactly.
           */
          if (destinationState) {
            const preservedState = {
              ...destinationState,
            } as Record<
              string,
              unknown
            >;

            delete preservedState.id;
            delete preservedState.created_at;
            delete preservedState.updated_at;

            preservedState.organization_id =
              organizationId;
            preservedState.smart_sheet_id =
              input.sheetId;
            preservedState.row_id =
              destinationRowId;
            preservedState.column_key =
              columnKey;

            destinationStateRows.push(
              preservedState,
            );
          }

          if (sourceOverlay) {
            const copiedOverlay = {
              ...sourceOverlay,
            } as Record<
              string,
              unknown
            >;

            delete copiedOverlay.id;
            delete copiedOverlay.created_at;
            delete copiedOverlay.updated_at;

            copiedOverlay.organization_id =
              organizationId;
            copiedOverlay.smart_sheet_id =
              input.sheetId;
            copiedOverlay.row_id =
              destinationRowId;
            copiedOverlay.column_key =
              columnKey;
            copiedOverlay.source =
              "vertical_shift";
            copiedOverlay.source_column_key =
              columnKey;
            copiedOverlay.source_row_id =
              sourceRowId;

            destinationOverlayRows.push(
              copiedOverlay,
            );
          } else {
            destinationOverlayRows.push({
              organization_id:
                organizationId,
              smart_sheet_id:
                input.sheetId,
              row_id:
                destinationRowId,
              column_key:
                columnKey,
              value:
                null,
              is_blank:
                true,
              source:
                "vertical_shift",
              source_column_key:
                columnKey,
              source_row_id:
                destinationRowId,
            });
          }
        } else {
          destinationPatch[
            columnKey
          ] =
            sourceValue;

          /*
           * Price/markup driver behavior follows the moved business cell only
           * when the source cell is an active user/OCR/SAME value. Overlay
           * sources never enter this branch.
           */
          const sourceMode =
            sourceState?.mode;

          if (
            driverRule &&
            sourceState &&
            sourceMode !==
              "calculated"
          ) {
            destinationPatch[
              driverRule
                .driverColumn
            ] =
              driverRule.driver;
          }

          if (!hasSource) {
            /*
             * Vacated direct-input cells are real blanks with no state.
             * Vacated calculated-capable cells are intentional MANUAL blanks,
             * matching the proven Backspace/Delete semantics.
             */
            if (
              isCalculated
            ) {
              if (
                driverRule
              ) {
                destinationPatch[
                  driverRule
                    .driverColumn
                ] =
                  driverRule.driver;
              }

              destinationStateRows.push(
                {
                  organization_id:
                    organizationId,
                  smart_sheet_id:
                    input.sheetId,
                  row_id:
                    destinationRowId,
                  column_key:
                    columnKey,
                  mode:
                    "manual",
                  source:
                    "user",
                  manual_value:
                    null,
                  effective_value:
                    null,
                  is_review_required:
                    false,
                },
              );
            }
          } else if (sourceState) {
            const copiedState = {
              ...sourceState,
            } as Record<
              string,
              unknown
            >;

            delete copiedState.id;
            delete copiedState.created_at;
            delete copiedState.updated_at;

            copiedState.organization_id =
              organizationId;
            copiedState.smart_sheet_id =
              input.sheetId;
            copiedState.row_id =
              destinationRowId;
            copiedState.column_key =
              columnKey;

            destinationStateRows.push(
              copiedState,
            );
          } else if (
            isCalculated
          ) {
            /*
             * Formula-backed business columns always retain their formula mode
             * when the source had no explicit state row.
             */
            destinationStateRows.push(
              {
                organization_id:
                  organizationId,
                smart_sheet_id:
                  input.sheetId,
                row_id:
                  destinationRowId,
                column_key:
                  columnKey,
                mode:
                  "calculated",
                source:
                  "formula",
                manual_value:
                  null,
                effective_value:
                  sourceValue,
                is_review_required:
                  false,
              },
            );
          } else if (
            !isText &&
            !isNumericInput
          ) {
            continue;
          }
        }

        const sourceFormat =
          sourceRowId
            ? formatMap.get(
                `${sourceRowId}:${columnKey}`,
              ) ?? null
            : null;

        if (
          sourceFormat
        ) {
          const copiedFormat = {
            ...sourceFormat,
          } as Record<
            string,
            unknown
          >;

          delete copiedFormat.id;
          delete copiedFormat.created_at;
          delete copiedFormat.updated_at;

          copiedFormat.organization_id =
            organizationId;
          copiedFormat.smart_sheet_id =
            input.sheetId;
          copiedFormat.row_id =
            destinationRowId;
          copiedFormat.column_key =
            columnKey;

          destinationFormatRows.push(
            copiedFormat,
          );
        }
      }

      if (
        Object.keys(
          destinationPatch,
        ).length > 0
      ) {
        const {
          error: rowUpdateError,
        } =
          await supabase
            .from(
              "smart_sheet_rows",
            )
            .update(
              destinationPatch,
            )
            .eq(
              "id",
              destinationRowId,
            )
            .eq(
              "smart_sheet_id",
              input.sheetId,
            )
            .eq(
              "organization_id",
              organizationId,
            );

        if (
          rowUpdateError
        ) {
          throw new Error(
            rowUpdateError.message,
          );
        }
      }
    }

    /*
     * Replace only the selected columns' state/format metadata. Other cells in
     * every affected row remain untouched.
     */
    const {
      error: stateDeleteError,
    } =
      await supabase
        .from(
          "smart_sheet_cell_states",
        )
        .delete()
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "row_id",
          affectedRowIds,
        )
        .in(
          "column_key",
          columnKeys,
        );

    if (
      stateDeleteError
    ) {
      throw new Error(
        stateDeleteError.message,
      );
    }

    if (
      destinationStateRows.length >
      0
    ) {
      const {
        error:
          stateInsertError,
      } =
        await supabase
          .from(
            "smart_sheet_cell_states",
          )
          .insert(
            destinationStateRows,
          );

      if (
        stateInsertError
      ) {
        throw new Error(
          stateInsertError.message,
        );
      }
    }

    const {
      error: formatDeleteError,
    } =
      await supabase
        .from(
          "smart_sheet_cell_formats",
        )
        .delete()
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "row_id",
          affectedRowIds,
        )
        .in(
          "column_key",
          columnKeys,
        );

    if (
      formatDeleteError
    ) {
      throw new Error(
        formatDeleteError.message,
      );
    }

    if (
      destinationFormatRows.length >
      0
    ) {
      const {
        error:
          formatInsertError,
      } =
        await supabase
          .from(
            "smart_sheet_cell_formats",
          )
          .insert(
            destinationFormatRows,
          );

      if (
        formatInsertError
      ) {
        throw new Error(
          formatInsertError.message,
        );
      }
    }

    /*
     * Replace overlays only in the affected vertical range/columns. Sources
     * without overlays intentionally produce no destination overlay, allowing
     * the shifted structured business value to become visible.
     */
    const {
      error: overlayDeleteError,
    } =
      await supabase
        .from(
          "smart_sheet_cells",
        )
        .delete()
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "row_id",
          affectedRowIds,
        )
        .in(
          "column_key",
          columnKeys,
        );

    if (
      overlayDeleteError
    ) {
      throw new Error(
        overlayDeleteError.message,
      );
    }

    if (
      destinationOverlayRows.length >
      0
    ) {
      const {
        error:
          overlayInsertError,
      } =
        await supabase
          .from(
            "smart_sheet_cells",
          )
          .insert(
            destinationOverlayRows,
          );

      if (
        overlayInsertError
      ) {
        throw new Error(
          overlayInsertError.message,
        );
      }
    }

    /*
     * Business formulas are column-defined, not arbitrary user formulas.
     * Recalculate affected rows after state movement so calculated cells use
     * their NEW row context while manual/SAME overrides remain authoritative.
     */
    for (
      const rowId of
      affectedRowIds
    ) {
      await recalculateRow(
        supabase,
        rowId,
      );
    }

    await recalculateSheet(
      supabase,
      input.sheetId,
    );

    const historyAfter =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        affectedRowIds,
      );

    const label =
      input.direction ===
      "down"
        ? `Insert Cells Shift Down (${shiftHeight} row${shiftHeight === 1 ? "" : "s"} × ${columnKeys.length} column${columnKeys.length === 1 ? "" : "s"})`
        : `Delete Cells Shift Up (${shiftHeight} row${shiftHeight === 1 ? "" : "s"} × ${columnKeys.length} column${columnKeys.length === 1 ? "" : "s"})`;

    await recordSmartSheetHistorySnapshots(
      supabase,
      input.sheetId,
      organizationId,
      "cell_shift",
      label,
      historyBefore,
      historyAfter,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      message:
        input.direction ===
        "down"
          ? `${shiftHeight * columnKeys.length} selected cell${shiftHeight * columnKeys.length === 1 ? "" : "s"} inserted; cells shifted down.`
          : `${shiftHeight * columnKeys.length} selected cell${shiftHeight * columnKeys.length === 1 ? "" : "s"} deleted; cells shifted up.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to shift Smart Sheet cells.",
    };
  }
}



/* =========================================================
   DELETE CELLS — SHIFT LEFT
   ========================================================= */

export async function shiftSmartSheetCellsLeft(
  input: ShiftSmartSheetCellsLeftInput,
): Promise<ActionResult> {
  try {
    if (!Array.isArray(input.rowIds) || input.rowIds.length === 0) {
      throw new Error("No Smart Sheet rows were selected.");
    }

    if (
      !Array.isArray(input.orderedColumnKeys) ||
      input.orderedColumnKeys.length === 0
    ) {
      throw new Error("No Smart Sheet columns were provided.");
    }

    const allowedColumns = new Set([
      ...textColumns,
      ...numericInputColumns,
      ...calculatedNumericColumns,
    ]);

    const orderedColumnKeys = input.orderedColumnKeys.filter(
      (columnKey, index, values) =>
        allowedColumns.has(columnKey) &&
        values.indexOf(columnKey) === index,
    );

    const startColumnIndex = Math.max(
      0,
      Math.min(input.startColumnIndex, input.endColumnIndex),
    );
    const endColumnIndex = Math.min(
      orderedColumnKeys.length - 1,
      Math.max(input.startColumnIndex, input.endColumnIndex),
    );

    if (
      orderedColumnKeys.length === 0 ||
      startColumnIndex > endColumnIndex
    ) {
      throw new Error("The selected cell range is not valid.");
    }

    const shiftWidth = endColumnIndex - startColumnIndex + 1;
    const affectedColumnKeys = orderedColumnKeys.slice(startColumnIndex);

    if (input.rowIds.length * affectedColumnKeys.length > 3000) {
      throw new Error(
        "Cell shifting is limited to 3,000 affected cells at a time.",
      );
    }

    const { supabase, organizationId } =
      await getAuthorizedContext(input.sheetId);

    const rowIds = Array.from(new Set(input.rowIds));
    const verifiedRows = new Map<string, Record<string, unknown>>();

    for (const rowId of rowIds) {
      const row = await verifyRow(
        supabase,
        input.sheetId,
        rowId,
        organizationId,
      );
      verifiedRows.set(rowId, row as Record<string, unknown>);
    }

    /*
     * IMPORTANT:
     * Capture history BEFORE touching the overlay. Exact Undo/Redo snapshots
     * now include smart_sheet_cells, so Shift Left remains one transaction.
     */
    const historyBefore = await captureSmartSheetHistorySnapshot(
      supabase,
      input.sheetId,
      organizationId,
      rowIds,
    );

    const { data: existingOverlays, error: overlayReadError } =
      await supabase
        .from("smart_sheet_cells")
        .select("*")
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId)
        .in("row_id", rowIds);

    if (overlayReadError) {
      throw new Error(overlayReadError.message);
    }

    const overlayMap = new Map<string, Record<string, unknown>>(
      (existingOverlays ?? []).map((overlay) => [
        `${overlay.row_id}:${overlay.column_key}`,
        overlay as Record<string, unknown>,
      ]),
    );

    const { data: currentStates, error: statesError } =
      await supabase
        .from("smart_sheet_cell_states")
        .select("row_id,column_key,mode")
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId)
        .in("row_id", rowIds);

    if (statesError) {
      throw new Error(statesError.message);
    }

    const stateModeMap = new Map<string, string>(
      (currentStates ?? []).map((state) => [
        `${state.row_id}:${state.column_key}`,
        String(state.mode ?? ""),
      ]),
    );

    const { data: currentFormats, error: formatsError } =
      await supabase
        .from("smart_sheet_cell_formats")
        .select("*")
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId)
        .in("row_id", rowIds)
        .in("column_key", affectedColumnKeys);

    if (formatsError) {
      throw new Error(formatsError.message);
    }

    const formatMap = new Map<string, Record<string, unknown>>(
      (currentFormats ?? []).map((format) => [
        `${format.row_id}:${format.column_key}`,
        format as Record<string, unknown>,
      ]),
    );

    const nextOverlays: Record<string, unknown>[] = [];
    const nextFormats: Record<string, unknown>[] = [];

    for (const rowId of rowIds) {
      const businessRow = verifiedRows.get(rowId);
      if (!businessRow) continue;

      for (
        let destinationIndex = startColumnIndex;
        destinationIndex < orderedColumnKeys.length;
        destinationIndex += 1
      ) {
        const destinationColumnKey = orderedColumnKeys[destinationIndex];
        const sourceIndex = destinationIndex + shiftWidth;
        const sourceColumnKey =
          sourceIndex < orderedColumnKeys.length
            ? orderedColumnKeys[sourceIndex]
            : null;

        if (sourceColumnKey === null) {
          nextOverlays.push({
            organization_id: organizationId,
            smart_sheet_id: input.sheetId,
            row_id: rowId,
            column_key: destinationColumnKey,
            value: null,
            is_blank: true,
            source: "horizontal_shift",
            source_column_key: null,
            source_row_id: rowId,
          });
          continue;
        }

        const sourceOverlay =
          overlayMap.get(`${rowId}:${sourceColumnKey}`) ?? null;

        let sourceValue: unknown;
        let sourceIsBlank = false;

        if (sourceOverlay) {
          sourceIsBlank = Boolean(sourceOverlay.is_blank);
          sourceValue = sourceIsBlank ? null : sourceOverlay.value;
        } else if (
          stateModeMap.get(`${rowId}:${sourceColumnKey}`) === "same"
        ) {
          // SAME is visible spreadsheet content and must move like Excel text.
          sourceValue = "SAME";
        } else {
          sourceValue = businessRow[sourceColumnKey] ?? null;
          sourceIsBlank =
            sourceValue === null || sourceValue === undefined;
        }

        nextOverlays.push({
          organization_id: organizationId,
          smart_sheet_id: input.sheetId,
          row_id: rowId,
          column_key: destinationColumnKey,
          value: sourceIsBlank ? null : sourceValue,
          is_blank: sourceIsBlank,
          source: "horizontal_shift",
          source_column_key: sourceColumnKey,
          source_row_id: rowId,
        });

        const sourceFormat =
          formatMap.get(`${rowId}:${sourceColumnKey}`) ?? null;

        if (sourceFormat) {
          const copiedFormat = {
            ...sourceFormat,
            organization_id: organizationId,
            smart_sheet_id: input.sheetId,
            row_id: rowId,
            column_key: destinationColumnKey,
          } as Record<string, unknown>;

          delete copiedFormat.id;
          delete copiedFormat.created_at;
          delete copiedFormat.updated_at;

          nextFormats.push(copiedFormat);
        }
      }
    }

    /*
     * CRITICAL DIFFERENCE FROM V1/V2:
     * We never UPDATE smart_sheet_rows here and never run the business
     * recalculation RPC. The spreadsheet presentation moves; business truth
     * stays in its semantic columns.
     */
    const { error: overlayDeleteError } = await supabase
      .from("smart_sheet_cells")
      .delete()
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .in("row_id", rowIds)
      .in("column_key", affectedColumnKeys);

    if (overlayDeleteError) {
      throw new Error(overlayDeleteError.message);
    }

    if (nextOverlays.length > 0) {
      const { error: overlayInsertError } = await supabase
        .from("smart_sheet_cells")
        .insert(nextOverlays);

      if (overlayInsertError) {
        throw new Error(overlayInsertError.message);
      }
    }

    // Formatting follows the visual cells, but business cell states do not.
    const { error: formatDeleteError } = await supabase
      .from("smart_sheet_cell_formats")
      .delete()
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .in("row_id", rowIds)
      .in("column_key", affectedColumnKeys);

    if (formatDeleteError) {
      throw new Error(formatDeleteError.message);
    }

    if (nextFormats.length > 0) {
      const { error: formatInsertError } = await supabase
        .from("smart_sheet_cell_formats")
        .insert(nextFormats);

      if (formatInsertError) {
        throw new Error(formatInsertError.message);
      }
    }

    const historyAfter = await captureSmartSheetHistorySnapshot(
      supabase,
      input.sheetId,
      organizationId,
      rowIds,
    );

    await recordSmartSheetHistorySnapshots(
      supabase,
      input.sheetId,
      organizationId,
      "cell_shift",
      `Delete Cells Shift Left (${rowIds.length} row${rowIds.length === 1 ? "" : "s"} × ${shiftWidth} column${shiftWidth === 1 ? "" : "s"})`,
      historyBefore,
      historyAfter,
    );

    revalidateSmartSheet(input.sheetId);

    const deletedCount = rowIds.length * shiftWidth;

    return {
      ok: true,
      message: `${deletedCount} selected cell${deletedCount === 1 ? "" : "s"} deleted; cells shifted left.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to delete Smart Sheet cells and shift left.",
    };
  }
}

/* =========================================================
   INSERT CELLS — SHIFT RIGHT
   Spreadsheet overlay layer only.
   ========================================================= */

export async function shiftSmartSheetCellsRight(
  input: ShiftSmartSheetCellsRightInput,
): Promise<ActionResult> {
  try {
    if (!Array.isArray(input.rowIds) || input.rowIds.length === 0) {
      throw new Error("No Smart Sheet rows were selected.");
    }

    if (
      !Array.isArray(input.orderedColumnKeys) ||
      input.orderedColumnKeys.length === 0
    ) {
      throw new Error("No Smart Sheet columns were provided.");
    }

    const allowedColumns = new Set([
      ...textColumns,
      ...numericInputColumns,
      ...calculatedNumericColumns,
    ]);

    const orderedColumnKeys = input.orderedColumnKeys.filter(
      (columnKey, index, values) =>
        allowedColumns.has(columnKey) &&
        values.indexOf(columnKey) === index,
    );

    const startColumnIndex = Math.max(
      0,
      Math.min(input.startColumnIndex, input.endColumnIndex),
    );

    const endColumnIndex = Math.min(
      orderedColumnKeys.length - 1,
      Math.max(input.startColumnIndex, input.endColumnIndex),
    );

    if (
      orderedColumnKeys.length === 0 ||
      startColumnIndex > endColumnIndex
    ) {
      throw new Error("The selected cell range is not valid.");
    }

    const shiftWidth = endColumnIndex - startColumnIndex + 1;
    const affectedColumnKeys = orderedColumnKeys.slice(startColumnIndex);

    if (input.rowIds.length * affectedColumnKeys.length > 3000) {
      throw new Error(
        "Cell shifting is limited to 3,000 affected cells at a time.",
      );
    }

    const { supabase, organizationId } =
      await getAuthorizedContext(input.sheetId);

    const rowIds = Array.from(new Set(input.rowIds));

    const verifiedRows = new Map<string, Record<string, unknown>>();

    for (const rowId of rowIds) {
      const row = await verifyRow(
        supabase,
        input.sheetId,
        rowId,
        organizationId,
      );

      verifiedRows.set(
        rowId,
        row as Record<string, unknown>,
      );
    }

    /*
     * Exact history already includes smart_sheet_cells, so this operation can
     * be undone/redone without touching semantic smart_sheet_rows values.
     */
    const historyBefore =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        rowIds,
      );

    const {
      data: existingOverlays,
      error: overlayReadError,
    } =
      await supabase
        .from("smart_sheet_cells")
        .select("*")
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "row_id",
          rowIds,
        );

    if (overlayReadError) {
      throw new Error(
        overlayReadError.message,
      );
    }

    const overlayMap =
      new Map<
        string,
        Record<string, unknown>
      >(
        (existingOverlays ?? []).map(
          (overlay) => [
            `${overlay.row_id}:${overlay.column_key}`,
            overlay as Record<
              string,
              unknown
            >,
          ],
        ),
      );

    const {
      data: currentStates,
      error: statesError,
    } =
      await supabase
        .from(
          "smart_sheet_cell_states",
        )
        .select(
          "row_id,column_key,mode",
        )
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "row_id",
          rowIds,
        );

    if (statesError) {
      throw new Error(
        statesError.message,
      );
    }

    const stateModeMap =
      new Map<string, string>(
        (currentStates ?? []).map(
          (state) => [
            `${state.row_id}:${state.column_key}`,
            String(
              state.mode ?? "",
            ),
          ],
        ),
      );

    const {
      data: currentFormats,
      error: formatsError,
    } =
      await supabase
        .from(
          "smart_sheet_cell_formats",
        )
        .select("*")
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "row_id",
          rowIds,
        )
        .in(
          "column_key",
          affectedColumnKeys,
        );

    if (formatsError) {
      throw new Error(
        formatsError.message,
      );
    }

    const formatMap =
      new Map<
        string,
        Record<string, unknown>
      >(
        (currentFormats ?? []).map(
          (format) => [
            `${format.row_id}:${format.column_key}`,
            format as Record<
              string,
              unknown
            >,
          ],
        ),
      );

    const nextOverlays:
      Record<string, unknown>[] =
        [];

    const nextFormats:
      Record<string, unknown>[] =
        [];

    for (const rowId of rowIds) {
      const businessRow =
        verifiedRows.get(rowId);

      if (!businessRow) {
        continue;
      }

      /*
       * Iterate from right to left conceptually. All source reads come from
       * immutable snapshots (businessRow/overlayMap/formatMap), so there is no
       * overwrite cascade.
       *
       * Selected cells become blank; everything from the selection's start
       * onward moves right by the selection width. Values pushed beyond the
       * last visible Smart Sheet column leave the visual grid, matching Excel.
       */
      for (
        let destinationIndex =
          orderedColumnKeys.length - 1;
        destinationIndex >=
        startColumnIndex;
        destinationIndex -= 1
      ) {
        const destinationColumnKey =
          orderedColumnKeys[
            destinationIndex
          ];

        const sourceIndex =
          destinationIndex -
          shiftWidth;

        const sourceColumnKey =
          sourceIndex >=
          startColumnIndex
            ? orderedColumnKeys[
                sourceIndex
              ]
            : null;

        if (
          sourceColumnKey === null
        ) {
          nextOverlays.push({
            organization_id:
              organizationId,
            smart_sheet_id:
              input.sheetId,
            row_id:
              rowId,
            column_key:
              destinationColumnKey,
            value:
              null,
            is_blank:
              true,
            source:
              "horizontal_shift",
            source_column_key:
              null,
            source_row_id:
              rowId,
          });

          continue;
        }

        const sourceOverlay =
          overlayMap.get(
            `${rowId}:${sourceColumnKey}`,
          ) ?? null;

        let sourceValue:
          unknown;

        let sourceIsBlank =
          false;

        if (sourceOverlay) {
          sourceIsBlank =
            Boolean(
              sourceOverlay.is_blank,
            );

          sourceValue =
            sourceIsBlank
              ? null
              : sourceOverlay.value;
        } else if (
          stateModeMap.get(
            `${rowId}:${sourceColumnKey}`,
          ) === "same"
        ) {
          sourceValue =
            "SAME";
        } else {
          sourceValue =
            businessRow[
              sourceColumnKey
            ] ?? null;

          sourceIsBlank =
            sourceValue === null ||
            sourceValue ===
              undefined;
        }

        nextOverlays.push({
          organization_id:
            organizationId,
          smart_sheet_id:
            input.sheetId,
          row_id:
            rowId,
          column_key:
            destinationColumnKey,
          value:
            sourceIsBlank
              ? null
              : sourceValue,
          is_blank:
            sourceIsBlank,
          source:
            "horizontal_shift",
          source_column_key:
            sourceColumnKey,
          source_row_id:
            rowId,
        });

        const sourceFormat =
          formatMap.get(
            `${rowId}:${sourceColumnKey}`,
          ) ?? null;

        if (sourceFormat) {
          const copiedFormat = {
            ...sourceFormat,
            organization_id:
              organizationId,
            smart_sheet_id:
              input.sheetId,
            row_id:
              rowId,
            column_key:
              destinationColumnKey,
          } as Record<
            string,
            unknown
          >;

          delete copiedFormat.id;
          delete copiedFormat.created_at;
          delete copiedFormat.updated_at;

          nextFormats.push(
            copiedFormat,
          );
        }
      }
    }

    /*
     * CRITICAL:
     * No smart_sheet_rows UPDATE.
     * No row recalculation.
     * No sheet recalculation.
     */
    const {
      error: overlayDeleteError,
    } =
      await supabase
        .from(
          "smart_sheet_cells",
        )
        .delete()
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "row_id",
          rowIds,
        )
        .in(
          "column_key",
          affectedColumnKeys,
        );

    if (overlayDeleteError) {
      throw new Error(
        overlayDeleteError.message,
      );
    }

    if (
      nextOverlays.length > 0
    ) {
      const {
        error:
          overlayInsertError,
      } =
        await supabase
          .from(
            "smart_sheet_cells",
          )
          .insert(
            nextOverlays,
          );

      if (
        overlayInsertError
      ) {
        throw new Error(
          overlayInsertError.message,
        );
      }
    }

    const {
      error: formatDeleteError,
    } =
      await supabase
        .from(
          "smart_sheet_cell_formats",
        )
        .delete()
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "row_id",
          rowIds,
        )
        .in(
          "column_key",
          affectedColumnKeys,
        );

    if (formatDeleteError) {
      throw new Error(
        formatDeleteError.message,
      );
    }

    if (
      nextFormats.length > 0
    ) {
      const {
        error:
          formatInsertError,
      } =
        await supabase
          .from(
            "smart_sheet_cell_formats",
          )
          .insert(
            nextFormats,
          );

      if (
        formatInsertError
      ) {
        throw new Error(
          formatInsertError.message,
        );
      }
    }

    const historyAfter =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        rowIds,
      );

    await recordSmartSheetHistorySnapshots(
      supabase,
      input.sheetId,
      organizationId,
      "cell_shift",
      `Insert Cells Shift Right (${rowIds.length} row${rowIds.length === 1 ? "" : "s"} × ${shiftWidth} column${shiftWidth === 1 ? "" : "s"})`,
      historyBefore,
      historyAfter,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    const insertedCount =
      rowIds.length *
      shiftWidth;

    return {
      ok: true,
      message:
        `${insertedCount} blank cell${insertedCount === 1 ? "" : "s"} inserted; cells shifted right.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to insert Smart Sheet cells and shift right.",
    };
  }
}


/* =========================================================
   CLEAR / DELETE CELLS
   ========================================================= */

export async function clearSmartSheetCells(
  input: ClearCellsInput,
): Promise<ActionResult> {
  try {
    if (
      !Array.isArray(input.cells) ||
      input.cells.length === 0
    ) {
      throw new Error(
        "No cells were selected to clear.",
      );
    }

    if (input.cells.length > 1000) {
      throw new Error(
        "Clear is limited to 1,000 cells at a time.",
      );
    }

    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    const uniqueRowIds =
      Array.from(
        new Set(
          input.cells.map(
            (cell) => cell.rowId,
          ),
        ),
      );

    const verifiedRows =
      new Set<string>();

    for (const rowId of uniqueRowIds) {
      await verifyRow(
        supabase,
        input.sheetId,
        rowId,
        organizationId,
      );

      verifiedRows.add(
        rowId,
      );
    }

    const historyBefore = await captureSmartSheetHistorySnapshot(
      supabase, input.sheetId, organizationId, uniqueRowIds,
    );

    /*
     * Backspace/Delete must clear the visual spreadsheet cell the customer
     * sees. When an overlay exists, keep the overlay record and make it an
     * intentional blank so the hidden smart_sheet_rows value does not reappear.
     */
    const {
      data: selectedOverlays,
      error: selectedOverlaysError,
    } = await supabase
      .from("smart_sheet_cells")
      .select("id,row_id,column_key")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .in("row_id", uniqueRowIds);

    if (selectedOverlaysError) {
      throw new Error(selectedOverlaysError.message);
    }

    const selectedOverlayMap =
      new Map<
        string,
        { id: string }
      >(
        (selectedOverlays ?? []).map(
          (overlay) => [
            `${overlay.row_id}:${overlay.column_key}`,
            { id: String(overlay.id) },
          ],
        ),
      );

    const affectedRowIds =
      new Set<string>();

    let clearedCount = 0;
    let skippedCount = 0;

    for (const cell of input.cells) {
      if (
        !verifiedRows.has(
          cell.rowId,
        )
      ) {
        skippedCount += 1;
        continue;
      }

      const columnKey =
        cell.columnKey;

      const selectedOverlay =
        selectedOverlayMap.get(
          `${cell.rowId}:${columnKey}`,
        );

      if (selectedOverlay) {
        const {
          error: overlayClearError,
        } = await supabase
          .from("smart_sheet_cells")
          .update({
            value:
              null,
            is_blank:
              true,
            source:
              "user",
          })
          .eq(
            "id",
            selectedOverlay.id,
          )
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          );

        if (overlayClearError) {
          throw new Error(
            overlayClearError.message,
          );
        }

        clearedCount += 1;
        continue;
      }

      const isText =
        textColumns.has(
          columnKey,
        );

      const isNumericInput =
        numericInputColumns.has(
          columnKey,
        );

      const isCalculated =
        calculatedNumericColumns.has(
          columnKey,
        );

      if (
        !isText &&
        !isNumericInput &&
        !isCalculated
      ) {
        skippedCount += 1;
        continue;
      }

      /* =====================================================
         TEXT / DIRECT NUMERIC INPUT
         ===================================================== */

      if (
        isText ||
        isNumericInput
      ) {
        const {
          error: rowError,
        } = await supabase
          .from(
            "smart_sheet_rows",
          )
          .update({
            [columnKey]:
              null,
          })
          .eq(
            "id",
            cell.rowId,
          )
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          );

        if (rowError) {
          throw new Error(
            rowError.message,
          );
        }

        /*
         * A direct-input blank does not need a formula override.
         * Remove any old OCR/manual/SAME state so the database value
         * itself is the source of truth.
         */
        const {
          error: stateDeleteError,
        } = await supabase
          .from(
            "smart_sheet_cell_states",
          )
          .delete()
          .eq(
            "row_id",
            cell.rowId,
          )
          .eq(
            "column_key",
            columnKey,
          )
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          );

        if (stateDeleteError) {
          throw new Error(
            stateDeleteError.message,
          );
        }

        affectedRowIds.add(
          cell.rowId,
        );

        clearedCount += 1;
        continue;
      }

      /* =====================================================
         EDITABLE PRICE / MARKUP / OTHER MANUAL-CAPABLE CELL
         ===================================================== */

      /*
       * IMPORTANT:
       *
       * Backspace/Delete means BLANK, not "restore formula".
       *
       * The previous implementation switched the cell to
       * calculated mode. The row recalculation therefore generated
       * a value immediately and the user saw the old/formula value
       * come straight back.
       *
       * A cleared editable calculated-capable cell is stored as a
       * MANUAL blank. This tells the calculation resolver that the
       * blank is intentional.
       */
      const rowPatch: Record<
        string,
        unknown
      > = {
        [columnKey]:
          null,
      };

      /*
       * If this cell belongs to a price/markup pair, keep the cleared
       * cell as the active driver. The opposite cell can remain
       * calculated from the driver's effective value.
       */
      const driverRule =
        pricingDriverMap[
          columnKey
        ];

      if (driverRule) {
        rowPatch[
          driverRule.driverColumn
        ] =
          driverRule.driver;
      }

      const {
        error: calculatedRowError,
      } = await supabase
        .from(
          "smart_sheet_rows",
        )
        .update(rowPatch)
        .eq(
          "id",
          cell.rowId,
        )
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        );

      if (calculatedRowError) {
        throw new Error(
          calculatedRowError.message,
        );
      }

      const {
        error: blankStateError,
      } = await supabase
        .from(
          "smart_sheet_cell_states",
        )
        .upsert(
          {
            organization_id:
              organizationId,

            smart_sheet_id:
              input.sheetId,

            row_id:
              cell.rowId,

            column_key:
              columnKey,

            mode:
              "manual",

            source:
              "user",

            manual_value:
              null,

            effective_value:
              null,

            is_review_required:
              false,
          },
          {
            onConflict:
              "row_id,column_key",
          },
        );

      if (blankStateError) {
        throw new Error(
          blankStateError.message,
        );
      }

      /*
       * When one side of a price/markup pair is intentionally blank,
       * the opposite side goes back to calculated mode. This preserves
       * the existing driver model and avoids leaving both sides marked
       * as manual overrides.
       */
      const pairedColumn =
        pairedPricingColumnMap[
          columnKey
        ];

      if (pairedColumn) {
        await resetPairedPricingCell({
          supabase,
          organizationId,
          sheetId:
            input.sheetId,
          rowId:
            cell.rowId,
          columnKey:
            pairedColumn,
        });
      }

      affectedRowIds.add(
        cell.rowId,
      );

      clearedCount += 1;
    }

    if (clearedCount === 0) {
      throw new Error(
        "No editable cells were found in the selected range.",
      );
    }

    /*
     * Recalculate once per affected row, then once for the sheet.
     * Manual-null state above must preserve the intentionally blank
     * editable cell while dependent values/totals are updated.
     */
    for (
      const rowId of
      affectedRowIds
    ) {
      await recalculateRow(
        supabase,
        rowId,
      );
    }

    await recalculateSheet(
      supabase,
      input.sheetId,
    );

    await recordSmartSheetHistory(
      supabase, input.sheetId, organizationId, "clear", `Clear ${clearedCount} cells`, historyBefore,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      message:
        skippedCount > 0
          ? `${clearedCount} cells cleared. ${skippedCount} unsupported cells skipped.`
          : `${clearedCount} cells cleared.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to clear Smart Sheet cells.",
    };
  }
}



/* =========================================================
   CLIPBOARD COPY + PASTE WITH FORMATTING
   ========================================================= */

export async function pasteSmartSheetCellsWithFormatting(
  input: PasteCellsWithFormattingInput,
): Promise<ActionResult> {
  let supabase: SupabaseServerClient | null = null;
  let organizationId: string | null = null;
  let userId: string | null = null;
  let historyBefore: SmartSheetHistorySnapshot | null = null;
  let baselineOperationNumber = 0;

  try {
    if (!Array.isArray(input.cells) || input.cells.length === 0) {
      throw new Error("No cells were provided for paste.");
    }

    const context = await getAuthorizedContext(input.sheetId);
    supabase = context.supabase;
    const authorizedOrganizationId = context.organizationId;
    organizationId = authorizedOrganizationId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");
    userId = user.id;

    const rowIds = Array.from(new Set(input.cells.map((cell) => cell.rowId)));
    for (const rowId of rowIds) {
      await verifyRow(supabase, input.sheetId, rowId, authorizedOrganizationId);
    }

    historyBefore = await captureSmartSheetHistorySnapshot(
      supabase, input.sheetId, authorizedOrganizationId, rowIds,
    );

    const { data: latestHistory, error: latestHistoryError } = await supabase
      .from("smart_sheet_history")
      .select("operation_number")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", authorizedOrganizationId)
      .eq("user_id", user.id)
      .order("operation_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestHistoryError) throw new Error(latestHistoryError.message);
    baselineOperationNumber = Number(latestHistory?.operation_number ?? 0);

    const pasteResult = await pasteSmartSheetCells({
      sheetId: input.sheetId,
      cells: input.cells,
    });
    if (!pasteResult.ok) throw new Error(pasteResult.message ?? "Unable to paste cells.");

    if (input.formats.length > 0) {
      const formatResult = await applySmartSheetFormatPainter({
        sheetId: input.sheetId,
        cells: input.formats,
      });
      if (!formatResult.ok) {
        throw new Error(formatResult.message ?? "Unable to paste cell formatting.");
      }
    }

    const historyAfter = await captureSmartSheetHistorySnapshot(
      supabase, input.sheetId, authorizedOrganizationId, rowIds,
    );

    const { error: deleteInternalHistoryError } = await supabase
      .from("smart_sheet_history")
      .delete()
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", authorizedOrganizationId)
      .eq("user_id", user.id)
      .gt("operation_number", baselineOperationNumber);

    if (deleteInternalHistoryError) throw new Error(deleteInternalHistoryError.message);

    await recordSmartSheetHistorySnapshots(
      supabase,
      input.sheetId,
      authorizedOrganizationId,
      "paste",
      `Paste ${input.cells.length} cell${input.cells.length === 1 ? "" : "s"} with formatting`,
      historyBefore,
      historyAfter,
    );

    revalidateSmartSheet(input.sheetId);
    return {
      ok: true,
      message: `${input.cells.length} cell${input.cells.length === 1 ? "" : "s"} pasted with formatting.`,
    };
  } catch (error) {
    if (supabase && organizationId && userId && historyBefore) {
      try {
        await restoreSmartSheetHistorySnapshot(
          supabase, input.sheetId, organizationId, historyBefore,
        );
        await supabase
          .from("smart_sheet_history")
          .delete()
          .eq("smart_sheet_id", input.sheetId)
          .eq("organization_id", organizationId)
          .eq("user_id", userId)
          .gt("operation_number", baselineOperationNumber);
      } catch {}
    }

    return {
      ok: false,
      message: error instanceof Error
        ? error.message
        : "Unable to paste Smart Sheet cells with formatting.",
    };
  }
}


/* =========================================================
   CLIPBOARD CUT + PASTE
   ========================================================= */

export async function cutPasteSmartSheetCells(
  input: CutPasteCellsInput,
): Promise<ActionResult> {
  let supabase: SupabaseServerClient | null = null;
  let organizationId: string | null = null;
  let userId: string | null = null;
  let historyBefore: SmartSheetHistorySnapshot | null = null;
  let baselineOperationNumber = 0;

  try {
    if (
      !Array.isArray(input.sourceCells) ||
      input.sourceCells.length === 0
    ) {
      throw new Error("No source cells were provided for cut.");
    }

    if (
      !Array.isArray(input.destinationCells) ||
      input.destinationCells.length === 0
    ) {
      throw new Error("No destination cells were provided for paste.");
    }

    if (
      input.sourceCells.length > 1000 ||
      input.destinationCells.length > 1000
    ) {
      throw new Error(
        "Cut/Paste is limited to 1,000 source and 1,000 destination cells at a time.",
      );
    }

    const context =
      await getAuthorizedContext(
        input.sheetId,
      );

    supabase = context.supabase;

    const authorizedOrganizationId =
      context.organizationId;

    organizationId =
      authorizedOrganizationId;

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      throw new Error(
        "Authentication required.",
      );
    }

    userId = user.id;

    const rowIds =
      Array.from(
        new Set([
          ...input.sourceCells.map(
            (cell) => cell.rowId,
          ),
          ...input.destinationCells.map(
            (cell) => cell.rowId,
          ),
        ]),
      );

    for (const rowId of rowIds) {
      await verifyRow(
        supabase,
        input.sheetId,
        rowId,
        authorizedOrganizationId,
      );
    }

    historyBefore =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        authorizedOrganizationId,
        rowIds,
      );

    const {
      data: latestHistory,
      error: latestHistoryError,
    } =
      await supabase
        .from("smart_sheet_history")
        .select("operation_number")
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          authorizedOrganizationId,
        )
        .eq(
          "user_id",
          user.id,
        )
        .order(
          "operation_number",
          { ascending: false },
        )
        .limit(1)
        .maybeSingle();

    if (latestHistoryError) {
      throw new Error(
        latestHistoryError.message,
      );
    }

    baselineOperationNumber =
      Number(
        latestHistory
          ?.operation_number ??
          0,
      );

    /*
     * Use the already-proven clear and paste engines so cut semantics
     * preserve manual blanks, SAME, driver rules, formula overrides,
     * recalculation, and validation exactly like ordinary spreadsheet edits.
     *
     * Source is cleared first. Destination values were captured by the client
     * at cut time, so overlapping moves still work correctly.
     */
    const clearResult =
      await clearSmartSheetCells({
        sheetId:
          input.sheetId,
        cells:
          input.sourceCells,
      });

    if (!clearResult.ok) {
      throw new Error(
        clearResult.message ??
          "Unable to clear cut source cells.",
      );
    }

    const pasteResult =
      await pasteSmartSheetCells({
        sheetId:
          input.sheetId,
        cells:
          input.destinationCells,
      });

    if (!pasteResult.ok) {
      throw new Error(
        pasteResult.message ??
          "Unable to paste cut cells.",
      );
    }

    if (
      Array.isArray(
        input.destinationFormats,
      ) &&
      input.destinationFormats.length > 0
    ) {
      const formatResult =
        await applySmartSheetFormatPainter({
          sheetId:
            input.sheetId,
          cells:
            input.destinationFormats,
        });

      if (!formatResult.ok) {
        throw new Error(
          formatResult.message ??
            "Unable to move cell formatting.",
        );
      }

      /*
       * Cut moves formatting rather than copying it. Clear the source format
       * records after the destination has received the captured source style.
       */
      const sourceFormatResult =
        await clearSmartSheetCellFormatting({
          sheetId:
            input.sheetId,
          cells:
            input.sourceCells,
        });

      if (!sourceFormatResult.ok) {
        throw new Error(
          sourceFormatResult.message ??
            "Unable to clear source formatting after cut.",
        );
      }
    }

    const historyAfter =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        authorizedOrganizationId,
        rowIds,
      );

    /*
     * clearSmartSheetCells() and pasteSmartSheetCells() each create their own
     * history entry. Collapse those internal entries into ONE user-visible
     * Cut/Paste operation so one Undo restores the entire move.
     */
    const {
      error: deleteInternalHistoryError,
    } =
      await supabase
        .from("smart_sheet_history")
        .delete()
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          authorizedOrganizationId,
        )
        .eq(
          "user_id",
          user.id,
        )
        .gt(
          "operation_number",
          baselineOperationNumber,
        );

    if (deleteInternalHistoryError) {
      throw new Error(
        deleteInternalHistoryError.message,
      );
    }

    await recordSmartSheetHistorySnapshots(
      supabase,
      input.sheetId,
      authorizedOrganizationId,
      "cut_paste",
      `Cut/Paste ${input.sourceCells.length} cell${input.sourceCells.length === 1 ? "" : "s"}`,
      historyBefore,
      historyAfter,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      message:
        `${input.sourceCells.length} cell${input.sourceCells.length === 1 ? "" : "s"} moved.`,
    };
  } catch (error) {
    /*
     * Best-effort rollback if the second half of the move fails.
     * This restores the exact pre-cut snapshot and removes any temporary
     * history rows created by the internal clear/paste calls.
     */
    if (
      supabase &&
      organizationId &&
      userId &&
      historyBefore
    ) {
      try {
        await restoreSmartSheetHistorySnapshot(
          supabase,
          input.sheetId,
          organizationId,
          historyBefore,
        );

        await supabase
          .from("smart_sheet_history")
          .delete()
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          )
          .eq(
            "user_id",
            userId,
          )
          .gt(
            "operation_number",
            baselineOperationNumber,
          );
      } catch {
        // Preserve the original error message below.
      }
    }

    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to cut and paste Smart Sheet cells.",
    };
  }
}


/* =========================================================
   SAME
   ========================================================= */

export async function setSmartSheetCellSame(
  input: {
    sheetId: string;
    rowId: string;
    columnKey: string;
  },
): Promise<ActionResult> {
  try {
    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    const row =
      await verifyRow(
        supabase,
        input.sheetId,
        input.rowId,
        organizationId,
      );

    if (
      !sameAllowedColumns.has(
        input.columnKey,
      )
    ) {
      throw new Error(
        "SAME is not supported for this column.",
      );
    }

    const historyBefore = await captureSmartSheetHistorySnapshot(
      supabase, input.sheetId, organizationId, [input.rowId],
    );

    const {
      data: existingState,
      error: stateReadError,
    } = await supabase
      .from(
        "smart_sheet_cell_states",
      )
      .select(`
        previous_value,
        effective_value
      `)
      .eq(
        "row_id",
        input.rowId,
      )
      .eq(
        "column_key",
        input.columnKey,
      )
      .maybeSingle();

    if (stateReadError) {
      throw new Error(
        stateReadError.message,
      );
    }

    const rowRecord =
      row as Record<
        string,
        unknown
      >;

    const currentRowValue =
      Number(
        rowRecord[
          input.columnKey
        ],
      );

    const preservedValue =
      existingState
        ?.previous_value !==
        null &&
      existingState
        ?.previous_value !==
        undefined

        ? Number(
            existingState
              .previous_value,
          )

        : currentRowValue;

    if (
      !Number.isFinite(
        preservedValue,
      )
    ) {
      throw new Error(
        "No previous numeric value is available for SAME.",
      );
    }

    /* =====================================================
       SAVE SAME STATE
       ===================================================== */

    const {
      error: stateError,
    } = await supabase
      .from(
        "smart_sheet_cell_states",
      )
      .upsert(
        {
          organization_id:
            organizationId,

          smart_sheet_id:
            input.sheetId,

          row_id:
            input.rowId,

          column_key:
            input.columnKey,

          mode:
            "same",

          source:
            "user",

          previous_value:
            preservedValue,

          manual_value:
            null,

          effective_value:
            preservedValue,

          is_review_required:
            false,
        },
        {
          onConflict:
            "row_id,column_key",
        },
      );

    if (
      stateError
    ) {
      throw new Error(
        stateError.message,
      );
    }

    /* =====================================================
       WRITE PRESERVED VALUE TO ROW
       ===================================================== */

    const {
      error: rowError,
    } = await supabase
      .from(
        "smart_sheet_rows",
      )
      .update({
        [input.columnKey]:
          preservedValue,
      })
      .eq(
        "id",
        input.rowId,
      )
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      );

    if (
      rowError
    ) {
      throw new Error(
        rowError.message,
      );
    }

    /* =====================================================
       SAME DRIVER LOGIC
       =====================================================

       PRICE = SAME
       -> preserve price
       -> PRICE becomes driver
       -> MARKUP becomes calculated

       MARKUP = SAME
       -> preserve markup
       -> MARKUP becomes driver
       -> PRICE becomes calculated
    */

    const driverRule =
      pricingDriverMap[
        input.columnKey
      ];

    if (driverRule) {
      const {
        error:
          driverUpdateError,
      } = await supabase
        .from(
          "smart_sheet_rows",
        )
        .update({
          [driverRule.driverColumn]:
            driverRule.driver,
        })
        .eq(
          "id",
          input.rowId,
        )
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        );

      if (
        driverUpdateError
      ) {
        throw new Error(
          driverUpdateError.message,
        );
      }
    }

    /*
     * Paired cell must become
     * CALCULATED.
     */
    const pairedColumn =
      pairedPricingColumnMap[
        input.columnKey
      ];

    if (pairedColumn) {
      await resetPairedPricingCell({
        supabase,
        organizationId,
        sheetId:
          input.sheetId,
        rowId:
          input.rowId,
        columnKey:
          pairedColumn,
      });
    }

    /*
     * Only after driver + paired state
     * are correct do we recalculate.
     */
    await recalculateRow(
      supabase,
      input.rowId,
    );

    await recalculateSheet(
      supabase,
      input.sheetId,
    );

    await recordSmartSheetHistory(
      supabase, input.sheetId, organizationId, "same", `SAME ${input.columnKey}`, historyBefore,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      message:
        "Cell kept SAME.",
    };
  } catch (error) {
    return {
      ok: false,

      message:
        error instanceof Error
          ? error.message
          : "Unable to mark this cell SAME.",
    };
  }
}


/* =========================================================
   RESTORE CALCULATED MODE
   ========================================================= */

export async function setSmartSheetCellCalculated(
  input: {
    sheetId: string;
    rowId: string;
    columnKey: string;
  },
): Promise<ActionResult> {
  try {
    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    await verifyRow(
      supabase,
      input.sheetId,
      input.rowId,
      organizationId,
    );

    if (
      !calculatedNumericColumns.has(
        input.columnKey,
      )
    ) {
      throw new Error(
        "Calculated mode is not supported for this column.",
      );
    }

    const driverRule =
      calculatedDriverMap[
        input.columnKey
      ];

    if (driverRule) {
      const {
        error: driverError,
      } = await supabase
        .from(
          "smart_sheet_rows",
        )
        .update({
          [driverRule.driverColumn]:
            driverRule.driver,
        })
        .eq(
          "id",
          input.rowId,
        )
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        );

      if (
        driverError
      ) {
        throw new Error(
          driverError.message,
        );
      }
    }

    const {
      error,
    } = await supabase
      .from(
        "smart_sheet_cell_states",
      )
      .upsert(
        {
          organization_id:
            organizationId,

          smart_sheet_id:
            input.sheetId,

          row_id:
            input.rowId,

          column_key:
            input.columnKey,

          mode:
            "calculated",

          source:
            "formula",

          manual_value:
            null,

          effective_value:
            null,

          is_review_required:
            false,
        },
        {
          onConflict:
            "row_id,column_key",
        },
      );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    await recalculateRow(
      supabase,
      input.rowId,
    );

    await recalculateSheet(
      supabase,
      input.sheetId,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      message:
        "Formula restored.",
    };
  } catch (error) {
    return {
      ok: false,

      message:
        error instanceof Error
          ? error.message
          : "Unable to restore calculated mode.",
    };
  }
}


/* =========================================================
   SET PRICE / MARKUP DRIVER
   ========================================================= */

export async function setSmartSheetDriver(
  input: {
    sheetId: string;
    rowId: string;
    driverColumn: string;
    driver: PricingDriver;
  },
): Promise<ActionResult> {
  try {
    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    await verifyRow(
      supabase,
      input.sheetId,
      input.rowId,
      organizationId,
    );

    if (
      !driverColumns.has(
        input.driverColumn,
      )
    ) {
      throw new Error(
        "Invalid pricing driver.",
      );
    }

    if (
      input.driver !== "price" &&
      input.driver !==
        "markup"
    ) {
      throw new Error(
        "Invalid pricing driver value.",
      );
    }

    const {
      error,
    } = await supabase
      .from(
        "smart_sheet_rows",
      )
      .update({
        [input.driverColumn]:
          input.driver,
      })
      .eq(
        "id",
        input.rowId,
      )
      .eq(
        "smart_sheet_id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    await recalculateRow(
      supabase,
      input.rowId,
    );

    await recalculateSheet(
      supabase,
      input.sheetId,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,

      message:
        error instanceof Error
          ? error.message
          : "Unable to change pricing driver.",
    };
  }
}


/* =========================================================
   FORMULA ENGINE V4.1 — ROW INSERT REFERENCE INTEGRITY
   ========================================================= */

/*
 * Spreadsheet structural edits are different from copy/fill translation:
 * $ locks a reference during COPY, but inserting a physical row still moves
 * both relative and absolute row references in Excel-style spreadsheets.
 *
 * Formula V4.1 intentionally handles ROW INSERTION only. Row deletion and
 * column structural edits remain unchanged until their own tested step.
 */
type FormulaOverlayForRowInsert = {
  id: string;
  rowId: string;
  formula: string;
};

function translateFormulaReferencesForInsertedRows(
  formula: string,
  firstInsertedRowNumber: number,
  insertedCount: number,
) {
  if (
    !formula.trim().startsWith("=") ||
    !Number.isFinite(firstInsertedRowNumber) ||
    !Number.isFinite(insertedCount) ||
    insertedCount < 1
  ) {
    return formula;
  }

  return formula.replace(
    /(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*)/g,
    (
      reference,
      absoluteColumn: string,
      columnLetters: string,
      absoluteRow: string,
      rowDigits: string,
    ) => {
      const rowNumber =
        Number(rowDigits);

      if (
        !Number.isFinite(rowNumber) ||
        rowNumber <
          firstInsertedRowNumber
      ) {
        return reference;
      }

      return `${absoluteColumn}${columnLetters}${absoluteRow}${
        rowNumber + insertedCount
      }`;
    },
  );
}

async function getFormulaOverlaysForRowInsert(
  supabase: SupabaseServerClient,
  sheetId: string,
  organizationId: string,
): Promise<FormulaOverlayForRowInsert[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from("smart_sheet_cells")
      .select("id,row_id,value")
      .eq(
        "smart_sheet_id",
        sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return (data ?? [])
    .flatMap((overlay) => {
      if (
        typeof overlay.value !== "string" ||
        !overlay.value
          .trim()
          .startsWith("=")
      ) {
        return [];
      }

      return [{
        id:
          String(overlay.id),
        rowId:
          String(overlay.row_id),
        formula:
          overlay.value,
      }];
    });
}

async function updateFormulaReferencesForInsertedRows(
  supabase: SupabaseServerClient,
  sheetId: string,
  organizationId: string,
  formulaOverlays: FormulaOverlayForRowInsert[],
  firstInsertedRowNumber: number,
  insertedCount: number,
) {
  for (
    const overlay of
    formulaOverlays
  ) {
    const nextFormula =
      translateFormulaReferencesForInsertedRows(
        overlay.formula,
        firstInsertedRowNumber,
        insertedCount,
      );

    if (
      nextFormula ===
      overlay.formula
    ) {
      continue;
    }

    const {
      error,
    } =
      await supabase
        .from(
          "smart_sheet_cells",
        )
        .update({
          value:
            nextFormula,
        })
        .eq(
          "id",
          overlay.id,
        )
        .eq(
          "smart_sheet_id",
          sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        );

    if (error) {
      throw new Error(
        error.message,
      );
    }
  }
}


/* =========================================================
   SMART SHEET ROW NUMBER INTEGRITY
   ========================================================= */

/*
 * Persisted row_number must always describe the current physical sheet order
 * as a continuous 1..N sequence.
 *
 * Structural RPCs normally renumber rows themselves, but interrupted or
 * partially-replayed Undo/Redo history can leave gaps such as 1,2,4,5...
 * Formula structural translation relies on trustworthy physical row numbers,
 * so every structural entry point repairs the existing order first and then
 * re-normalizes after the mutation.
 *
 * Two-pass numbering avoids collisions when row_number is unique:
 * pass 1 -> move every row into a temporary range
 * pass 2 -> assign exact 1..N in the same current order.
 *
 * Row UUID identity, row order, business values, cell states, overlays,
 * formatting, formulas, and sheet totals are not changed.
 */
async function normalizeSmartSheetRowNumbers(
  supabase: SupabaseServerClient,
  sheetId: string,
  organizationId: string,
) {
  const {
    data: rows,
    error: rowsError,
  } = await supabase
    .from("smart_sheet_rows")
    .select("id,row_number")
    .eq("smart_sheet_id", sheetId)
    .eq("organization_id", organizationId)
    .order("row_number", { ascending: true })
    .order("id", { ascending: true });

  if (rowsError) {
    throw new Error(rowsError.message);
  }

  const orderedRows = rows ?? [];

  if (orderedRows.length === 0) {
    return;
  }

  const alreadyContinuous =
    orderedRows.every(
      (row, index) =>
        Number(row.row_number) === index + 1,
    );

  if (alreadyContinuous) {
    return;
  }

  const highestExistingRowNumber =
    orderedRows.reduce(
      (highest, row) => {
        const value = Number(row.row_number);

        return Number.isFinite(value)
          ? Math.max(highest, value)
          : highest;
      },
      0,
    );

  const temporaryBase =
    highestExistingRowNumber +
    orderedRows.length +
    1000;

  for (
    let index = 0;
    index < orderedRows.length;
    index += 1
  ) {
    const rowId =
      String(orderedRows[index].id ?? "");

    if (!rowId) {
      throw new Error(
        "A Smart Sheet row is missing its id.",
      );
    }

    const {
      error: temporaryError,
    } = await supabase
      .from("smart_sheet_rows")
      .update({
        row_number:
          temporaryBase + index + 1,
      })
      .eq("id", rowId)
      .eq("smart_sheet_id", sheetId)
      .eq("organization_id", organizationId);

    if (temporaryError) {
      throw new Error(
        temporaryError.message,
      );
    }
  }

  for (
    let index = 0;
    index < orderedRows.length;
    index += 1
  ) {
    const rowId =
      String(orderedRows[index].id ?? "");

    const {
      error: finalNumberError,
    } = await supabase
      .from("smart_sheet_rows")
      .update({
        row_number: index + 1,
      })
      .eq("id", rowId)
      .eq("smart_sheet_id", sheetId)
      .eq("organization_id", organizationId);

    if (finalNumberError) {
      throw new Error(
        finalNumberError.message,
      );
    }
  }
}


/* =========================================================
   INSERT FIRST SMART SHEET ROW
   ========================================================= */

/*
 * Creates row 1 for a genuinely empty Smart Sheet.
 *
 * The normal insertSmartSheetRow() action requires an existing anchor row.
 * This action exists only for the zero-row case. The database RPC performs
 * the final authorization and empty-sheet check atomically.
 *
 * No invoice/product/business values are created here.
 */
export async function insertFirstSmartSheetRow(
  input: {
    sheetId: string;
  },
): Promise<InsertRowResult> {
  try {
    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    /*
     * Capture the empty pre-insert state so the first row participates in
     * the same structural Undo/Redo model as every later inserted row.
     */
    const beforeBase =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        [],
      );

    const {
      data,
      error,
    } = await supabase.rpc(
      "insert_first_smart_sheet_row_secure",
      {
        requested_sheet_id:
          input.sheetId,
      },
    );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    const inserted =
      Array.isArray(data)
        ? data[0]
        : data;

    const rowId =
      inserted &&
      typeof inserted === "object" &&
      "row_id" in inserted
        ? String(
            inserted.row_id,
          )
        : undefined;

    const rawRowNumber =
      inserted &&
      typeof inserted === "object" &&
      "row_number" in inserted
        ? Number(
            inserted.row_number,
          )
        : NaN;

    const rowNumber =
      Number.isFinite(
        rawRowNumber,
      )
        ? rawRowNumber
        : undefined;

    if (!rowId) {
      throw new Error(
        "Inserted row id was not returned.",
      );
    }

    const afterCaptured =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        [rowId],
      );

    const rowSnapshot =
      afterCaptured.rows.find(
        (row) =>
          String(row.id) ===
          rowId,
      );

    if (!rowSnapshot) {
      throw new Error(
        "Unable to capture the inserted row for Undo/Redo.",
      );
    }

    const insertedRowStates =
      afterCaptured.states.filter(
        (state) =>
          String(
            state.row_id ?? "",
          ) === rowId,
      );

    const beforeSnapshot: SmartSheetHistorySnapshot = {
      ...beforeBase,
      rowIds: [rowId],
      structure: {
        rowSnapshot,
        states:
          insertedRowStates,
        shouldExist: false,
      },
    };

    const afterSnapshot: SmartSheetHistorySnapshot = {
      ...afterCaptured,
      rowIds: [rowId],
      structure: {
        rowSnapshot,
        states:
          insertedRowStates,
        shouldExist: true,
      },
    };

    await recordSmartSheetHistorySnapshots(
      supabase,
      input.sheetId,
      organizationId,
      "insert_row",
      rowNumber !== undefined
        ? `Insert row ${rowNumber}`
        : "Insert row",
      beforeSnapshot,
      afterSnapshot,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,

      message:
        rowNumber !== undefined
          ? `Inserted row ${rowNumber}.`
          : "Row inserted.",

      rowId,
      rowNumber,
    };
  } catch (error) {
    return {
      ok: false,

      message:
        error instanceof Error
          ? error.message
          : "Unable to insert the first Smart Sheet row.",
    };
  }
}


/* =========================================================
   INSERT SMART SHEET ROW
   ========================================================= */

export async function insertSmartSheetRow(
  input: {
    sheetId: string;
    anchorRowId: string;
    position: "above" | "below";
  },
): Promise<InsertRowResult> {
  try {
    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    await normalizeSmartSheetRowNumbers(
      supabase,
      input.sheetId,
      organizationId,
    );

    if (
      input.position !== "above" &&
      input.position !== "below"
    ) {
      throw new Error(
        "Row position must be above or below.",
      );
    }

    const anchorRow =
      await verifyRow(
        supabase,
        input.sheetId,
        input.anchorRowId,
        organizationId,
      );

    const anchorRowNumber =
      Number(
        anchorRow.row_number,
      );

    if (
      !Number.isFinite(
        anchorRowNumber,
      )
    ) {
      throw new Error(
        "Unable to resolve the anchor row number.",
      );
    }

    const firstInsertedRowNumber =
      anchorRowNumber +
      (
        input.position ===
        "below"
          ? 1
          : 0
      );

    /*
     * Formula Engine V4.1:
     * Capture every row that currently owns a user spreadsheet formula.
     * These rows join the same structural history transaction so Undo/Redo
     * restores both the inserted row and all formula reference adjustments.
     */
    const formulaOverlaysBefore =
      await getFormulaOverlaysForRowInsert(
        supabase,
        input.sheetId,
        organizationId,
      );

    const formulaRowIds =
      Array.from(
        new Set(
          formulaOverlaysBefore.map(
            (overlay) =>
              overlay.rowId,
          ),
        ),
      );

    const beforeBase =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        formulaRowIds,
      );

    const {
      data,
      error,
    } = await supabase.rpc(
      "insert_smart_sheet_row_secure",
      {
        requested_sheet_id:
          input.sheetId,

        requested_anchor_row_id:
          input.anchorRowId,

        requested_position:
          input.position,
      },
    );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    await normalizeSmartSheetRowNumbers(
      supabase,
      input.sheetId,
      organizationId,
    );

    const inserted =
      Array.isArray(data)
        ? data[0]
        : data;

    const rowId =
      inserted &&
      typeof inserted === "object" &&
      "row_id" in inserted
        ? String(
            inserted.row_id,
          )
        : undefined;

    const rawRowNumber =
      inserted &&
      typeof inserted === "object" &&
      "row_number" in inserted
        ? Number(
            inserted.row_number,
          )
        : NaN;

    const rowNumber =
      Number.isFinite(
        rawRowNumber,
      )
        ? rawRowNumber
        : undefined;

    if (!rowId) {
      throw new Error(
        "Inserted row id was not returned.",
      );
    }

    await updateFormulaReferencesForInsertedRows(
      supabase,
      input.sheetId,
      organizationId,
      formulaOverlaysBefore,
      firstInsertedRowNumber,
      1,
    );

    const historyRowIds =
      Array.from(
        new Set([
          ...formulaRowIds,
          rowId,
        ]),
      );

    /*
     * Capture the exact newly-created row + formula/manual cell states AFTER
     * insertion. The same row snapshot is carried by both history sides:
     *
     * before -> shouldExist=false
     * after  -> shouldExist=true
     */
    const afterCaptured =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        historyRowIds,
      );

    const rowSnapshot =
      afterCaptured.rows.find(
        (row) =>
          String(row.id) ===
          rowId,
      );

    if (!rowSnapshot) {
      throw new Error(
        "Unable to capture the inserted row for Undo/Redo.",
      );
    }

    const insertedRowStates =
      afterCaptured.states.filter(
        (state) =>
          String(
            state.row_id ?? "",
          ) === rowId,
      );

    const beforeSnapshot: SmartSheetHistorySnapshot = {
      ...beforeBase,
      rowIds:
        historyRowIds,
      structure: {
        rowSnapshot,
        states:
          insertedRowStates,
        shouldExist: false,
      },
    };

    const afterSnapshot: SmartSheetHistorySnapshot = {
      ...afterCaptured,
      rowIds:
        historyRowIds,
      structure: {
        rowSnapshot,
        states:
          insertedRowStates,
        shouldExist: true,
      },
    };

    await recordSmartSheetHistorySnapshots(
      supabase,
      input.sheetId,
      organizationId,
      "insert_row",
      rowNumber !== undefined
        ? `Insert row ${rowNumber}`
        : "Insert row",
      beforeSnapshot,
      afterSnapshot,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,

      message:
        rowNumber !== undefined
          ? `Inserted row ${rowNumber}.`
          : "Row inserted.",

      rowId,
      rowNumber,
    };
  } catch (error) {
    return {
      ok: false,

      message:
        error instanceof Error
          ? error.message
          : "Unable to insert Smart Sheet row.",
    };
  }
}


/* =========================================================
   INSERT MULTIPLE SMART SHEET ROWS
   ========================================================= */

export async function insertSmartSheetRows(
  input: {
    sheetId: string;
    anchorRowId: string;
    count: number;
    position: "above" | "below";
  },
): Promise<InsertRowsResult> {
  try {
    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    await normalizeSmartSheetRowNumbers(
      supabase,
      input.sheetId,
      organizationId,
    );

    if (
      input.position !== "above" &&
      input.position !== "below"
    ) {
      throw new Error(
        "Row position must be above or below.",
      );
    }

    const count =
      Math.trunc(
        Number(input.count),
      );

    if (
      !Number.isFinite(count) ||
      count < 1
    ) {
      throw new Error(
        "Insert count must be at least 1.",
      );
    }

    if (count > 100) {
      throw new Error(
        "You can insert up to 100 rows at a time.",
      );
    }

    /*
     * Authorize the structural anchor before beginning the operation and keep
     * its physical row number as the stable insertion boundary.
     */
    const anchorRow =
      await verifyRow(
        supabase,
        input.sheetId,
        input.anchorRowId,
        organizationId,
      );

    const anchorRowNumber =
      Number(
        anchorRow.row_number,
      );

    if (
      !Number.isFinite(
        anchorRowNumber,
      )
    ) {
      throw new Error(
        "Unable to resolve the anchor row number.",
      );
    }

    const firstInsertedRowNumber =
      anchorRowNumber +
      (
        input.position ===
        "below"
          ? 1
          : 0
      );

    const formulaOverlaysBefore =
      await getFormulaOverlaysForRowInsert(
        supabase,
        input.sheetId,
        organizationId,
      );

    const formulaRowIds =
      Array.from(
        new Set(
          formulaOverlaysBefore.map(
            (overlay) =>
              overlay.rowId,
          ),
        ),
      );

    /*
     * Formula rows participate in the SAME exact history operation as the
     * inserted rows so one Undo/Redo restores structural references too.
     */
    const beforeBase =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        formulaRowIds,
      );

    const insertedRowIds: string[] = [];

    /*
     * Reuse the proven secure single-row insertion RPC. Keeping the same
     * anchor is intentional: blank rows are structurally equivalent, and
     * the database renumbers the sheet after every insertion.
     *
     * ABOVE -> all new rows appear immediately before the selected range.
     * BELOW -> all new rows appear immediately after the selected range.
     */
    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      const {
        data,
        error,
      } = await supabase.rpc(
        "insert_smart_sheet_row_secure",
        {
          requested_sheet_id:
            input.sheetId,

          requested_anchor_row_id:
            input.anchorRowId,

          requested_position:
            input.position,
        },
      );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      const inserted =
        Array.isArray(data)
          ? data[0]
          : data;

      const rowId =
        inserted &&
        typeof inserted === "object" &&
        "row_id" in inserted
          ? String(
              inserted.row_id,
            )
          : "";

      if (!rowId) {
        throw new Error(
          "An inserted row id was not returned.",
        );
      }

      insertedRowIds.push(
        rowId,
      );
    }

    await normalizeSmartSheetRowNumbers(
      supabase,
      input.sheetId,
      organizationId,
    );

    await updateFormulaReferencesForInsertedRows(
      supabase,
      input.sheetId,
      organizationId,
      formulaOverlaysBefore,
      firstInsertedRowNumber,
      count,
    );

    const historyRowIds =
      Array.from(
        new Set([
          ...formulaRowIds,
          ...insertedRowIds,
        ]),
      );

    /*
     * Capture every inserted row and its generated cell states only after
     * the complete insertion. This makes the whole multi-row operation one
     * exact Undo/Redo history transaction.
     */
    const afterCaptured =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        historyRowIds,
      );

    const insertedRowIdSet =
      new Set(
        insertedRowIds,
      );

    const insertedRowsCaptured =
      afterCaptured.rows.filter(
        (row) =>
          insertedRowIdSet.has(
            String(
              row.id ?? "",
            ),
          ),
      );

    if (
      insertedRowsCaptured.length !==
      insertedRowIds.length
    ) {
      throw new Error(
        "Unable to capture all inserted rows for Undo/Redo.",
      );
    }

    const stateGroups =
      new Map<
        string,
        Record<string, unknown>[]
      >();

    for (
      const state of
      afterCaptured.states
    ) {
      const rowId =
        String(
          state.row_id ?? "",
        );

      const group =
        stateGroups.get(rowId) ??
        [];

      group.push(state);

      stateGroups.set(
        rowId,
        group,
      );
    }

    const orderedRows =
      insertedRowsCaptured
        .slice()
        .sort(
          (a, b) =>
            Number(
              a.row_number ?? 0,
            ) -
            Number(
              b.row_number ?? 0,
            ),
        );

    const structuresAfter:
      SmartSheetStructuralHistory[] =
      orderedRows.map(
        (rowSnapshot) => {
          const rowId =
            String(
              rowSnapshot.id ?? "",
            );

          return {
            rowSnapshot,
            states:
              stateGroups.get(
                rowId,
              ) ?? [],
            shouldExist: true,
          };
        },
      );

    const structuresBefore:
      SmartSheetStructuralHistory[] =
      structuresAfter.map(
        (structure) => ({
          ...structure,
          shouldExist: false,
        }),
      );

    const beforeSnapshot:
      SmartSheetHistorySnapshot = {
      ...beforeBase,
      rowIds:
        historyRowIds,
      structures:
        structuresBefore,
    };

    const afterSnapshot:
      SmartSheetHistorySnapshot = {
      ...afterCaptured,
      rowIds:
        historyRowIds,
      structures:
        structuresAfter,
    };

    const firstRow =
      orderedRows[0];

    const lastRow =
      orderedRows[
        orderedRows.length - 1
      ];

    const firstRowId =
      firstRow?.id
        ? String(firstRow.id)
        : undefined;

    const rawFirstRowNumber =
      Number(
        firstRow?.row_number,
      );

    const rawLastRowNumber =
      Number(
        lastRow?.row_number,
      );

    const firstRowNumber =
      Number.isFinite(
        rawFirstRowNumber,
      )
        ? rawFirstRowNumber
        : undefined;

    const lastRowNumber =
      Number.isFinite(
        rawLastRowNumber,
      )
        ? rawLastRowNumber
        : undefined;

    const label =
      firstRowNumber !== undefined &&
      lastRowNumber !== undefined
        ? count === 1
          ? `Insert row ${firstRowNumber}`
          : `Insert rows ${firstRowNumber}-${lastRowNumber}`
        : count === 1
          ? "Insert row"
          : `Insert ${count} rows`;

    await recordSmartSheetHistorySnapshots(
      supabase,
      input.sheetId,
      organizationId,
      count === 1
        ? "insert_row"
        : "insert_rows",
      label,
      beforeSnapshot,
      afterSnapshot,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,

      message:
        count === 1
          ? "1 row inserted."
          : `${count} rows inserted.`,

      insertedCount:
        count,

      firstRowId,
      firstRowNumber,
      lastRowNumber,
    };
  } catch (error) {
    return {
      ok: false,

      message:
        error instanceof Error
          ? error.message
          : "Unable to insert Smart Sheet rows.",
    };
  }
}


/* =========================================================
   FORMULA ENGINE V4.2 — ROW DELETE REFERENCE INTEGRITY
   ========================================================= */

/*
 * Excel-style structural row deletion:
 * - references below the deleted block shift upward
 * - references into the deleted block become #REF!
 * - absolute row markers ($) do NOT prevent structural movement
 * - ranges are rewritten endpoint-by-endpoint by the same rule
 *
 * This operates only on formula strings stored in smart_sheet_cells.
 * SAMZY business calculations remain untouched.
 */
function translateFormulaReferencesForDeletedRows(
  formula: string,
  firstDeletedRowNumber: number,
  deletedCount: number,
) {
  if (
    !formula.trim().startsWith("=") ||
    !Number.isFinite(firstDeletedRowNumber) ||
    !Number.isFinite(deletedCount) ||
    deletedCount < 1
  ) {
    return formula;
  }

  const lastDeletedRowNumber =
    firstDeletedRowNumber +
    deletedCount -
    1;

  return formula.replace(
    /(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*)/g,
    (
      reference,
      absoluteColumn: string,
      columnLetters: string,
      absoluteRow: string,
      rowDigits: string,
    ) => {
      const rowNumber =
        Number(rowDigits);

      if (
        !Number.isFinite(rowNumber) ||
        rowNumber <
          firstDeletedRowNumber
      ) {
        return reference;
      }

      if (
        rowNumber <=
        lastDeletedRowNumber
      ) {
        return "#REF!";
      }

      return `${absoluteColumn}${columnLetters}${absoluteRow}${
        rowNumber - deletedCount
      }`;
    },
  );
}

async function updateFormulaReferencesForDeletedRows(
  supabase: SupabaseServerClient,
  sheetId: string,
  organizationId: string,
  formulaOverlays: FormulaOverlayForRowInsert[],
  firstDeletedRowNumber: number,
  deletedCount: number,
) {
  for (
    const overlay of
    formulaOverlays
  ) {
    const nextFormula =
      translateFormulaReferencesForDeletedRows(
        overlay.formula,
        firstDeletedRowNumber,
        deletedCount,
      );

    if (
      nextFormula ===
      overlay.formula
    ) {
      continue;
    }

    const {
      error,
    } =
      await supabase
        .from(
          "smart_sheet_cells",
        )
        .update({
          value:
            nextFormula,
        })
        .eq(
          "id",
          overlay.id,
        )
        .eq(
          "smart_sheet_id",
          sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        );

    if (error) {
      throw new Error(
        error.message,
      );
    }
  }
}


/* =========================================================
   FORMULA ENGINE V4.4 — ROW REORDER REFERENCE INTEGRITY
   ========================================================= */

/*
 * Row reorder preserves logical row identity.
 *
 * Every A1 row reference is mapped:
 *   old row number -> permanent row UUID -> new row number.
 *
 * For ranges we preserve the complete logical row set whenever the reordered
 * rows still occupy one contiguous row interval. If a move would turn a
 * previously-contiguous formula range into a discontiguous set, the operation
 * is rejected rather than silently changing spreadsheet meaning.
 */
function translateFormulaReferencesForReorderedRows(
  formula: string,
  oldRowIdByNumber: Map<number, string>,
  newRowNumberById: Map<string, number>,
) {
  if (!formula.trim().startsWith("=")) {
    return formula;
  }

  const protectedRanges: string[] = [];

  const withProtectedRanges =
    formula.replace(
      /(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*)\s*:\s*(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*)/g,
      (
        _range,
        startAbsoluteColumn: string,
        startColumnLetters: string,
        startAbsoluteRow: string,
        startRowDigits: string,
        endAbsoluteColumn: string,
        endColumnLetters: string,
        endAbsoluteRow: string,
        endRowDigits: string,
      ) => {
        const startRowNumber =
          Number(startRowDigits);
        const endRowNumber =
          Number(endRowDigits);

        const firstRowNumber =
          Math.min(
            startRowNumber,
            endRowNumber,
          );
        const lastRowNumber =
          Math.max(
            startRowNumber,
            endRowNumber,
          );

        const logicalRowIds: string[] = [];

        for (
          let rowNumber = firstRowNumber;
          rowNumber <= lastRowNumber;
          rowNumber += 1
        ) {
          const rowId =
            oldRowIdByNumber.get(
              rowNumber,
            );

          if (!rowId) {
            throw new Error(
              `Formula range references unavailable row ${rowNumber}.`,
            );
          }

          logicalRowIds.push(
            rowId,
          );
        }

        const nextRowNumbers =
          logicalRowIds
            .map((rowId) =>
              newRowNumberById.get(
                rowId,
              ),
            )
            .filter(
              (
                value,
              ): value is number =>
                typeof value === "number" &&
                Number.isFinite(value),
            )
            .sort(
              (a, b) =>
                a - b,
            );

        if (
          nextRowNumbers.length !==
          logicalRowIds.length
        ) {
          throw new Error(
            "Unable to preserve a formula range during row reorder.",
          );
        }

        for (
          let index = 1;
          index <
          nextRowNumbers.length;
          index += 1
        ) {
          if (
            nextRowNumbers[index] !==
            nextRowNumbers[index - 1] +
              1
          ) {
            throw new Error(
              "This row move would make an existing formula range non-contiguous. Move blocked to preserve spreadsheet meaning.",
            );
          }
        }

        const nextFirst =
          nextRowNumbers[0];
        const nextLast =
          nextRowNumbers[
            nextRowNumbers.length - 1
          ];

        const ascending =
          startRowNumber <=
          endRowNumber;

        const nextStartRow =
          ascending
            ? nextFirst
            : nextLast;

        const nextEndRow =
          ascending
            ? nextLast
            : nextFirst;

        const translated =
          `${startAbsoluteColumn}${startColumnLetters}${startAbsoluteRow}${nextStartRow}:` +
          `${endAbsoluteColumn}${endColumnLetters}${endAbsoluteRow}${nextEndRow}`;

        const token =
          `__SAMZY_ROW_RANGE_${protectedRanges.length}__`;

        protectedRanges.push(
          translated,
        );

        return token;
      },
    );

  const translatedDirectReferences =
    withProtectedRanges.replace(
      /(\$?)([A-Za-z]+)(\$?)([1-9][0-9]*)/g,
      (
        reference,
        absoluteColumn: string,
        columnLetters: string,
        absoluteRow: string,
        rowDigits: string,
      ) => {
        const oldRowNumber =
          Number(rowDigits);

        const logicalRowId =
          oldRowIdByNumber.get(
            oldRowNumber,
          );

        if (!logicalRowId) {
          return reference;
        }

        const nextRowNumber =
          newRowNumberById.get(
            logicalRowId,
          );

        if (
          typeof nextRowNumber !==
            "number" ||
          !Number.isFinite(
            nextRowNumber,
          )
        ) {
          return reference;
        }

        return `${absoluteColumn}${columnLetters}${absoluteRow}${nextRowNumber}`;
      },
    );

  return protectedRanges.reduce(
    (result, translatedRange, index) =>
      result.replace(
        `__SAMZY_ROW_RANGE_${index}__`,
        translatedRange,
      ),
    translatedDirectReferences,
  );
}


async function updateFormulaReferencesForReorderedRows(
  supabase: SupabaseServerClient,
  sheetId: string,
  organizationId: string,
  formulaOverlays: FormulaOverlayForRowInsert[],
  oldRowIdByNumber: Map<number, string>,
  newRowNumberById: Map<string, number>,
) {
  /*
   * Translate everything first. If even one range cannot be represented
   * safely after the move, no formula update is written.
   */
  const updates =
    formulaOverlays
      .map((overlay) => ({
        overlay,
        nextFormula:
          translateFormulaReferencesForReorderedRows(
            overlay.formula,
            oldRowIdByNumber,
            newRowNumberById,
          ),
      }))
      .filter(
        ({ overlay, nextFormula }) =>
          nextFormula !==
          overlay.formula,
      );

  for (const {
    overlay,
    nextFormula,
  } of updates) {
    const {
      error,
    } =
      await supabase
        .from(
          "smart_sheet_cells",
        )
        .update({
          value:
            nextFormula,
        })
        .eq(
          "id",
          overlay.id,
        )
        .eq(
          "smart_sheet_id",
          sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        );

    if (error) {
      throw new Error(
        error.message,
      );
    }
  }
}


/* =========================================================
   REORDER ONE SMART SHEET ROW — MOVE UP / DOWN
   ========================================================= */

export async function reorderSmartSheetRow(
  input: {
    sheetId: string;
    rowId: string;
    direction: "up" | "down";
  },
): Promise<ActionResult> {
  try {
    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    if (
      input.direction !== "up" &&
      input.direction !== "down"
    ) {
      throw new Error(
        "Row direction must be up or down.",
      );
    }

    await normalizeSmartSheetRowNumbers(
      supabase,
      input.sheetId,
      organizationId,
    );

    const {
      data: orderedRows,
      error: rowsError,
    } =
      await supabase
        .from(
          "smart_sheet_rows",
        )
        .select(
          "id,row_number",
        )
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .order(
          "row_number",
          {
            ascending: true,
          },
        )
        .order(
          "id",
          {
            ascending: true,
          },
        );

    if (rowsError) {
      throw new Error(
        rowsError.message,
      );
    }

    const currentRows =
      orderedRows ?? [];

    const currentIndex =
      currentRows.findIndex(
        (row) =>
          String(row.id) ===
          input.rowId,
      );

    if (currentIndex < 0) {
      throw new Error(
        "Selected Smart Sheet row was not found.",
      );
    }

    const targetIndex =
      input.direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >=
        currentRows.length
    ) {
      return {
        ok: true,
        message:
          input.direction === "up"
            ? "Row is already at the top."
            : "Row is already at the bottom.",
      };
    }

    const rowIds =
      currentRows.map(
        (row) =>
          String(row.id),
      );

    const oldRowIdByNumber =
      new Map<number, string>(
        currentRows.map(
          (row, index) => [
            Number(
              row.row_number ??
              index + 1,
            ),
            String(row.id),
          ],
        ),
      );

    const nextOrder =
      [...rowIds];

    [
      nextOrder[currentIndex],
      nextOrder[targetIndex],
    ] = [
      nextOrder[targetIndex],
      nextOrder[currentIndex],
    ];

    const newRowNumberById =
      new Map<string, number>(
        nextOrder.map(
          (rowId, index) => [
            rowId,
            index + 1,
          ],
        ),
      );

    const formulaOverlaysBefore =
      await getFormulaOverlaysForRowInsert(
        supabase,
        input.sheetId,
        organizationId,
      );

    /*
     * Validate formula translation before any row_number write.
     */
    for (
      const overlay of
      formulaOverlaysBefore
    ) {
      translateFormulaReferencesForReorderedRows(
        overlay.formula,
        oldRowIdByNumber,
        newRowNumberById,
      );
    }

    /*
     * Row reorder can change row_number for two rows and formula strings
     * anywhere in the sheet. Capture every row so Undo/Redo is exact.
     */
    const beforeSnapshot =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        rowIds,
      );

    const highestCurrentNumber =
      currentRows.reduce(
        (highest, row) =>
          Math.max(
            highest,
            Number(
              row.row_number ??
              0,
            ),
          ),
        0,
      );

    const temporaryBase =
      highestCurrentNumber +
      currentRows.length +
      1000;

    /*
     * Two-pass numbering avoids collisions when row_number is unique.
     */
    for (
      let index = 0;
      index <
      currentRows.length;
      index += 1
    ) {
      const {
        error,
      } =
        await supabase
          .from(
            "smart_sheet_rows",
          )
          .update({
            row_number:
              temporaryBase +
              index +
              1,
          })
          .eq(
            "id",
            String(
              currentRows[index].id,
            ),
          )
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          );

      if (error) {
        throw new Error(
          error.message,
        );
      }
    }

    for (
      let index = 0;
      index <
      nextOrder.length;
      index += 1
    ) {
      const {
        error,
      } =
        await supabase
          .from(
            "smart_sheet_rows",
          )
          .update({
            row_number:
              index + 1,
          })
          .eq(
            "id",
            nextOrder[index],
          )
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          );

      if (error) {
        throw new Error(
          error.message,
        );
      }
    }

    await updateFormulaReferencesForReorderedRows(
      supabase,
      input.sheetId,
      organizationId,
      formulaOverlaysBefore,
      oldRowIdByNumber,
      newRowNumberById,
    );

    const afterSnapshot =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        rowIds,
      );

    await recordSmartSheetHistorySnapshots(
      supabase,
      input.sheetId,
      organizationId,
      "row_reorder",
      input.direction === "up"
        ? "Move row up"
        : "Move row down",
      beforeSnapshot,
      afterSnapshot,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      message:
        input.direction === "up"
          ? "Row moved up."
          : "Row moved down.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to reorder row.",
    };
  }
}



/* =========================================================
   REORDER ONE SMART SHEET ROW — DRAG TO POSITION
   ========================================================= */

export async function reorderSmartSheetRowToPosition(
  input: {
    sheetId: string;
    rowId: string;
    targetRowId: string;
    placement: "before" | "after";
  },
): Promise<ActionResult> {
  try {
    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    if (
      input.placement !== "before" &&
      input.placement !== "after"
    ) {
      throw new Error(
        "Row placement must be before or after.",
      );
    }

    if (
      input.rowId ===
      input.targetRowId
    ) {
      return {
        ok: true,
        message:
          "Row is already in that position.",
      };
    }

    await normalizeSmartSheetRowNumbers(
      supabase,
      input.sheetId,
      organizationId,
    );

    const {
      data: orderedRows,
      error: rowsError,
    } =
      await supabase
        .from(
          "smart_sheet_rows",
        )
        .select(
          "id,row_number",
        )
        .eq(
          "smart_sheet_id",
          input.sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .order(
          "row_number",
          {
            ascending: true,
          },
        )
        .order(
          "id",
          {
            ascending: true,
          },
        );

    if (rowsError) {
      throw new Error(
        rowsError.message,
      );
    }

    const currentRows =
      orderedRows ?? [];

    const rowIds =
      currentRows.map(
        (row) =>
          String(row.id),
      );

    const currentIndex =
      rowIds.indexOf(
        input.rowId,
      );

    const originalTargetIndex =
      rowIds.indexOf(
        input.targetRowId,
      );

    if (
      currentIndex < 0 ||
      originalTargetIndex < 0
    ) {
      throw new Error(
        "Dragged row or destination row was not found.",
      );
    }

    const nextOrder =
      [...rowIds];

    nextOrder.splice(
      currentIndex,
      1,
    );

    const targetIndexAfterRemoval =
      nextOrder.indexOf(
        input.targetRowId,
      );

    if (
      targetIndexAfterRemoval < 0
    ) {
      throw new Error(
        "Unable to resolve the destination row.",
      );
    }

    const insertionIndex =
      input.placement === "before"
        ? targetIndexAfterRemoval
        : targetIndexAfterRemoval + 1;

    nextOrder.splice(
      insertionIndex,
      0,
      input.rowId,
    );

    const unchanged =
      nextOrder.every(
        (rowId, index) =>
          rowId ===
          rowIds[index],
      );

    if (unchanged) {
      return {
        ok: true,
        message:
          "Row is already in that position.",
      };
    }

    const oldRowIdByNumber =
      new Map<number, string>(
        currentRows.map(
          (row, index) => [
            Number(
              row.row_number ??
              index + 1,
            ),
            String(row.id),
          ],
        ),
      );

    const newRowNumberById =
      new Map<string, number>(
        nextOrder.map(
          (rowId, index) => [
            rowId,
            index + 1,
          ],
        ),
      );

    const formulaOverlaysBefore =
      await getFormulaOverlaysForRowInsert(
        supabase,
        input.sheetId,
        organizationId,
      );

    /*
     * Validate every formula before changing row order. A drag that would
     * turn a logical formula range into a non-contiguous set is blocked.
     */
    for (
      const overlay of
      formulaOverlaysBefore
    ) {
      translateFormulaReferencesForReorderedRows(
        overlay.formula,
        oldRowIdByNumber,
        newRowNumberById,
      );
    }

    const beforeSnapshot =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        rowIds,
      );

    const highestCurrentNumber =
      currentRows.reduce(
        (highest, row) =>
          Math.max(
            highest,
            Number(
              row.row_number ??
              0,
            ),
          ),
        0,
      );

    const temporaryBase =
      highestCurrentNumber +
      currentRows.length +
      1000;

    /*
     * Two-pass numbering preserves UUID identity and avoids unique-number
     * collisions while the dragged row is inserted at its final position.
     */
    for (
      let index = 0;
      index <
      currentRows.length;
      index += 1
    ) {
      const {
        error,
      } =
        await supabase
          .from(
            "smart_sheet_rows",
          )
          .update({
            row_number:
              temporaryBase +
              index +
              1,
          })
          .eq(
            "id",
            String(
              currentRows[index].id,
            ),
          )
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          );

      if (error) {
        throw new Error(
          error.message,
        );
      }
    }

    for (
      let index = 0;
      index <
      nextOrder.length;
      index += 1
    ) {
      const {
        error,
      } =
        await supabase
          .from(
            "smart_sheet_rows",
          )
          .update({
            row_number:
              index + 1,
          })
          .eq(
            "id",
            nextOrder[index],
          )
          .eq(
            "smart_sheet_id",
            input.sheetId,
          )
          .eq(
            "organization_id",
            organizationId,
          );

      if (error) {
        throw new Error(
          error.message,
        );
      }
    }

    await updateFormulaReferencesForReorderedRows(
      supabase,
      input.sheetId,
      organizationId,
      formulaOverlaysBefore,
      oldRowIdByNumber,
      newRowNumberById,
    );

    const afterSnapshot =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        rowIds,
      );

    await recordSmartSheetHistorySnapshots(
      supabase,
      input.sheetId,
      organizationId,
      "row_reorder",
      "Drag row to position",
      beforeSnapshot,
      afterSnapshot,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      message:
        "Row order updated.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to reorder row.",
    };
  }
}


/* =========================================================
   DELETE SMART SHEET ROW
   ========================================================= */

export async function deleteSmartSheetRow(
  input: {
    sheetId: string;
    rowId: string;
  },
): Promise<DeleteRowResult> {
  try {
    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    await normalizeSmartSheetRowNumbers(
      supabase,
      input.sheetId,
      organizationId,
    );

    const targetRow =
      await verifyRow(
        supabase,
        input.sheetId,
        input.rowId,
        organizationId,
      );

    const deletedRowNumberFromSnapshot =
      Number(
        targetRow.row_number,
      );

    if (
      !Number.isFinite(
        deletedRowNumberFromSnapshot,
      )
    ) {
      throw new Error(
        "Unable to resolve the selected row number.",
      );
    }

    const formulaOverlaysBefore =
      await getFormulaOverlaysForRowInsert(
        supabase,
        input.sheetId,
        organizationId,
      );

    const formulaRowIds =
      Array.from(
        new Set(
          formulaOverlaysBefore.map(
            (overlay) =>
              overlay.rowId,
          ),
        ),
      );

    const historyRowIds =
      Array.from(
        new Set([
          ...formulaRowIds,
          input.rowId,
        ]),
      );

    /*
     * Capture the exact deleted row AND every row containing a spreadsheet
     * formula so Undo/Redo restores the structural formula rewrite too.
     */
    const beforeCaptured =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        historyRowIds,
      );

    const rowSnapshot =
      beforeCaptured.rows.find(
        (row) =>
          String(row.id) ===
          input.rowId,
      );

    if (!rowSnapshot) {
      throw new Error(
        "Selected Smart Sheet row was not found.",
      );
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "delete_smart_sheet_row_secure",
      {
        requested_sheet_id:
          input.sheetId,

        requested_row_id:
          input.rowId,
      },
    );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    await normalizeSmartSheetRowNumbers(
      supabase,
      input.sheetId,
      organizationId,
    );

    const deleted =
      Array.isArray(data)
        ? data[0]
        : data;

    const rawDeletedRowNumber =
      deleted &&
      typeof deleted === "object" &&
      "deleted_row_number" in deleted
        ? Number(
            deleted.deleted_row_number,
          )
        : NaN;

    const deletedRowNumber =
      Number.isFinite(
        rawDeletedRowNumber,
      )
        ? rawDeletedRowNumber
        : undefined;

    const nextRowId =
      deleted &&
      typeof deleted === "object" &&
      "next_row_id" in deleted &&
      deleted.next_row_id !== null &&
      deleted.next_row_id !== undefined
        ? String(
            deleted.next_row_id,
          )
        : undefined;

    const rawNextRowNumber =
      deleted &&
      typeof deleted === "object" &&
      "next_row_number" in deleted &&
      deleted.next_row_number !== null &&
      deleted.next_row_number !== undefined
        ? Number(
            deleted.next_row_number,
          )
        : NaN;

    const nextRowNumber =
      Number.isFinite(
        rawNextRowNumber,
      )
        ? rawNextRowNumber
        : undefined;

    await updateFormulaReferencesForDeletedRows(
      supabase,
      input.sheetId,
      organizationId,
      formulaOverlaysBefore,
      deletedRowNumberFromSnapshot,
      1,
    );

    /*
     * Capture post-delete sheet aggregates. The deleted row id deliberately
     * resolves to no row/no states on this side of the history operation.
     */
    const afterCaptured =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        historyRowIds,
      );

    const deletedRowStates =
      beforeCaptured.states.filter(
        (state) =>
          String(
            state.row_id ?? "",
          ) === input.rowId,
      );

    const beforeSnapshot: SmartSheetHistorySnapshot = {
      ...beforeCaptured,
      rowIds:
        historyRowIds,
      structure: {
        rowSnapshot,
        states:
          deletedRowStates,
        shouldExist: true,
      },
    };

    const afterSnapshot: SmartSheetHistorySnapshot = {
      ...afterCaptured,
      rowIds:
        historyRowIds,
      structure: {
        rowSnapshot,
        states:
          deletedRowStates,
        shouldExist: false,
      },
    };

    await recordSmartSheetHistorySnapshots(
      supabase,
      input.sheetId,
      organizationId,
      "delete_row",
      deletedRowNumber !== undefined
        ? `Delete row ${deletedRowNumber}`
        : "Delete row",
      beforeSnapshot,
      afterSnapshot,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,

      message:
        deletedRowNumber !== undefined
          ? `Deleted row ${deletedRowNumber}.`
          : "Row deleted.",

      deletedRowNumber,
      nextRowId,
      nextRowNumber,
    };
  } catch (error) {
    return {
      ok: false,

      message:
        error instanceof Error
          ? error.message
          : "Unable to delete Smart Sheet row.",
    };
  }
}


/* =========================================================
   DELETE MULTIPLE SMART SHEET ROWS
   ========================================================= */

export async function deleteSmartSheetRows(
  input: {
    sheetId: string;
    rowIds: string[];
  },
): Promise<DeleteRowsResult> {
  try {
    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    await normalizeSmartSheetRowNumbers(
      supabase,
      input.sheetId,
      organizationId,
    );

    const requestedRowIds =
      Array.from(
        new Set(
          (input.rowIds ?? [])
            .map((rowId) => String(rowId))
            .filter(Boolean),
        ),
      );

    if (requestedRowIds.length === 0) {
      throw new Error(
        "No Smart Sheet rows were selected.",
      );
    }

    /*
     * Verify all requested rows belong to this sheet and capture them in their
     * original structural order. Deleting bottom-up prevents row renumbering
     * from changing the meaning of the remaining requested ids.
     */
    const {
      data: selectedRows,
      error: selectedRowsError,
    } = await supabase
      .from("smart_sheet_rows")
      .select("*")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .in("id", requestedRowIds)
      .order("row_number", { ascending: true });

    if (selectedRowsError) {
      throw new Error(
        selectedRowsError.message,
      );
    }

    if (
      !selectedRows ||
      selectedRows.length !== requestedRowIds.length
    ) {
      throw new Error(
        "One or more selected Smart Sheet rows could not be found.",
      );
    }

    const orderedRowIds =
      selectedRows.map((row) => String(row.id));

    const selectedRowNumbers =
      selectedRows
        .map(
          (row) =>
            Number(
              row.row_number,
            ),
        )
        .filter(
          (value) =>
            Number.isFinite(value),
        );

    if (
      selectedRowNumbers.length !==
      selectedRows.length
    ) {
      throw new Error(
        "Unable to resolve one or more selected row numbers.",
      );
    }

    const firstDeletedRowNumber =
      Math.min(
        ...selectedRowNumbers,
      );

    const lastDeletedRowNumber =
      Math.max(
        ...selectedRowNumbers,
      );

    if (
      lastDeletedRowNumber -
        firstDeletedRowNumber +
        1 !==
      selectedRows.length
    ) {
      throw new Error(
        "Formula-safe multi-row deletion currently requires one contiguous row range.",
      );
    }

    const formulaOverlaysBefore =
      await getFormulaOverlaysForRowInsert(
        supabase,
        input.sheetId,
        organizationId,
      );

    const formulaRowIds =
      Array.from(
        new Set(
          formulaOverlaysBefore.map(
            (overlay) =>
              overlay.rowId,
          ),
        ),
      );

    const historyRowIds =
      Array.from(
        new Set([
          ...formulaRowIds,
          ...orderedRowIds,
        ]),
      );

    const beforeCaptured =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        historyRowIds,
      );

    /*
     * Choose the row that should become active after deletion using the
     * pre-delete order: first surviving row below the selection, otherwise
     * the nearest surviving row above it.
     */
    const {
      data: allRows,
      error: allRowsError,
    } = await supabase
      .from("smart_sheet_rows")
      .select("id,row_number")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .order("row_number", { ascending: true });

    if (allRowsError) {
      throw new Error(
        allRowsError.message,
      );
    }

    const deletingIds = new Set(orderedRowIds);
    const selectedNumbers =
      selectedRows
        .map((row) => Number(row.row_number))
        .filter((value) => Number.isFinite(value));

    const firstSelectedNumber =
      selectedNumbers.length > 0
        ? Math.min(...selectedNumbers)
        : 1;

    const lastSelectedNumber =
      selectedNumbers.length > 0
        ? Math.max(...selectedNumbers)
        : firstSelectedNumber;

    const survivingRows =
      (allRows ?? []).filter(
        (row) => !deletingIds.has(String(row.id)),
      );

    const preferredNext =
      survivingRows.find(
        (row) => Number(row.row_number) > lastSelectedNumber,
      ) ??
      [...survivingRows]
        .reverse()
        .find(
          (row) => Number(row.row_number) < firstSelectedNumber,
        );

    const nextRowId =
      preferredNext
        ? String(preferredNext.id)
        : undefined;

    /*
     * Use the existing secure single-row structural RPC for every selected
     * row. IDs are stable while row numbers are renumbered, so bottom-up is
     * deterministic and safe.
     */
    const rowsBottomUp =
      [...selectedRows].sort(
        (a, b) =>
          Number(b.row_number) - Number(a.row_number),
      );

    for (const row of rowsBottomUp) {
      const {
        error: deleteError,
      } = await supabase.rpc(
        "delete_smart_sheet_row_secure",
        {
          requested_sheet_id:
            input.sheetId,

          requested_row_id:
            String(row.id),
        },
      );

      if (deleteError) {
        throw new Error(
          deleteError.message,
        );
      }
    }

    /*
     * Capture the final sheet aggregates only after the complete structural
     * operation. Deleted row ids intentionally resolve to no rows/states.
     */
    await normalizeSmartSheetRowNumbers(
      supabase,
      input.sheetId,
      organizationId,
    );

    await updateFormulaReferencesForDeletedRows(
      supabase,
      input.sheetId,
      organizationId,
      formulaOverlaysBefore,
      firstDeletedRowNumber,
      orderedRowIds.length,
    );

    const afterCaptured =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        historyRowIds,
      );

    const stateGroups =
      new Map<string, Record<string, unknown>[]>();

    for (const state of beforeCaptured.states) {
      const rowId = String(state.row_id ?? "");
      const group = stateGroups.get(rowId) ?? [];
      group.push(state);
      stateGroups.set(rowId, group);
    }

    /*
     * Only the rows the user actually deleted are structural history rows.
     *
     * Formula-bearing rows are included in beforeCaptured/afterCaptured so
     * their rewritten formulas participate in exact Undo/Redo, but they must
     * NOT be marked shouldExist=false during Redo unless they were themselves
     * selected for deletion. Otherwise Redo can remove a surviving formula row
     * and then fail when restoring that row's cell states because the parent
     * smart_sheet_rows record no longer exists.
     */
    const structuresBefore: SmartSheetStructuralHistory[] =
      beforeCaptured.rows
        .filter(
          (row) =>
            deletingIds.has(
              String(
                row.id ?? "",
              ),
            ),
        )
        .slice()
        .sort(
          (a, b) =>
            Number(a.row_number ?? 0) -
            Number(b.row_number ?? 0),
        )
        .map((rowSnapshot) => {
          const rowId = String(rowSnapshot.id ?? "");

          return {
            rowSnapshot,
            states:
              stateGroups.get(rowId) ?? [],
            shouldExist: true,
          };
        });

    const structuresAfter: SmartSheetStructuralHistory[] =
      structuresBefore.map((structure) => ({
        ...structure,
        shouldExist: false,
      }));

    const beforeSnapshot: SmartSheetHistorySnapshot = {
      ...beforeCaptured,
      structures:
        structuresBefore,
    };

    const afterSnapshot: SmartSheetHistorySnapshot = {
      ...afterCaptured,
      structures:
        structuresAfter,
    };

    const deletedCount =
      structuresBefore.length;

    await recordSmartSheetHistorySnapshots(
      supabase,
      input.sheetId,
      organizationId,
      "delete_rows",
      deletedCount === 1
        ? `Delete row ${firstSelectedNumber}`
        : `Delete rows ${firstSelectedNumber}-${lastSelectedNumber}`,
      beforeSnapshot,
      afterSnapshot,
    );

    let nextRowNumber: number | undefined;

    if (nextRowId) {
      const {
        data: refreshedNext,
        error: refreshedNextError,
      } = await supabase
        .from("smart_sheet_rows")
        .select("row_number")
        .eq("id", nextRowId)
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (refreshedNextError) {
        throw new Error(
          refreshedNextError.message,
        );
      }

      const rawNextRowNumber =
        Number(refreshedNext?.row_number);

      if (Number.isFinite(rawNextRowNumber)) {
        nextRowNumber =
          rawNextRowNumber;
      }
    }

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      message:
        deletedCount === 1
          ? "1 row deleted."
          : `${deletedCount} rows deleted.`,
      deletedCount,
      nextRowId,
      nextRowNumber,
    };
  } catch (error) {
    return {
      ok: false,

      message:
        error instanceof Error
          ? error.message
          : "Unable to delete selected Smart Sheet rows.",
    };
  }
}


/* =========================================================
   SAVE DRAFT
   ========================================================= */

export async function saveSmartSheetDraft(
  input: {
    sheetId: string;
  },
): Promise<ActionResult> {
  try {
    const {
      supabase,
      organizationId,
    } =
      await getAuthorizedContext(
        input.sheetId,
      );

    await recalculateSheet(
      supabase,
      input.sheetId,
    );

    const {
      error,
    } = await supabase
      .from("smart_sheets")
      .update({
        status: "draft",

        last_edited_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        input.sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      message:
        "Draft saved.",
    };
  } catch (error) {
    return {
      ok: false,

      message:
        error instanceof Error
          ? error.message
          : "Unable to save Draft.",
    };
  }
}


/* =========================================================
   CELL STATE HELPERS
   ========================================================= */

async function upsertCellMode({
  supabase,
  organizationId,
  sheetId,
  rowId,
  columnKey,
  mode,
}: {
  supabase:
    SupabaseServerClient;

  organizationId: string;
  sheetId: string;
  rowId: string;
  columnKey: string;
  mode: CellMode;
}) {
  const { error } =
    await supabase
      .from(
        "smart_sheet_cell_states",
      )
      .upsert(
        {
          organization_id:
            organizationId,

          smart_sheet_id:
            sheetId,

          row_id:
            rowId,

          column_key:
            columnKey,

          mode,

          source:
            mode === "manual"
              ? "user"
              : mode,

          is_review_required:
            false,
        },
        {
          onConflict:
            "row_id,column_key",
        },
      );

  if (error) {
    throw new Error(
      error.message,
    );
  }
}


async function upsertNumericCellState({
  supabase,
  organizationId,
  sheetId,
  rowId,
  columnKey,
  value,
  mode,
}: {
  supabase:
    SupabaseServerClient;

  organizationId: string;
  sheetId: string;
  rowId: string;
  columnKey: string;
  value: number;
  mode: CellMode;
}) {
  const { error } =
    await supabase
      .from(
        "smart_sheet_cell_states",
      )
      .upsert(
        {
          organization_id:
            organizationId,

          smart_sheet_id:
            sheetId,

          row_id:
            rowId,

          column_key:
            columnKey,

          mode,

          source:
            mode === "manual"
              ? "user"
              : mode,

          manual_value:
            mode === "manual"
              ? value
              : null,

          effective_value:
            value,

          is_review_required:
            false,
        },
        {
          onConflict:
            "row_id,column_key",
        },
      );

  if (error) {
    throw new Error(
      error.message,
    );
  }
}


/* =========================================================
   RESET OPPOSITE PRICE / MARKUP CELL
   ========================================================= */

async function resetPairedPricingCell({
  supabase,
  organizationId,
  sheetId,
  rowId,
  columnKey,
}: {
  supabase:
    SupabaseServerClient;

  organizationId: string;
  sheetId: string;
  rowId: string;
  columnKey: string;
}) {
  const {
    error,
  } = await supabase
    .from(
      "smart_sheet_cell_states",
    )
    .upsert(
      {
        organization_id:
          organizationId,

        smart_sheet_id:
          sheetId,

        row_id:
          rowId,

        column_key:
          columnKey,

        mode:
          "calculated",

        source:
          "formula",

        /*
         * Remove old manual override.
         *
         * IMPORTANT:
         * previous_value is preserved
         * because SAME may need it later.
         */
        manual_value:
          null,

        effective_value:
          null,

        is_review_required:
          false,
      },
      {
        onConflict:
          "row_id,column_key",
      },
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }
}


/* =========================================================
   SORT SMART SHEET ROWS
   ========================================================= */

const sortableTextColumns = new Set([
  "description",
  "sku_snapshot",
  "barcode_snapshot",
  "pack_size",
  "notes",
]);

const sortableNumericColumns = new Set([
  "quantity",
  "supplier_cost_ex_vat",
  "item_cost",
  "transported_cost",
  "vat_rate",
  "transport_rate",
  "shop_sem_price",
  "c_ivacp_price",
  "shop_com_price",
  "special_price",
  "big_wholesale_price",
  "rest_com_price",
  "public_price",
  "shop_sem_markup",
  "shop_com_markup",
  "special_markup",
  "rest_com_markup",
  "big_wholesale_markup",
]);

export async function sortSmartSheetRows(
  input: {
    sheetId: string;
    columnKey: string;
    direction: SortDirection;
  },
): Promise<SortRowsResult> {
  try {
    const {
      supabase,
      organizationId,
    } = await getAuthorizedContext(
      input.sheetId,
    );

    const isText =
      sortableTextColumns.has(
        input.columnKey,
      );

    const isNumeric =
      sortableNumericColumns.has(
        input.columnKey,
      );

    if (!isText && !isNumeric) {
      throw new Error(
        "This Smart Sheet column cannot be sorted.",
      );
    }

    if (
      input.direction !== "asc" &&
      input.direction !== "desc"
    ) {
      throw new Error(
        "Invalid sort direction.",
      );
    }

    const {
      data: rows,
      error: rowsError,
    } = await supabase
      .from("smart_sheet_rows")
      .select("*")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .order("row_number", { ascending: true });

    if (rowsError) {
      throw new Error(rowsError.message);
    }

    const sourceRows =
      (rows ?? []) as Record<string, unknown>[];

    if (sourceRows.length <= 1) {
      return {
        ok: true,
        message: "Nothing to sort.",
        sortedCount: sourceRows.length,
      };
    }

    const rowIds =
      sourceRows
        .map((row) => String(row.id ?? ""))
        .filter(Boolean);

    const historyBefore =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        rowIds,
      );

    /*
     * SORT — VISIBLE SPREADSHEET VALUE
     *
     * Sorting must use what the customer can actually see, not only the
     * semantic field stored in smart_sheet_rows.
     *
     * Resolution order:
     * 1. smart_sheet_cells overlay
     * 2. SAME state
     * 3. structured business value
     *
     * Row identity does not change. We only renumber rows after sorting, so
     * overlays, formats and cell states remain attached to their row ids.
     */
    const {
      data: sortOverlays,
      error: sortOverlaysError,
    } = await supabase
      .from("smart_sheet_cells")
      .select("row_id,value,is_blank")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .eq("column_key", input.columnKey)
      .in("row_id", rowIds);

    if (sortOverlaysError) {
      throw new Error(
        sortOverlaysError.message,
      );
    }

    const overlayByRowId =
      new Map<
        string,
        {
          value: unknown;
          is_blank: boolean;
        }
      >(
        (sortOverlays ?? []).map(
          (overlay) => [
            String(overlay.row_id),
            {
              value: overlay.value,
              is_blank:
                Boolean(overlay.is_blank),
            },
          ],
        ),
      );

    const {
      data: sortStates,
      error: sortStatesError,
    } = await supabase
      .from("smart_sheet_cell_states")
      .select("row_id,mode")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .eq("column_key", input.columnKey)
      .in("row_id", rowIds);

    if (sortStatesError) {
      throw new Error(
        sortStatesError.message,
      );
    }

    const sameRowIds =
      new Set(
        (sortStates ?? [])
          .filter(
            (state) =>
              state.mode === "same",
          )
          .map(
            (state) =>
              String(state.row_id),
          ),
      );

    function visibleSortValue(
      row: Record<string, unknown>,
    ): unknown {
      const rowId =
        String(row.id ?? "");

      const overlay =
        overlayByRowId.get(rowId);

      if (overlay) {
        if (overlay.is_blank) {
          return null;
        }

        return overlay.value;
      }

      if (sameRowIds.has(rowId)) {
        return "SAME";
      }

      return row[input.columnKey];
    }

    const directionFactor =
      input.direction === "asc"
        ? 1
        : -1;

    const sortedRows =
      sourceRows
        .map((row, originalIndex) => ({
          row,
          originalIndex,
          sortValue:
            visibleSortValue(row),
        }))
        .sort((a, b) => {
          const aValue =
            a.sortValue;

          const bValue =
            b.sortValue;

          const aBlank =
            aValue === null ||
            aValue === undefined ||
            String(aValue).trim() === "";

          const bBlank =
            bValue === null ||
            bValue === undefined ||
            String(bValue).trim() === "";

          // Spreadsheet-style: blanks stay at the bottom in both directions.
          if (aBlank && bBlank) {
            return a.originalIndex - b.originalIndex;
          }

          if (aBlank) return 1;
          if (bBlank) return -1;

          let comparison = 0;

          if (isNumeric) {
            const aNumber = Number(aValue);
            const bNumber = Number(bValue);

            const aFinite = Number.isFinite(aNumber);
            const bFinite = Number.isFinite(bNumber);

            if (aFinite && bFinite) {
              comparison =
                aNumber - bNumber;
            } else if (aFinite) {
              comparison = -1;
            } else if (bFinite) {
              comparison = 1;
            } else {
              comparison =
                String(aValue).localeCompare(
                  String(bValue),
                  undefined,
                  {
                    numeric: true,
                    sensitivity: "base",
                  },
                );
            }
          } else {
            comparison =
              String(aValue).localeCompare(
                String(bValue),
                undefined,
                {
                  numeric: true,
                  sensitivity: "base",
                },
              );
          }

          if (comparison === 0) {
            return a.originalIndex - b.originalIndex;
          }

          return comparison * directionFactor;
        });

    const highestExistingRowNumber =
      sourceRows.reduce(
        (highest, row) => {
          const value =
            Number(row.row_number);

          return Number.isFinite(value)
            ? Math.max(highest, value)
            : highest;
        },
        0,
      );

    const temporaryBase =
      highestExistingRowNumber +
      sourceRows.length +
      1000;

    /*
     * Two-pass renumbering avoids collisions when row_number is unique.
     * First move every row outside the active range, then assign 1..N.
     */
    for (
      let index = 0;
      index < sortedRows.length;
      index += 1
    ) {
      const rowId =
        String(
          sortedRows[index].row.id ?? "",
        );

      if (!rowId) {
        throw new Error(
          "A Smart Sheet row is missing its id.",
        );
      }

      const {
        error: temporaryError,
      } = await supabase
        .from("smart_sheet_rows")
        .update({
          row_number:
            temporaryBase + index + 1,
        })
        .eq("id", rowId)
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId);

      if (temporaryError) {
        throw new Error(
          temporaryError.message,
        );
      }
    }

    for (
      let index = 0;
      index < sortedRows.length;
      index += 1
    ) {
      const rowId =
        String(
          sortedRows[index].row.id ?? "",
        );

      const {
        error: finalNumberError,
      } = await supabase
        .from("smart_sheet_rows")
        .update({
          row_number: index + 1,
        })
        .eq("id", rowId)
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId);

      if (finalNumberError) {
        throw new Error(
          finalNumberError.message,
        );
      }
    }

    await recordSmartSheetHistory(
      supabase,
      input.sheetId,
      organizationId,
      "sort_rows",
      `Sort ${input.columnKey} ${input.direction === "asc" ? "A→Z" : "Z→A"}`,
      historyBefore,
    );

    revalidateSmartSheet(
      input.sheetId,
    );

    return {
      ok: true,
      message:
        input.direction === "asc"
          ? "Rows sorted ascending."
          : "Rows sorted descending.",
      sortedCount: sortedRows.length,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to sort Smart Sheet rows.",
    };
  }
}


/* =========================================================
   CELL FORMATTING V1
   ========================================================= */

export async function getSmartSheetCellFormats(
  input: { sheetId: string },
): Promise<ActionResult & { formats?: SmartSheetCellFormat[] }> {
  try {
    const { supabase, organizationId } = await getAuthorizedContext(input.sheetId);
    const { data, error } = await supabase
      .from("smart_sheet_cell_formats")
      .select("row_id,column_key,bold,italic,underline,text_alignment,font_size,number_format,decimal_places,fill_color,text_color,border_top,border_right,border_bottom,border_left")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId);

    if (error) throw new Error(error.message);

    return { ok: true, formats: (data ?? []) as SmartSheetCellFormat[] };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to load cell formatting.",
    };
  }
}


export async function clearSmartSheetCellFormatting(
  input: ClearCellFormattingInput,
): Promise<ActionResult> {
  try {
    if (!Array.isArray(input.cells) || input.cells.length === 0) {
      throw new Error("No cells were selected for clearing formatting.");
    }

    if (input.cells.length > 2000) {
      throw new Error("Clear Formatting is limited to 2,000 cells at a time.");
    }

    const { supabase, organizationId } =
      await getAuthorizedContext(input.sheetId);

    const cells = Array.from(
      new Map(
        input.cells.map((cell) => [
          `${cell.rowId}:${cell.columnKey}`,
          cell,
        ]),
      ).values(),
    );

    const rowIds = Array.from(
      new Set(cells.map((cell) => cell.rowId)),
    );

    for (const rowId of rowIds) {
      await verifyRow(
        supabase,
        input.sheetId,
        rowId,
        organizationId,
      );
    }

    const historyBefore =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        rowIds,
      );

    const columnsByRow = new Map<string, string[]>();

    for (const cell of cells) {
      const current = columnsByRow.get(cell.rowId) ?? [];
      current.push(cell.columnKey);
      columnsByRow.set(cell.rowId, current);
    }

    for (const [rowId, columnKeys] of columnsByRow.entries()) {
      const uniqueColumnKeys = Array.from(new Set(columnKeys));

      const { error: deleteError } = await supabase
        .from("smart_sheet_cell_formats")
        .delete()
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId)
        .eq("row_id", rowId)
        .in("column_key", uniqueColumnKeys);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }

    await recordSmartSheetHistory(
      supabase,
      input.sheetId,
      organizationId,
      "format",
      `Clear Formatting (${cells.length} cell${cells.length === 1 ? "" : "s"})`,
      historyBefore,
    );

    revalidateSmartSheet(input.sheetId);

    return {
      ok: true,
      message: `Formatting cleared from ${cells.length} cell${cells.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to clear cell formatting.",
    };
  }
}

export async function applySmartSheetCellFormatting(
  input: ApplyCellFormattingInput,
): Promise<ActionResult> {
  try {
    if (!Array.isArray(input.cells) || input.cells.length === 0) {
      throw new Error("No cells were selected for formatting.");
    }
    if (input.cells.length > 2000) {
      throw new Error("Formatting is limited to 2,000 cells at a time.");
    }
    if (!["bold", "italic", "underline", "align_left", "align_center", "align_right"].includes(input.format)) {
      throw new Error("Unsupported cell format.");
    }

    const { supabase, organizationId } = await getAuthorizedContext(input.sheetId);
    const cells = Array.from(
      new Map(input.cells.map((cell) => [`${cell.rowId}:${cell.columnKey}`, cell])).values(),
    );
    const rowIds = Array.from(new Set(cells.map((cell) => cell.rowId)));

    for (const rowId of rowIds) {
      await verifyRow(supabase, input.sheetId, rowId, organizationId);
    }

    const historyBefore = await captureSmartSheetHistorySnapshot(
      supabase, input.sheetId, organizationId, rowIds,
    );

    const { data: existing, error: existingError } = await supabase
      .from("smart_sheet_cell_formats")
      .select("row_id,column_key,bold,italic,underline,text_alignment,font_size,number_format,decimal_places,fill_color,text_color,border_top,border_right,border_bottom,border_left")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .in("row_id", rowIds);
    if (existingError) throw new Error(existingError.message);

    const existingMap = new Map(
      (existing ?? []).map((format) => [`${format.row_id}:${format.column_key}`, format]),
    );

    const upserts = cells.map((cell) => {
      const previous = existingMap.get(`${cell.rowId}:${cell.columnKey}`) as
        | SmartSheetCellFormat
        | undefined;
      return {
        organization_id: organizationId,
        smart_sheet_id: input.sheetId,
        row_id: cell.rowId,
        column_key: cell.columnKey,
        bold: input.format === "bold" ? input.enabled : Boolean(previous?.bold),
        italic: input.format === "italic" ? input.enabled : Boolean(previous?.italic),
        underline: input.format === "underline" ? input.enabled : Boolean(previous?.underline),
        text_alignment:
          input.format === "align_left"
            ? "left"
            : input.format === "align_center"
              ? "center"
              : input.format === "align_right"
                ? "right"
                : previous?.text_alignment ?? null,
        font_size: previous?.font_size ?? null,
        number_format: previous?.number_format ?? null,
        decimal_places: previous?.decimal_places ?? null,
        fill_color: previous?.fill_color ?? null,
        text_color: previous?.text_color ?? null,
        border_top: Boolean(previous?.border_top),
        border_right: Boolean(previous?.border_right),
        border_bottom: Boolean(previous?.border_bottom),
        border_left: Boolean(previous?.border_left),
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upsertError } = await supabase
      .from("smart_sheet_cell_formats")
      .upsert(upserts, { onConflict: "row_id,column_key" });
    if (upsertError) throw new Error(upsertError.message);

    // Keep the metadata table sparse: remove records with no active formatting.
    const emptyKeys = upserts
      .filter((format) => !format.bold && !format.italic && !format.underline && !format.text_alignment && !format.font_size && !format.number_format && format.decimal_places == null && !format.fill_color && !format.text_color && !format.border_top && !format.border_right && !format.border_bottom && !format.border_left)
      .map((format) => ({ rowId: format.row_id, columnKey: format.column_key }));
    for (const cell of emptyKeys) {
      const { error: deleteError } = await supabase
        .from("smart_sheet_cell_formats")
        .delete()
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId)
        .eq("row_id", cell.rowId)
        .eq("column_key", cell.columnKey);
      if (deleteError) throw new Error(deleteError.message);
    }

    const labelName =
      input.format === "bold"
        ? "Bold"
        : input.format === "italic"
          ? "Italic"
          : input.format === "underline"
            ? "Underline"
            : input.format === "align_left"
              ? "Align Left"
              : input.format === "align_center"
                ? "Align Center"
                : "Align Right";
    await recordSmartSheetHistory(
      supabase,
      input.sheetId,
      organizationId,
      "format",
      `${input.enabled ? "Apply" : "Remove"} ${labelName} (${cells.length} cell${cells.length === 1 ? "" : "s"})`,
      historyBefore,
    );

    revalidateSmartSheet(input.sheetId);
    return { ok: true, message: `${labelName} ${input.enabled ? "applied" : "removed"}.` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to format selected cells.",
    };
  }
}



export async function applySmartSheetCellFontSize(
  input: ApplyCellFontSizeInput,
): Promise<ActionResult> {
  try {
    const allowedSizes = new Set([8, 9, 10, 11, 12, 14, 16, 18, 20, 24]);
    if (!Array.isArray(input.cells) || input.cells.length === 0) {
      throw new Error("No cells were selected for font size.");
    }
    if (input.cells.length > 2000) {
      throw new Error("Formatting is limited to 2,000 cells at a time.");
    }
    if (!allowedSizes.has(input.fontSize)) {
      throw new Error("Unsupported font size.");
    }

    const { supabase, organizationId } = await getAuthorizedContext(input.sheetId);
    const cells = Array.from(
      new Map(input.cells.map((cell) => [`${cell.rowId}:${cell.columnKey}`, cell])).values(),
    );
    const rowIds = Array.from(new Set(cells.map((cell) => cell.rowId)));

    for (const rowId of rowIds) {
      await verifyRow(supabase, input.sheetId, rowId, organizationId);
    }

    const historyBefore = await captureSmartSheetHistorySnapshot(
      supabase, input.sheetId, organizationId, rowIds,
    );

    const { data: existing, error: existingError } = await supabase
      .from("smart_sheet_cell_formats")
      .select("row_id,column_key,bold,italic,underline,text_alignment,font_size,number_format,decimal_places,fill_color,text_color,border_top,border_right,border_bottom,border_left")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .in("row_id", rowIds);
    if (existingError) throw new Error(existingError.message);

    const existingMap = new Map(
      (existing ?? []).map((format) => [`${format.row_id}:${format.column_key}`, format]),
    );

    const upserts = cells.map((cell) => {
      const previous = existingMap.get(`${cell.rowId}:${cell.columnKey}`) as
        | SmartSheetCellFormat
        | undefined;
      return {
        organization_id: organizationId,
        smart_sheet_id: input.sheetId,
        row_id: cell.rowId,
        column_key: cell.columnKey,
        bold: Boolean(previous?.bold),
        italic: Boolean(previous?.italic),
        underline: Boolean(previous?.underline),
        text_alignment: previous?.text_alignment ?? null,
        font_size: input.fontSize,
        number_format: previous?.number_format ?? null,
        decimal_places: previous?.decimal_places ?? null,
        fill_color: previous?.fill_color ?? null,
        text_color: previous?.text_color ?? null,
        border_top: Boolean(previous?.border_top),
        border_right: Boolean(previous?.border_right),
        border_bottom: Boolean(previous?.border_bottom),
        border_left: Boolean(previous?.border_left),
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upsertError } = await supabase
      .from("smart_sheet_cell_formats")
      .upsert(upserts, { onConflict: "row_id,column_key" });
    if (upsertError) throw new Error(upsertError.message);

    await recordSmartSheetHistory(
      supabase,
      input.sheetId,
      organizationId,
      "format",
      `Apply Font Size ${input.fontSize} (${cells.length} cell${cells.length === 1 ? "" : "s"})`,
      historyBefore,
    );

    revalidateSmartSheet(input.sheetId);
    return { ok: true, message: `Font size ${input.fontSize} applied.` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to apply font size.",
    };
  }
}



export async function applySmartSheetCellTextColor(
  input: ApplyCellTextColorInput,
): Promise<ActionResult> {
  try {
    if (!Array.isArray(input.cells) || input.cells.length === 0) throw new Error("No cells were selected for text color.");
    if (input.cells.length > 2000) throw new Error("Formatting is limited to 2,000 cells at a time.");

    const normalizedColor = input.textColor === null || input.textColor === "" ? null : input.textColor.toUpperCase();
    if (normalizedColor !== null && !/^#[0-9A-F]{6}$/.test(normalizedColor)) throw new Error("Unsupported text color.");

    const { supabase, organizationId } = await getAuthorizedContext(input.sheetId);
    const cells = Array.from(new Map(input.cells.map((cell) => [`${cell.rowId}:${cell.columnKey}`, cell])).values());
    const rowIds = Array.from(new Set(cells.map((cell) => cell.rowId)));
    for (const rowId of rowIds) await verifyRow(supabase, input.sheetId, rowId, organizationId);

    const historyBefore = await captureSmartSheetHistorySnapshot(supabase, input.sheetId, organizationId, rowIds);

    const { data: existing, error: existingError } = await supabase
      .from("smart_sheet_cell_formats")
      .select("row_id,column_key,bold,italic,underline,text_alignment,font_size,number_format,decimal_places,fill_color,text_color,border_top,border_right,border_bottom,border_left")
      .eq("smart_sheet_id", input.sheetId).eq("organization_id", organizationId).in("row_id", rowIds);
    if (existingError) throw new Error(existingError.message);

    const existingMap = new Map((existing ?? []).map((format) => [`${format.row_id}:${format.column_key}`, format]));
    const upserts = cells.map((cell) => {
      const previous = existingMap.get(`${cell.rowId}:${cell.columnKey}`) as SmartSheetCellFormat | undefined;
      return {
        organization_id: organizationId, smart_sheet_id: input.sheetId, row_id: cell.rowId, column_key: cell.columnKey,
        bold: Boolean(previous?.bold), italic: Boolean(previous?.italic), underline: Boolean(previous?.underline),
        text_alignment: previous?.text_alignment ?? null, font_size: previous?.font_size ?? null,
        number_format: previous?.number_format ?? null, decimal_places: previous?.decimal_places ?? null,
        fill_color: previous?.fill_color ?? null, text_color: normalizedColor,
        border_top: previous?.border_top ?? null, border_right: previous?.border_right ?? null,
        border_bottom: previous?.border_bottom ?? null, border_left: previous?.border_left ?? null,
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upsertError } = await supabase.from("smart_sheet_cell_formats").upsert(upserts, { onConflict: "row_id,column_key" });
    if (upsertError) throw new Error(upsertError.message);

    if (normalizedColor === null) {
      for (const format of upserts) {
        if (!format.bold && !format.italic && !format.underline && !format.text_alignment && !format.font_size &&
            !format.number_format && format.decimal_places == null && !format.fill_color && !format.text_color &&
            !format.border_top && !format.border_right && !format.border_bottom && !format.border_left) {
          const { error: deleteError } = await supabase.from("smart_sheet_cell_formats").delete()
            .eq("smart_sheet_id", input.sheetId).eq("organization_id", organizationId)
            .eq("row_id", format.row_id).eq("column_key", format.column_key);
          if (deleteError) throw new Error(deleteError.message);
        }
      }
    }

    await recordSmartSheetHistory(supabase, input.sheetId, organizationId, "format",
      `${normalizedColor ? "Apply Text Color" : "Clear Text Color"} (${cells.length} cell${cells.length === 1 ? "" : "s"})`, historyBefore);
    revalidateSmartSheet(input.sheetId);
    return { ok: true, message: normalizedColor ? "Text color applied." : "Text color cleared." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Unable to apply text color." };
  }
}


export async function applySmartSheetCellFillColor(
  input: ApplyCellFillColorInput,
): Promise<ActionResult> {
  try {
    if (!Array.isArray(input.cells) || input.cells.length === 0) {
      throw new Error("No cells were selected for fill color.");
    }
    if (input.cells.length > 2000) {
      throw new Error("Formatting is limited to 2,000 cells at a time.");
    }

    const normalizedColor =
      input.fillColor === null || input.fillColor === ""
        ? null
        : input.fillColor.toUpperCase();

    if (
      normalizedColor !== null &&
      !/^#[0-9A-F]{6}$/.test(normalizedColor)
    ) {
      throw new Error("Unsupported fill color.");
    }

    const { supabase, organizationId } =
      await getAuthorizedContext(input.sheetId);

    const cells = Array.from(
      new Map(
        input.cells.map((cell) => [
          `${cell.rowId}:${cell.columnKey}`,
          cell,
        ]),
      ).values(),
    );

    const rowIds = Array.from(
      new Set(cells.map((cell) => cell.rowId)),
    );

    for (const rowId of rowIds) {
      await verifyRow(
        supabase,
        input.sheetId,
        rowId,
        organizationId,
      );
    }

    const historyBefore =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        rowIds,
      );

    const { data: existing, error: existingError } =
      await supabase
        .from("smart_sheet_cell_formats")
        .select(
          "row_id,column_key,bold,italic,underline,text_alignment,font_size,number_format,decimal_places,fill_color,text_color,border_top,border_right,border_bottom,border_left",
        )
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId)
        .in("row_id", rowIds);

    if (existingError) {
      throw new Error(existingError.message);
    }

    const existingMap = new Map(
      (existing ?? []).map((format) => [
        `${format.row_id}:${format.column_key}`,
        format,
      ]),
    );

    const upserts = cells.map((cell) => {
      const previous = existingMap.get(
        `${cell.rowId}:${cell.columnKey}`,
      ) as SmartSheetCellFormat | undefined;

      return {
        organization_id: organizationId,
        smart_sheet_id: input.sheetId,
        row_id: cell.rowId,
        column_key: cell.columnKey,
        bold: Boolean(previous?.bold),
        italic: Boolean(previous?.italic),
        underline: Boolean(previous?.underline),
        text_alignment: previous?.text_alignment ?? null,
        font_size: previous?.font_size ?? null,
        number_format: previous?.number_format ?? null,
        decimal_places: previous?.decimal_places ?? null,
        fill_color: normalizedColor,
        text_color: previous?.text_color ?? null,
        border_top: Boolean(previous?.border_top),
        border_right: Boolean(previous?.border_right),
        border_bottom: Boolean(previous?.border_bottom),
        border_left: Boolean(previous?.border_left),
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upsertError } = await supabase
      .from("smart_sheet_cell_formats")
      .upsert(upserts, {
        onConflict: "row_id,column_key",
      });

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    // Keep the metadata table sparse after clearing a fill.
    if (normalizedColor === null) {
      for (const format of upserts) {
        if (
          !format.bold &&
          !format.italic &&
          !format.underline &&
          !format.text_alignment &&
          !format.font_size &&
          !format.number_format &&
          format.decimal_places == null &&
          !format.fill_color &&
          !format.text_color &&
          !format.border_top &&
          !format.border_right &&
          !format.border_bottom &&
          !format.border_left
        ) {
          const { error: deleteError } = await supabase
            .from("smart_sheet_cell_formats")
            .delete()
            .eq("smart_sheet_id", input.sheetId)
            .eq("organization_id", organizationId)
            .eq("row_id", format.row_id)
            .eq("column_key", format.column_key);

          if (deleteError) {
            throw new Error(deleteError.message);
          }
        }
      }
    }

    await recordSmartSheetHistory(
      supabase,
      input.sheetId,
      organizationId,
      "format",
      `${normalizedColor ? "Apply Fill Color" : "Clear Fill Color"} (${cells.length} cell${cells.length === 1 ? "" : "s"})`,
      historyBefore,
    );

    revalidateSmartSheet(input.sheetId);

    return {
      ok: true,
      message: normalizedColor
        ? "Fill color applied."
        : "Fill color cleared.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to apply fill color.",
    };
  }
}



export async function applySmartSheetFormatPainter(
  input: ApplyFormatPainterInput,
): Promise<ActionResult> {
  try {
    if (!Array.isArray(input.cells) || input.cells.length === 0) {
      throw new Error("No destination cells were selected for Format Painter.");
    }

    if (input.cells.length > 2000) {
      throw new Error("Formatting is limited to 2,000 cells at a time.");
    }

    const { supabase, organizationId } =
      await getAuthorizedContext(input.sheetId);

    const cells = Array.from(
      new Map(
        input.cells.map((cell) => [
          `${cell.rowId}:${cell.columnKey}`,
          cell,
        ]),
      ).values(),
    );

    const rowIds = Array.from(
      new Set(cells.map((cell) => cell.rowId)),
    );

    for (const rowId of rowIds) {
      await verifyRow(
        supabase,
        input.sheetId,
        rowId,
        organizationId,
      );
    }

    const historyBefore =
      await captureSmartSheetHistorySnapshot(
        supabase,
        input.sheetId,
        organizationId,
        rowIds,
      );

    const allowedAlignment = new Set(["left", "center", "right"]);
    const allowedNumberFormat = new Set([
      "general",
      "number",
      "currency",
      "percentage",
    ]);

    const normalizeColor = (
      value: string | null,
      label: string,
    ) => {
      if (value === null || value === "") return null;
      const normalized = value.toUpperCase();
      if (!/^#[0-9A-F]{6}$/.test(normalized)) {
        throw new Error(`Unsupported ${label}.`);
      }
      return normalized;
    };

    const upserts = cells.map((cell) => {
      const format = cell.format;

      const textAlignment =
        format.textAlignment === null
          ? null
          : allowedAlignment.has(format.textAlignment)
            ? format.textAlignment
            : null;

      const numberFormat =
        format.numberFormat === null
          ? null
          : allowedNumberFormat.has(format.numberFormat)
            ? format.numberFormat
            : null;

      const fontSize =
        format.fontSize === null
          ? null
          : Number.isFinite(format.fontSize) &&
              format.fontSize >= 8 &&
              format.fontSize <= 72
            ? Math.trunc(format.fontSize)
            : null;

      const decimalPlaces =
        format.decimalPlaces === null
          ? null
          : Number.isFinite(format.decimalPlaces)
            ? Math.max(0, Math.min(6, Math.trunc(format.decimalPlaces)))
            : null;

      return {
        organization_id: organizationId,
        smart_sheet_id: input.sheetId,
        row_id: cell.rowId,
        column_key: cell.columnKey,
        bold: Boolean(format.bold),
        italic: Boolean(format.italic),
        underline: Boolean(format.underline),
        text_alignment: textAlignment,
        font_size: fontSize,
        number_format: numberFormat,
        decimal_places: decimalPlaces,
        fill_color: normalizeColor(format.fillColor, "fill color"),
        text_color: normalizeColor(format.textColor, "text color"),
        border_top: Boolean(format.borderTop),
        border_right: Boolean(format.borderRight),
        border_bottom: Boolean(format.borderBottom),
        border_left: Boolean(format.borderLeft),
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upsertError } = await supabase
      .from("smart_sheet_cell_formats")
      .upsert(upserts, {
        onConflict: "row_id,column_key",
      });

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    // Keep the formatting table sparse when the painted source is completely plain.
    for (const format of upserts) {
      if (
        !format.bold &&
        !format.italic &&
        !format.underline &&
        !format.text_alignment &&
        !format.font_size &&
        !format.number_format &&
        format.decimal_places == null &&
        !format.fill_color &&
        !format.text_color &&
        !format.border_top &&
        !format.border_right &&
        !format.border_bottom &&
        !format.border_left
      ) {
        const { error: deleteError } = await supabase
          .from("smart_sheet_cell_formats")
          .delete()
          .eq("smart_sheet_id", input.sheetId)
          .eq("organization_id", organizationId)
          .eq("row_id", format.row_id)
          .eq("column_key", format.column_key);

        if (deleteError) {
          throw new Error(deleteError.message);
        }
      }
    }

    await recordSmartSheetHistory(
      supabase,
      input.sheetId,
      organizationId,
      "format",
      `Format Painter (${cells.length} cell${cells.length === 1 ? "" : "s"})`,
      historyBefore,
    );

    revalidateSmartSheet(input.sheetId);

    return {
      ok: true,
      message: `Format Painter applied to ${cells.length} cell${cells.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to apply Format Painter.",
    };
  }
}


export async function applySmartSheetCellBorders(
  input: ApplyCellBordersInput,
): Promise<ActionResult> {
  try {
    if (!Array.isArray(input.cells) || input.cells.length === 0) {
      throw new Error("No cells were selected for borders.");
    }
    if (input.cells.length > 2000) {
      throw new Error("Formatting is limited to 2,000 cells at a time.");
    }

    const allowedBorders = new Set<CellBorderKind>([
      "all", "outer", "top", "right", "bottom", "left", "none",
    ]);
    if (!allowedBorders.has(input.border)) {
      throw new Error("Unsupported border option.");
    }

    const { supabase, organizationId } =
      await getAuthorizedContext(input.sheetId);

    const cells = Array.from(
      new Map(
        input.cells.map((cell) => [
          `${cell.rowId}:${cell.columnKey}`,
          cell,
        ]),
      ).values(),
    );
    const rowIds = Array.from(new Set(cells.map((cell) => cell.rowId)));

    for (const rowId of rowIds) {
      await verifyRow(supabase, input.sheetId, rowId, organizationId);
    }

    const historyBefore = await captureSmartSheetHistorySnapshot(
      supabase, input.sheetId, organizationId, rowIds,
    );

    const { data: existing, error: existingError } = await supabase
      .from("smart_sheet_cell_formats")
      .select("row_id,column_key,bold,italic,underline,text_alignment,font_size,number_format,decimal_places,fill_color,text_color,border_top,border_right,border_bottom,border_left")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .in("row_id", rowIds);
    if (existingError) throw new Error(existingError.message);

    const existingMap = new Map(
      (existing ?? []).map((format) => [
        `${format.row_id}:${format.column_key}`,
        format,
      ]),
    );

    const rowIndexMap = new Map<string, number>();
    const columnIndexMap = new Map<string, number>();
    cells.forEach((cell, index) => {
      if (!rowIndexMap.has(cell.rowId)) rowIndexMap.set(cell.rowId, index);
      if (!columnIndexMap.has(cell.columnKey)) columnIndexMap.set(cell.columnKey, index);
    });

    // Determine the rectangular selection edges from the supplied cell order.
    const rowOrder = Array.from(new Set(cells.map((cell) => cell.rowId)));
    const columnOrder = Array.from(new Set(cells.map((cell) => cell.columnKey)));
    const firstRow = rowOrder[0];
    const lastRow = rowOrder[rowOrder.length - 1];
    const firstColumn = columnOrder[0];
    const lastColumn = columnOrder[columnOrder.length - 1];

    const upserts = cells.map((cell) => {
      const previous = existingMap.get(
        `${cell.rowId}:${cell.columnKey}`,
      ) as SmartSheetCellFormat | undefined;

      let borderTop = Boolean(previous?.border_top);
      let borderRight = Boolean(previous?.border_right);
      let borderBottom = Boolean(previous?.border_bottom);
      let borderLeft = Boolean(previous?.border_left);

      if (input.border === "none") {
        borderTop = false;
        borderRight = false;
        borderBottom = false;
        borderLeft = false;
      } else if (input.border === "all") {
        borderTop = true;
        borderRight = true;
        borderBottom = true;
        borderLeft = true;
      } else if (input.border === "outer") {
        if (cell.rowId === firstRow) borderTop = true;
        if (cell.rowId === lastRow) borderBottom = true;
        if (cell.columnKey === firstColumn) borderLeft = true;
        if (cell.columnKey === lastColumn) borderRight = true;
      } else if (input.border === "top") {
        borderTop = true;
      } else if (input.border === "right") {
        borderRight = true;
      } else if (input.border === "bottom") {
        borderBottom = true;
      } else if (input.border === "left") {
        borderLeft = true;
      }

      return {
        organization_id: organizationId,
        smart_sheet_id: input.sheetId,
        row_id: cell.rowId,
        column_key: cell.columnKey,
        bold: Boolean(previous?.bold),
        italic: Boolean(previous?.italic),
        underline: Boolean(previous?.underline),
        text_alignment: previous?.text_alignment ?? null,
        font_size: previous?.font_size ?? null,
        number_format: previous?.number_format ?? null,
        decimal_places: previous?.decimal_places ?? null,
        fill_color: previous?.fill_color ?? null,
        text_color: previous?.text_color ?? null,
        border_top: borderTop,
        border_right: borderRight,
        border_bottom: borderBottom,
        border_left: borderLeft,
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upsertError } = await supabase
      .from("smart_sheet_cell_formats")
      .upsert(upserts, { onConflict: "row_id,column_key" });
    if (upsertError) throw new Error(upsertError.message);

    for (const format of upserts) {
      if (
        !format.bold && !format.italic && !format.underline &&
        !format.text_alignment && !format.font_size && !format.number_format &&
        format.decimal_places == null && !format.fill_color &&
        !format.border_top && !format.border_right &&
        !format.border_bottom && !format.border_left
      ) {
        const { error: deleteError } = await supabase
          .from("smart_sheet_cell_formats")
          .delete()
          .eq("smart_sheet_id", input.sheetId)
          .eq("organization_id", organizationId)
          .eq("row_id", format.row_id)
          .eq("column_key", format.column_key);
        if (deleteError) throw new Error(deleteError.message);
      }
    }

    const label =
      input.border === "none" ? "Clear Borders" :
      input.border === "all" ? "All Borders" :
      input.border === "outer" ? "Outer Border" :
      `${input.border[0].toUpperCase()}${input.border.slice(1)} Border`;

    await recordSmartSheetHistory(
      supabase,
      input.sheetId,
      organizationId,
      "format",
      `${label} (${cells.length} cell${cells.length === 1 ? "" : "s"})`,
      historyBefore,
    );

    revalidateSmartSheet(input.sheetId);
    return { ok: true, message: `${label} applied.` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to apply borders.",
    };
  }
}


function defaultDecimalPlacesForNumberFormat(numberFormat: NumberFormatKind) {
  if (numberFormat === "number") return 2;
  if (numberFormat === "currency") return 2;
  if (numberFormat === "percentage") return 2;
  return null;
}

export async function applySmartSheetCellNumberFormat(
  input: ApplyCellNumberFormatInput,
): Promise<ActionResult> {
  try {
    const allowedFormats = new Set<NumberFormatKind>([
      "general", "number", "currency", "percentage",
    ]);
    if (!Array.isArray(input.cells) || input.cells.length === 0) {
      throw new Error("No cells were selected for number formatting.");
    }
    if (input.cells.length > 2000) {
      throw new Error("Formatting is limited to 2,000 cells at a time.");
    }
    if (!allowedFormats.has(input.numberFormat)) {
      throw new Error("Unsupported number format.");
    }

    const { supabase, organizationId } = await getAuthorizedContext(input.sheetId);
    const cells = Array.from(
      new Map(input.cells.map((cell) => [`${cell.rowId}:${cell.columnKey}`, cell])).values(),
    );
    const rowIds = Array.from(new Set(cells.map((cell) => cell.rowId)));
    for (const rowId of rowIds) {
      await verifyRow(supabase, input.sheetId, rowId, organizationId);
    }

    const historyBefore = await captureSmartSheetHistorySnapshot(
      supabase, input.sheetId, organizationId, rowIds,
    );

    const { data: existing, error: existingError } = await supabase
      .from("smart_sheet_cell_formats")
      .select("row_id,column_key,bold,italic,underline,text_alignment,font_size,number_format,decimal_places,fill_color,text_color,border_top,border_right,border_bottom,border_left")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .in("row_id", rowIds);
    if (existingError) throw new Error(existingError.message);

    const existingMap = new Map(
      (existing ?? []).map((format) => [`${format.row_id}:${format.column_key}`, format]),
    );

    const upserts = cells.map((cell) => {
      const previous = existingMap.get(`${cell.rowId}:${cell.columnKey}`) as
        | SmartSheetCellFormat
        | undefined;
      const decimalPlaces =
        input.numberFormat === "general"
          ? null
          : previous?.number_format === input.numberFormat && previous?.decimal_places != null
            ? previous.decimal_places
            : defaultDecimalPlacesForNumberFormat(input.numberFormat);
      return {
        organization_id: organizationId,
        smart_sheet_id: input.sheetId,
        row_id: cell.rowId,
        column_key: cell.columnKey,
        bold: Boolean(previous?.bold),
        italic: Boolean(previous?.italic),
        underline: Boolean(previous?.underline),
        text_alignment: previous?.text_alignment ?? null,
        font_size: previous?.font_size ?? null,
        number_format: input.numberFormat,
        decimal_places: decimalPlaces,
        fill_color: previous?.fill_color ?? null,
        text_color: previous?.text_color ?? null,
        border_top: Boolean(previous?.border_top),
        border_right: Boolean(previous?.border_right),
        border_bottom: Boolean(previous?.border_bottom),
        border_left: Boolean(previous?.border_left),
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upsertError } = await supabase
      .from("smart_sheet_cell_formats")
      .upsert(upserts, { onConflict: "row_id,column_key" });
    if (upsertError) throw new Error(upsertError.message);

    const labelName =
      input.numberFormat === "general" ? "General"
      : input.numberFormat === "number" ? "Number"
      : input.numberFormat === "currency" ? "Currency (€)"
      : "Percentage";

    await recordSmartSheetHistory(
      supabase,
      input.sheetId,
      organizationId,
      "format",
      `Apply ${labelName} Format (${cells.length} cell${cells.length === 1 ? "" : "s"})`,
      historyBefore,
    );

    revalidateSmartSheet(input.sheetId);
    return { ok: true, message: `${labelName} format applied.` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to apply number format.",
    };
  }
}

export async function adjustSmartSheetCellDecimalPlaces(
  input: AdjustCellDecimalPlacesInput,
): Promise<ActionResult> {
  try {
    if (!Array.isArray(input.cells) || input.cells.length === 0) {
      throw new Error("No cells were selected.");
    }
    if (input.cells.length > 2000) {
      throw new Error("Formatting is limited to 2,000 cells at a time.");
    }
    if (input.delta !== 1 && input.delta !== -1) {
      throw new Error("Invalid decimal adjustment.");
    }

    const { supabase, organizationId } = await getAuthorizedContext(input.sheetId);
    const cells = Array.from(
      new Map(input.cells.map((cell) => [`${cell.rowId}:${cell.columnKey}`, cell])).values(),
    );
    const rowIds = Array.from(new Set(cells.map((cell) => cell.rowId)));
    for (const rowId of rowIds) {
      await verifyRow(supabase, input.sheetId, rowId, organizationId);
    }

    const historyBefore = await captureSmartSheetHistorySnapshot(
      supabase, input.sheetId, organizationId, rowIds,
    );

    const { data: existing, error: existingError } = await supabase
      .from("smart_sheet_cell_formats")
      .select("row_id,column_key,bold,italic,underline,text_alignment,font_size,number_format,decimal_places,fill_color,text_color,border_top,border_right,border_bottom,border_left")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .in("row_id", rowIds);
    if (existingError) throw new Error(existingError.message);

    const existingMap = new Map(
      (existing ?? []).map((format) => [`${format.row_id}:${format.column_key}`, format]),
    );

    const upserts = cells.map((cell) => {
      const previous = existingMap.get(`${cell.rowId}:${cell.columnKey}`) as
        | SmartSheetCellFormat
        | undefined;
      const effectiveFormat: NumberFormatKind =
        previous?.number_format && previous.number_format !== "general"
          ? previous.number_format
          : "number";
      const currentDecimals =
        previous?.decimal_places ?? defaultDecimalPlacesForNumberFormat(effectiveFormat) ?? 2;
      const nextDecimals = Math.max(0, Math.min(6, currentDecimals + input.delta));
      return {
        organization_id: organizationId,
        smart_sheet_id: input.sheetId,
        row_id: cell.rowId,
        column_key: cell.columnKey,
        bold: Boolean(previous?.bold),
        italic: Boolean(previous?.italic),
        underline: Boolean(previous?.underline),
        text_alignment: previous?.text_alignment ?? null,
        font_size: previous?.font_size ?? null,
        number_format: effectiveFormat,
        decimal_places: nextDecimals,
        fill_color: previous?.fill_color ?? null,
        text_color: previous?.text_color ?? null,
        border_top: Boolean(previous?.border_top),
        border_right: Boolean(previous?.border_right),
        border_bottom: Boolean(previous?.border_bottom),
        border_left: Boolean(previous?.border_left),
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upsertError } = await supabase
      .from("smart_sheet_cell_formats")
      .upsert(upserts, { onConflict: "row_id,column_key" });
    if (upsertError) throw new Error(upsertError.message);

    const actionName = input.delta > 0 ? "Increase Decimal" : "Decrease Decimal";
    await recordSmartSheetHistory(
      supabase,
      input.sheetId,
      organizationId,
      "format",
      `${actionName} (${cells.length} cell${cells.length === 1 ? "" : "s"})`,
      historyBefore,
    );

    revalidateSmartSheet(input.sheetId);
    return {
      ok: true,
      message: `${input.delta > 0 ? "Decimal increased" : "Decimal decreased"}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to adjust decimals.",
    };
  }
}



/* =========================================================
   UNDO / REDO HISTORY
   ========================================================= */

const historyRowColumns = [
  "row_number",
  "product_id", "match_status", "match_confidence", "description",
  "sku_snapshot", "barcode_snapshot", "pack_size", "quantity",
  "supplier_cost_ex_vat", "item_cost", "transported_cost", "vat_rate",
  "transport_rate", "shop_sem_price", "c_ivacp_price", "shop_com_price",
  "special_price", "big_wholesale_price", "rest_com_price", "public_price",
  "shop_sem_markup", "shop_com_markup", "special_markup", "rest_com_markup",
  "big_wholesale_markup", "shop_sem_driver", "shop_com_driver", "special_driver",
  "rest_com_driver", "big_wholesale_driver", "line_subtotal", "line_vat",
  "line_total", "notes",
] as const;

async function captureSmartSheetHistorySnapshot(
  supabase: SupabaseServerClient,
  sheetId: string,
  organizationId: string,
  rowIds: string[],
): Promise<SmartSheetHistorySnapshot> {
  const ids = Array.from(new Set(rowIds));
  if (ids.length === 0) {
    const { data: sheet, error: sheetError } = await supabase
      .from("smart_sheets")
      .select("id,transport_rate,subtotal,vat_total,total,last_edited_at")
      .eq("id", sheetId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (sheetError) throw new Error(sheetError.message);
    return { rowIds: [], rows: [], states: [], formats: [], overlays: [], sheet: sheet ?? null };
  }

  const { data: rows, error: rowsError } = await supabase
    .from("smart_sheet_rows").select("*")
    .eq("smart_sheet_id", sheetId).eq("organization_id", organizationId).in("id", ids)
    .order("row_number", { ascending: true });
  if (rowsError) throw new Error(rowsError.message);

  const { data: states, error: statesError } = await supabase
    .from("smart_sheet_cell_states").select("*")
    .eq("smart_sheet_id", sheetId).eq("organization_id", organizationId).in("row_id", ids);
  if (statesError) throw new Error(statesError.message);

  const { data: formats, error: formatsError } = await supabase
    .from("smart_sheet_cell_formats").select("*")
    .eq("smart_sheet_id", sheetId).eq("organization_id", organizationId).in("row_id", ids);
  if (formatsError) throw new Error(formatsError.message);

  const { data: overlays, error: overlaysError } = await supabase
    .from("smart_sheet_cells")
    .select("*")
    .eq("smart_sheet_id", sheetId)
    .eq("organization_id", organizationId)
    .in("row_id", ids);
  if (overlaysError) throw new Error(overlaysError.message);

  const { data: sheet, error: sheetError } = await supabase
    .from("smart_sheets")
    .select("id,transport_rate,subtotal,vat_total,total,last_edited_at")
    .eq("id", sheetId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (sheetError) throw new Error(sheetError.message);

  return {
    rowIds: ids,
    rows: (rows ?? []) as Record<string, unknown>[],
    states: (states ?? []) as Record<string, unknown>[],
    formats: (formats ?? []) as Record<string, unknown>[],
    overlays: (overlays ?? []) as Record<string, unknown>[],
    sheet: sheet ?? null,
  };
}

async function recordSmartSheetHistorySnapshots(
  supabase: SupabaseServerClient,
  sheetId: string,
  organizationId: string,
  operationType: string,
  label: string,
  beforeSnapshot: SmartSheetHistorySnapshot,
  afterSnapshot: SmartSheetHistorySnapshot,
) {
  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Authentication required.",
    );
  }

  /*
   * A new structural operation creates a new history branch, exactly like
   * ordinary cell edits. Any previously-undone operations are discarded.
   */
  const {
    error: clearRedoError,
  } =
    await supabase
      .from(
        "smart_sheet_history",
      )
      .delete()
      .eq(
        "smart_sheet_id",
        sheetId,
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "user_id",
        user.id,
      )
      .not(
        "undone_at",
        "is",
        null,
      );

  if (clearRedoError) {
    throw new Error(
      clearRedoError.message,
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "smart_sheet_history",
      )
      .insert({
        organization_id:
          organizationId,

        smart_sheet_id:
          sheetId,

        user_id:
          user.id,

        operation_type:
          operationType,

        label,

        before_snapshot:
          beforeSnapshot,

        after_snapshot:
          afterSnapshot,
      });

  if (error) {
    throw new Error(
      error.message,
    );
  }
}


async function recordSmartSheetHistory(
  supabase: SupabaseServerClient,
  sheetId: string,
  organizationId: string,
  operationType: string,
  label: string,
  beforeSnapshot: SmartSheetHistorySnapshot,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  const afterSnapshot = await captureSmartSheetHistorySnapshot(
    supabase, sheetId, organizationId, beforeSnapshot.rowIds,
  );

  const { error: clearRedoError } = await supabase
    .from("smart_sheet_history")
    .delete()
    .eq("smart_sheet_id", sheetId)
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .not("undone_at", "is", null);
  if (clearRedoError) throw new Error(clearRedoError.message);

  const { error } = await supabase.from("smart_sheet_history").insert({
    organization_id: organizationId,
    smart_sheet_id: sheetId,
    user_id: user.id,
    operation_type: operationType,
    label,
    before_snapshot: beforeSnapshot,
    after_snapshot: afterSnapshot,
  });
  if (error) throw new Error(error.message);
}

async function restoreSmartSheetHistorySnapshot(
  supabase: SupabaseServerClient,
  sheetId: string,
  organizationId: string,
  snapshot: SmartSheetHistorySnapshot,
) {
  /*
   * Structural history is restored BEFORE ordinary row/state values.
   *
   * For Delete Undo this recreates the missing row.
   * For Insert Undo this removes the inserted row.
   * Redo performs the inverse from the after-snapshot.
   */
  const structuralOperations =
    snapshot.structures ??
    (snapshot.structure
      ? [snapshot.structure]
      : []);

  /*
   * Multi-row structural history uses the same secure row restore RPC as the
   * proven single-row Undo/Redo path. Recreate rows in ascending row-number
   * order; remove rows in descending order so renumbering cannot disturb the
   * remaining structural operations.
   */
  const orderedStructuralOperations =
    [...structuralOperations].sort(
      (a, b) => {
        const aNumber =
          Number(a.rowSnapshot.row_number ?? 0);
        const bNumber =
          Number(b.rowSnapshot.row_number ?? 0);

        return a.shouldExist
          ? aNumber - bNumber
          : bNumber - aNumber;
      },
    );

  /*
   * V4.2 STRUCTURAL HISTORY IDEMPOTENCE
   *
   * Undo/Redo can be retried after a partial or failed structural replay. The
   * secure structural RPC is intentionally responsible for changing row
   * structure, but it must only be called when the current parent-row
   * existence differs from the target snapshot.
   *
   * This prevents a retry from attempting to recreate a smart_sheet_rows row
   * that already exists (duplicate-key failure), and prevents a retry from
   * deleting a row that is already absent.
   *
   * Exact row values / row_number are still restored later from snapshot.rows.
   */
  for (const structure of orderedStructuralOperations) {
    const structuralRowId =
      String(
        structure.rowSnapshot.id ??
        "",
      );

    if (!structuralRowId) {
      throw new Error(
        "Structural history row is missing its row id.",
      );
    }

    const {
      data: existingStructuralRow,
      error: existingStructuralRowError,
    } =
      await supabase
        .from(
          "smart_sheet_rows",
        )
        .select(
          "id",
        )
        .eq(
          "id",
          structuralRowId,
        )
        .eq(
          "smart_sheet_id",
          sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .maybeSingle();

    if (
      existingStructuralRowError
    ) {
      throw new Error(
        existingStructuralRowError.message,
      );
    }

    const currentlyExists =
      Boolean(
        existingStructuralRow,
      );

    if (
      currentlyExists ===
      structure.shouldExist
    ) {
      continue;
    }

    const {
      error: structureError,
    } =
      await supabase.rpc(
        "restore_smart_sheet_row_structure_secure",
        {
          requested_sheet_id:
            sheetId,

          requested_row_snapshot:
            structure.rowSnapshot,

          requested_states:
            structure.states,

          requested_should_exist:
            structure.shouldExist,
        },
      );

    if (structureError) {
      throw new Error(
        structureError.message,
      );
    }
  }

  /*
   * V4.2 HISTORY FK HARDENING
   *
   * A history snapshot can contain ordinary row/state/format/overlay data for
   * formula-bearing rows in addition to rows explicitly listed in structural
   * history. A previous failed structural replay can leave one of those parent
   * rows missing even though the target snapshot expects it to exist.
   *
   * Before restoring ANY dependent smart_sheet_cell_* records, make sure every
   * snapshot row that is NOT explicitly marked shouldExist=false exists.
   *
   * This is deliberately parent-first:
   *   smart_sheet_rows
   *     -> smart_sheet_cell_states
   *     -> smart_sheet_cell_formats
   *     -> smart_sheet_cells
   *
   * Rows that the target snapshot explicitly wants absent are never recreated.
   */
  const explicitlyAbsentRowIds =
    new Set(
      structuralOperations
        .filter(
          (structure) =>
            !structure.shouldExist,
        )
        .map(
          (structure) =>
            String(
              structure.rowSnapshot.id ??
              "",
            ),
        )
        .filter(Boolean),
    );

  const rowsExpectedToExist =
    snapshot.rows.filter(
      (savedRow) => {
        const rowId =
          String(
            savedRow.id ?? "",
          );

        return (
          rowId.length > 0 &&
          !explicitlyAbsentRowIds.has(
            rowId,
          )
        );
      },
    );

  if (
    rowsExpectedToExist.length > 0
  ) {
    const expectedRowIds =
      rowsExpectedToExist.map(
        (savedRow) =>
          String(
            savedRow.id,
          ),
      );

    const {
      data: existingRows,
      error: existingRowsError,
    } =
      await supabase
        .from(
          "smart_sheet_rows",
        )
        .select(
          "id",
        )
        .eq(
          "smart_sheet_id",
          sheetId,
        )
        .eq(
          "organization_id",
          organizationId,
        )
        .in(
          "id",
          expectedRowIds,
        );

    if (existingRowsError) {
      throw new Error(
        existingRowsError.message,
      );
    }

    const existingRowIds =
      new Set(
        (existingRows ?? []).map(
          (row) =>
            String(row.id),
        ),
      );

    const missingRows =
      rowsExpectedToExist.filter(
        (savedRow) =>
          !existingRowIds.has(
            String(savedRow.id),
          ),
      );

    /*
     * Recreate only the missing parent row here. Dependent states are restored
     * later from the exact snapshot in one place, avoiding duplicate inserts
     * and foreign-key ordering failures.
     */
    for (
      const savedRow of
      missingRows
    ) {
      const {
        error: missingRowRestoreError,
      } =
        await supabase.rpc(
          "restore_smart_sheet_row_structure_secure",
          {
            requested_sheet_id:
              sheetId,

            requested_row_snapshot:
              savedRow,

            requested_states:
              [],

            requested_should_exist:
              true,
          },
        );

      if (
        missingRowRestoreError
      ) {
        throw new Error(
          missingRowRestoreError.message,
        );
      }
    }
  }

  /*
   * row_number participates in exact history too. Sort operations can change
   * every row number, and a sheet may enforce uniqueness on row_number.
   * Move rows to a temporary positive range first, then restore exact numbers.
   */
  const rowsWithSavedNumber =
    snapshot.rows.filter((savedRow) =>
      Number.isFinite(Number(savedRow.row_number)),
    );

  if (rowsWithSavedNumber.length > 0) {
    const { data: highestRow, error: highestRowError } = await supabase
      .from("smart_sheet_rows")
      .select("row_number")
      .eq("smart_sheet_id", sheetId)
      .eq("organization_id", organizationId)
      .order("row_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (highestRowError) {
      throw new Error(highestRowError.message);
    }

    const highestRowNumber =
      Number(highestRow?.row_number ?? 0);

    const temporaryBase =
      (Number.isFinite(highestRowNumber) ? highestRowNumber : 0) +
      snapshot.rows.length +
      1000;

    for (let index = 0; index < rowsWithSavedNumber.length; index += 1) {
      const savedRow = rowsWithSavedNumber[index];
      const rowId = String(savedRow.id ?? "");
      if (!rowId) continue;

      const { error: temporaryNumberError } = await supabase
        .from("smart_sheet_rows")
        .update({ row_number: temporaryBase + index + 1 })
        .eq("id", rowId)
        .eq("smart_sheet_id", sheetId)
        .eq("organization_id", organizationId);

      if (temporaryNumberError) {
        throw new Error(temporaryNumberError.message);
      }
    }
  }

  for (const savedRow of snapshot.rows) {
    const rowId = String(savedRow.id ?? "");
    if (!rowId) continue;

    const patch: Record<string, unknown> = {};
    for (const key of historyRowColumns) {
      if (Object.prototype.hasOwnProperty.call(savedRow, key)) {
        patch[key] = savedRow[key];
      }
    }

    const { error } = await supabase
      .from("smart_sheet_rows")
      .update(patch)
      .eq("id", rowId)
      .eq("smart_sheet_id", sheetId)
      .eq("organization_id", organizationId);

    if (error) throw new Error(error.message);
  }

  /*
   * History can contain snapshots captured during an earlier partially-failed
   * structural replay. Keep the restored row identity and ordering, but enforce
   * the spreadsheet invariant that persisted physical row numbers are 1..N.
   */
  await normalizeSmartSheetRowNumbers(
    supabase,
    sheetId,
    organizationId,
  );

  if (snapshot.rowIds.length > 0) {
    const { error: deleteError } = await supabase.from("smart_sheet_cell_states").delete()
      .eq("smart_sheet_id", sheetId).eq("organization_id", organizationId).in("row_id", snapshot.rowIds);
    if (deleteError) throw new Error(deleteError.message);
  }

  if (snapshot.states.length > 0) {
    const restoredStates = snapshot.states.map((state) => {
      const copy = { ...state } as Record<string, unknown>;
      delete copy.id;
      delete copy.created_at;
      delete copy.updated_at;
      copy.organization_id = organizationId;
      copy.smart_sheet_id = sheetId;
      return copy;
    });
    const { error: insertError } = await supabase.from("smart_sheet_cell_states").insert(restoredStates);
    if (insertError) throw new Error(insertError.message);
  }

  // Formatting is presentation metadata, but it participates in the same exact
  // snapshot history so one Undo/Redo restores values and formatting together.
  if (snapshot.rowIds.length > 0) {
    const { error: formatDeleteError } = await supabase
      .from("smart_sheet_cell_formats")
      .delete()
      .eq("smart_sheet_id", sheetId)
      .eq("organization_id", organizationId)
      .in("row_id", snapshot.rowIds);
    if (formatDeleteError) throw new Error(formatDeleteError.message);
  }

  if ((snapshot.formats ?? []).length > 0) {
    const restoredFormats = (snapshot.formats ?? []).map((format) => {
      const copy = { ...format } as Record<string, unknown>;
      delete copy.id;
      delete copy.created_at;
      delete copy.updated_at;
      copy.organization_id = organizationId;
      copy.smart_sheet_id = sheetId;
      return copy;
    });
    const { error: formatInsertError } = await supabase
      .from("smart_sheet_cell_formats")
      .insert(restoredFormats);
    if (formatInsertError) throw new Error(formatInsertError.message);
  }

  // Spreadsheet overlays participate in the SAME exact history transaction.
  // This is what makes horizontal cell movement undoable without touching
  // smart_sheet_rows business fields.
  if (snapshot.rowIds.length > 0) {
    const { error: overlayDeleteError } = await supabase
      .from("smart_sheet_cells")
      .delete()
      .eq("smart_sheet_id", sheetId)
      .eq("organization_id", organizationId)
      .in("row_id", snapshot.rowIds);
    if (overlayDeleteError) throw new Error(overlayDeleteError.message);
  }

  if ((snapshot.overlays ?? []).length > 0) {
    const restoredOverlays = (snapshot.overlays ?? []).map((overlay) => {
      const copy = { ...overlay } as Record<string, unknown>;
      delete copy.id;
      delete copy.created_at;
      delete copy.updated_at;
      copy.organization_id = organizationId;
      copy.smart_sheet_id = sheetId;
      return copy;
    });
    const { error: overlayInsertError } = await supabase
      .from("smart_sheet_cells")
      .insert(restoredOverlays);
    if (overlayInsertError) throw new Error(overlayInsertError.message);
  }

  /*
   * IMPORTANT: Undo/redo is snapshot restoration, not a new calculation.
   * Re-running the calculation RPC here can legitimately produce different
   * values from the historical operation (especially for manual/SAME driver
   * combinations). Restore the exact saved sheet aggregates instead.
   */
  if (snapshot.sheet) {
    const sheetPatch: Record<string, unknown> = {};
    for (const key of [
      "transport_rate",
      "subtotal",
      "vat_total",
      "total",
      "last_edited_at",
    ]) {
      if (Object.prototype.hasOwnProperty.call(snapshot.sheet, key)) {
        sheetPatch[key] = snapshot.sheet[key];
      }
    }

    const { error: sheetRestoreError } = await supabase
      .from("smart_sheets")
      .update(sheetPatch)
      .eq("id", sheetId)
      .eq("organization_id", organizationId);

    if (sheetRestoreError) throw new Error(sheetRestoreError.message);
  }
}

export async function getSmartSheetHistoryStatus(
  input: { sheetId: string },
): Promise<HistoryStatusResult> {
  try {
    const { supabase, organizationId } = await getAuthorizedContext(input.sheetId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const [{ count: undoCount, error: undoError }, { count: redoCount, error: redoError }] = await Promise.all([
      supabase.from("smart_sheet_history").select("id", { count: "exact", head: true })
        .eq("smart_sheet_id", input.sheetId).eq("organization_id", organizationId).eq("user_id", user.id).is("undone_at", null),
      supabase.from("smart_sheet_history").select("id", { count: "exact", head: true })
        .eq("smart_sheet_id", input.sheetId).eq("organization_id", organizationId).eq("user_id", user.id).not("undone_at", "is", null),
    ]);
    if (undoError) throw new Error(undoError.message);
    if (redoError) throw new Error(redoError.message);
    return { ok: true, canUndo: (undoCount ?? 0) > 0, canRedo: (redoCount ?? 0) > 0 };
  } catch (error) {
    return { ok: false, canUndo: false, canRedo: false, message: error instanceof Error ? error.message : "Unable to read history." };
  }
}

export async function undoSmartSheet(
  input: { sheetId: string },
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await getAuthorizedContext(input.sheetId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: operation, error } = await supabase.from("smart_sheet_history")
      .select("id,label,before_snapshot")
      .eq("smart_sheet_id", input.sheetId).eq("organization_id", organizationId).eq("user_id", user.id)
      .is("undone_at", null).order("operation_number", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    if (!operation) return { ok: false, message: "Nothing to undo." };

    await restoreSmartSheetHistorySnapshot(supabase, input.sheetId, organizationId, operation.before_snapshot as SmartSheetHistorySnapshot);
    const { error: markError } = await supabase.from("smart_sheet_history").update({ undone_at: new Date().toISOString() }).eq("id", operation.id);
    if (markError) throw new Error(markError.message);
    revalidateSmartSheet(input.sheetId);
    return { ok: true, message: `Undid: ${operation.label}` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Unable to undo." };
  }
}

export async function redoSmartSheet(
  input: { sheetId: string },
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await getAuthorizedContext(input.sheetId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const { data: operation, error } = await supabase.from("smart_sheet_history")
      .select("id,label,after_snapshot")
      .eq("smart_sheet_id", input.sheetId).eq("organization_id", organizationId).eq("user_id", user.id)
      .not("undone_at", "is", null).order("operation_number", { ascending: true }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    if (!operation) return { ok: false, message: "Nothing to redo." };

    await restoreSmartSheetHistorySnapshot(supabase, input.sheetId, organizationId, operation.after_snapshot as SmartSheetHistorySnapshot);
    const { error: markError } = await supabase.from("smart_sheet_history").update({ undone_at: null }).eq("id", operation.id);
    if (markError) throw new Error(markError.message);
    revalidateSmartSheet(input.sheetId);
    return { ok: true, message: `Redid: ${operation.label}` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Unable to redo." };
  }
}


/* =========================================================
   V4.11a — GENERIC AI DOCUMENT INGESTION FOUNDATION
   =========================================================

   This layer deliberately does NOT perform OCR or AI extraction yet.
   It creates a provider-independent document envelope so the original
   business document can be preserved before OCR / AI processing begins.

   Future processors can attach any language, supplier layout, OCR engine,
   or AI model to the document without changing Smart Sheet cell behavior.
   ========================================================= */

type SmartSheetDocumentSourceType =
  | "upload"
  | "email"
  | "scanner"
  | "api"
  | "manual"
  | "other";

type CreateSmartSheetDocumentEnvelopeInput = {
  sheetId: string;
  originalFilename: string;
  mimeType: string;
  sourceType?: SmartSheetDocumentSourceType;
  sourceReference?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  fileSizeBytes?: number | null;
  sha256?: string | null;
  documentType?: string | null;
  metadata?: Record<string, unknown> | null;
};

type CreateSmartSheetDocumentEnvelopeResult = ActionResult & {
  document?: {
    id: string;
    smart_sheet_id: string;
    organization_id: string;
    source_type: string;
    source_reference: string | null;
    original_filename: string;
    mime_type: string;
    storage_bucket: string | null;
    storage_path: string | null;
    file_size_bytes: number | null;
    sha256: string | null;
    document_type: string;
    detected_language: string | null;
    detected_currency: string | null;
    processing_status: string;
    metadata: unknown;
    created_at: string;
  };
};

function normalizeDocumentTextToken(
  value: string | null | undefined,
  maxLength: number,
) {
  const normalized = (value ?? "").trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

export async function createSmartSheetDocumentEnvelope(
  input: CreateSmartSheetDocumentEnvelopeInput,
): Promise<CreateSmartSheetDocumentEnvelopeResult> {
  try {
    const {
      supabase,
      user,
      organizationId,
    } = await getAuthorizedContext(input.sheetId);

    const originalFilename = normalizeDocumentTextToken(
      input.originalFilename,
      500,
    );
    const mimeType = normalizeDocumentTextToken(
      input.mimeType,
      255,
    );

    if (!originalFilename) {
      throw new Error("Original filename is required.");
    }

    if (!mimeType) {
      throw new Error("Document MIME type is required.");
    }

    if (
      input.fileSizeBytes != null &&
      (!Number.isFinite(input.fileSizeBytes) ||
        input.fileSizeBytes < 0)
    ) {
      throw new Error("Document file size must be a non-negative number.");
    }

    const sourceType =
      input.sourceType ?? "upload";

    const documentType =
      normalizeDocumentTextToken(
        input.documentType,
        120,
      ) ?? "unknown";

    /*
     * The project can use generated Supabase types that pre-date this new
     * migration. Keep the boundary intentionally local until those generated
     * types are refreshed; the persisted shape is defined by the migration.
     */
    const documentTable = (supabase as any).from(
      "smart_sheet_documents",
    );

    const { data, error } = await documentTable
      .insert({
        organization_id: organizationId,
        smart_sheet_id: input.sheetId,
        source_type: sourceType,
        source_reference: normalizeDocumentTextToken(
          input.sourceReference,
          1000,
        ),
        original_filename: originalFilename,
        mime_type: mimeType,
        storage_bucket: normalizeDocumentTextToken(
          input.storageBucket,
          255,
        ),
        storage_path: normalizeDocumentTextToken(
          input.storagePath,
          2000,
        ),
        file_size_bytes:
          input.fileSizeBytes == null
            ? null
            : Math.trunc(input.fileSizeBytes),
        sha256: normalizeDocumentTextToken(
          input.sha256,
          128,
        ),
        document_type: documentType,
        processing_status: "received",
        metadata:
          input.metadata &&
          typeof input.metadata === "object"
            ? input.metadata
            : {},
        created_by: user.id,
        updated_by: user.id,
      })
      .select(
        "id,smart_sheet_id,organization_id,source_type,source_reference,original_filename,mime_type,storage_bucket,storage_path,file_size_bytes,sha256,document_type,detected_language,detected_currency,processing_status,metadata,created_at",
      )
      .single();

    if (error || !data) {
      throw new Error(
        error?.message ||
          "Unable to register document.",
      );
    }

    revalidateSmartSheet(input.sheetId);

    return {
      ok: true,
      message: "Document registered for OCR / AI understanding.",
      document: data as CreateSmartSheetDocumentEnvelopeResult["document"],
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to register document.",
    };
  }
}


/* =========================================================
   V4.11b — DOCUMENT UPLOAD + ORIGINAL FILE PRESERVATION
   =========================================================

   The original source file is written to the private
   `smart-sheet-documents` storage bucket before SAMZY performs OCR or AI
   interpretation. The immutable storage reference + SHA-256 digest are then
   registered in smart_sheet_documents.

   This operation does not write to Smart Sheet cells, formulas, rows, or
   business calculations.
   ========================================================= */

const SMART_SHEET_DOCUMENT_BUCKET = "smart-sheet-documents";
const SMART_SHEET_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const SMART_SHEET_DOCUMENT_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
]);

type UploadSmartSheetDocumentResult = ActionResult & {
  document?: CreateSmartSheetDocumentEnvelopeResult["document"];
};

function sanitizeDocumentStorageFilename(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 180);

  return normalized || "document";
}

export async function uploadSmartSheetDocument(
  formData: FormData,
): Promise<UploadSmartSheetDocumentResult> {
  let uploadedStoragePath: string | null = null;
  let storageClient: SupabaseServerClient | null = null;

  try {
    const sheetIdValue = formData.get("sheetId");
    const fileValue = formData.get("file");

    const sheetId =
      typeof sheetIdValue === "string"
        ? sheetIdValue.trim()
        : "";

    if (!sheetId) {
      throw new Error("Smart Sheet ID is required.");
    }

    if (!(fileValue instanceof File)) {
      throw new Error("Choose a PDF or image to upload.");
    }

    if (fileValue.size <= 0) {
      throw new Error("The selected document is empty.");
    }

    if (fileValue.size > SMART_SHEET_DOCUMENT_MAX_BYTES) {
      throw new Error("Document must be 10 MB or smaller.");
    }

    const mimeType = (fileValue.type || "").trim().toLowerCase();
    if (!SMART_SHEET_DOCUMENT_ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(
        "Unsupported document type. Upload PDF, JPG, PNG, WEBP, or TIFF.",
      );
    }

    const {
      supabase,
      user,
      organizationId,
    } = await getAuthorizedContext(sheetId);

    storageClient = supabase;

    const bytes = Buffer.from(await fileValue.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const safeFilename = sanitizeDocumentStorageFilename(fileValue.name);
    const storagePath = [
      organizationId,
      sheetId,
      `${randomUUID()}-${safeFilename}`,
    ].join("/");

    const { error: storageError } = await supabase.storage
      .from(SMART_SHEET_DOCUMENT_BUCKET)
      .upload(storagePath, bytes, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (storageError) {
      throw new Error(`Unable to preserve document: ${storageError.message}`);
    }

    uploadedStoragePath = storagePath;

    const documentTable = (supabase as any).from(
      "smart_sheet_documents",
    );

    const { data, error: documentError } = await documentTable
      .insert({
        organization_id: organizationId,
        smart_sheet_id: sheetId,
        source_type: "upload",
        source_reference: null,
        original_filename: fileValue.name.slice(0, 500),
        mime_type: mimeType,
        storage_bucket: SMART_SHEET_DOCUMENT_BUCKET,
        storage_path: storagePath,
        file_size_bytes: fileValue.size,
        sha256,
        document_type: "unknown",
        processing_status: "received",
        metadata: {
          preservation_version: 1,
          original_file_preserved: true,
        },
        created_by: user.id,
        updated_by: user.id,
      })
      .select(
        "id,smart_sheet_id,organization_id,source_type,source_reference,original_filename,mime_type,storage_bucket,storage_path,file_size_bytes,sha256,document_type,detected_language,detected_currency,processing_status,metadata,created_at",
      )
      .single();

    if (documentError || !data) {
      await supabase.storage
        .from(SMART_SHEET_DOCUMENT_BUCKET)
        .remove([storagePath]);
      uploadedStoragePath = null;

      throw new Error(
        documentError?.message || "Unable to register uploaded document.",
      );
    }

    revalidateSmartSheet(sheetId);

    return {
      ok: true,
      message: `${fileValue.name} preserved and ready for OCR / AI understanding.`,
      document: data as CreateSmartSheetDocumentEnvelopeResult["document"],
    };
  } catch (error) {
    if (uploadedStoragePath && storageClient) {
      await storageClient.storage
        .from(SMART_SHEET_DOCUMENT_BUCKET)
        .remove([uploadedStoragePath]);
    }

    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to upload document.",
    };
  }
}


/* =========================================================
   V4.11c — OCR + AI DOCUMENT UNDERSTANDING
   =========================================================

   This processor reads only the preserved source document. It does not write
   to Smart Sheet rows, cells, formulas, or business calculations.

   The AI output is versioned in the generic document-ingestion tables so a
   human can review SAMZY's interpretation before any spreadsheet mapping or
   business reconciliation occurs.
   ========================================================= */

type AnalyzeSmartSheetDocumentInput = {
  sheetId: string;
  documentId: string;
};

type AnalyzeSmartSheetDocumentResult = ActionResult & {
  extractionId?: string;
};

type AIExtractedField = {
  canonical_role: string | null;
  original_label: string | null;
  raw_value: string | null;
  normalized_value: string | null;
  language: string | null;
  confidence: number;
};

type AIExtractedLineItem = {
  line_index: number;
  confidence: number;
  fields: AIExtractedField[];
};

type AIDocumentUnderstanding = {
  document_type: string;
  detected_language: string | null;
  detected_currency: string | null;
  overall_confidence: number;
  summary: string;
  fields: AIExtractedField[];
  line_items: AIExtractedLineItem[];
};

const SMART_SHEET_AI_SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const SMART_SHEET_DOCUMENT_UNDERSTANDING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "document_type",
    "detected_language",
    "detected_currency",
    "overall_confidence",
    "summary",
    "fields",
    "line_items",
  ],
  properties: {
    document_type: {
      type: "string",
      description:
        "Open-ended business document type such as supplier_invoice, quotation, delivery_note, sales_receipt, credit_note, purchase_order, or unknown.",
    },
    detected_language: {
      type: ["string", "null"],
      description:
        "Primary document language as an ISO 639-1 code when reasonably identifiable, otherwise null.",
    },
    detected_currency: {
      type: ["string", "null"],
      description:
        "ISO 4217 currency code when present or strongly inferable from an explicit currency symbol/context, otherwise null.",
    },
    overall_confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    summary: {
      type: "string",
      description:
        "Short factual summary of what the document appears to contain. Do not invent missing facts.",
    },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "canonical_role",
          "original_label",
          "raw_value",
          "normalized_value",
          "language",
          "confidence",
        ],
        properties: {
          canonical_role: {
            type: ["string", "null"],
            description:
              "Stable language-neutral SAMZY concept such as supplier_name, customer_name, invoice_number, quotation_number, delivery_note_number, document_date, due_date, purchase_order_number, subtotal, vat_total, total, payment_terms, iban, vat_number, or null when uncertain.",
          },
          original_label: {
            type: ["string", "null"],
            description:
              "Original source-language label exactly as visible when available.",
          },
          raw_value: {
            type: ["string", "null"],
            description:
              "Original visible value exactly as represented in the document when available.",
          },
          normalized_value: {
            type: ["string", "null"],
            description:
              "Language-neutral normalized value when safe to normalize; otherwise preserve the raw value.",
          },
          language: {
            type: ["string", "null"],
            description:
              "Language code for this label/value when useful, otherwise null.",
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
        },
      },
    },
    line_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["line_index", "confidence", "fields"],
        properties: {
          line_index: {
            type: "integer",
            minimum: 0,
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          fields: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "canonical_role",
                "original_label",
                "raw_value",
                "normalized_value",
                "language",
                "confidence",
              ],
              properties: {
                canonical_role: {
                  type: ["string", "null"],
                  description:
                    "Stable concept such as product_name, sku, supplier_sku, barcode, quantity, pack_size, unit_price, supplier_cost, vat_rate, discount, line_total, batch_number, expiry_date, or null when uncertain.",
                },
                original_label: {
                  type: ["string", "null"],
                },
                raw_value: {
                  type: ["string", "null"],
                },
                normalized_value: {
                  type: ["string", "null"],
                },
                language: {
                  type: ["string", "null"],
                },
                confidence: {
                  type: "number",
                  minimum: 0,
                  maximum: 1,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

function clampAIConfidence(value: unknown) {
  const numberValue =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : 0;

  return Math.max(0, Math.min(1, numberValue));
}

function normalizeAIText(
  value: unknown,
  maxLength = 4000,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function extractOpenAIResponseText(payload: any) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }

  const output = Array.isArray(payload?.output)
    ? payload.output
    : [];

  for (const item of output) {
    const content = Array.isArray(item?.content)
      ? item.content
      : [];

    for (const part of content) {
      if (
        part?.type === "output_text" &&
        typeof part?.text === "string"
      ) {
        return part.text;
      }
    }
  }

  return null;
}

function normalizeAIExtractedField(
  value: any,
): AIExtractedField {
  return {
    canonical_role: normalizeAIText(
      value?.canonical_role,
      120,
    ),
    original_label: normalizeAIText(
      value?.original_label,
      500,
    ),
    raw_value: normalizeAIText(
      value?.raw_value,
      4000,
    ),
    normalized_value: normalizeAIText(
      value?.normalized_value,
      4000,
    ),
    language: normalizeAIText(
      value?.language,
      20,
    ),
    confidence: clampAIConfidence(
      value?.confidence,
    ),
  };
}

function normalizeAIDocumentUnderstanding(
  value: any,
): AIDocumentUnderstanding {
  const fields = Array.isArray(value?.fields)
    ? value.fields.map(normalizeAIExtractedField)
    : [];

  const lineItems = Array.isArray(value?.line_items)
    ? value.line_items.map(
        (
          lineItem: any,
          fallbackIndex: number,
        ): AIExtractedLineItem => ({
          line_index:
            Number.isInteger(
              lineItem?.line_index,
            ) &&
            lineItem.line_index >= 0
              ? lineItem.line_index
              : fallbackIndex,
          confidence: clampAIConfidence(
            lineItem?.confidence,
          ),
          fields: Array.isArray(
            lineItem?.fields,
          )
            ? lineItem.fields.map(
                normalizeAIExtractedField,
              )
            : [],
        }),
      )
    : [];

  return {
    document_type:
      normalizeAIText(
        value?.document_type,
        120,
      ) ?? "unknown",
    detected_language: normalizeAIText(
      value?.detected_language,
      20,
    ),
    detected_currency: normalizeAIText(
      value?.detected_currency,
      20,
    ),
    overall_confidence:
      clampAIConfidence(
        value?.overall_confidence,
      ),
    summary:
      normalizeAIText(
        value?.summary,
        4000,
      ) ?? "",
    fields,
    line_items: lineItems,
  };
}

function buildLineItemNormalizedPayload(
  fields: AIExtractedField[],
) {
  const payload: Record<string, string | null> = {};

  for (const field of fields) {
    const role = field.canonical_role;
    if (!role || role in payload) continue;

    payload[role] =
      field.normalized_value ??
      field.raw_value;
  }

  return payload;
}

export async function analyzeSmartSheetDocument(
  input: AnalyzeSmartSheetDocumentInput,
): Promise<AnalyzeSmartSheetDocumentResult & { processing?: boolean }> {
  let extractionId: string | null = null;

  try {
    console.log("[SAMZY-AI-DIAG] 1 ANALYZE_START");
    const {
      supabase,
      user,
      organizationId,
    } = await getAuthorizedContext(input.sheetId);

    console.log("[SAMZY-AI-DIAG] 2 AUTHORIZED_CONTEXT_READY");

    const openAIKey = process.env.OPENAI_API_KEY?.trim();
    if (!openAIKey) {
      throw new Error(
        "OPENAI_API_KEY is not configured for document understanding.",
      );
    }

    const documentTable = (supabase as any).from("smart_sheet_documents");
    const { data: document, error: documentError } = await documentTable
      .select(
        "id,organization_id,smart_sheet_id,original_filename,mime_type,storage_bucket,storage_path,processing_status,metadata",
      )
      .eq("id", input.documentId)
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    console.log("[SAMZY-AI-DIAG] 3 DOCUMENT_QUERY_COMPLETE");

    if (documentError || !document) {
      throw new Error(documentError?.message || "Preserved document not found.");
    }

    if (!document.storage_bucket || !document.storage_path) {
      throw new Error("This document does not have a preserved source file.");
    }

    const mimeType = String(document.mime_type || "").trim().toLowerCase();
    if (
      mimeType !== "application/pdf" &&
      !SMART_SHEET_AI_SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)
    ) {
      throw new Error(
        "AI understanding currently supports PDF, JPG, PNG, and WEBP. The original file remains safely preserved.",
      );
    }

    console.log("[SAMZY-AI-DIAG] 4 STORAGE_DOWNLOAD_START");

    const { data: downloadedFile, error: downloadError } = await supabase.storage
      .from(document.storage_bucket)
      .download(document.storage_path);

    if (downloadError || !downloadedFile) {
      throw new Error(
        downloadError?.message || "Unable to read the preserved source document.",
      );
    }

    console.log("[SAMZY-AI-DIAG] 5 STORAGE_DOWNLOAD_COMPLETE");

    const documentBytes = Buffer.from(await downloadedFile.arrayBuffer());
    console.log("[SAMZY-AI-DIAG] 6 BUFFER_READY bytes=" + documentBytes.length);
    const extractionTable = (supabase as any).from(
      "smart_sheet_document_extractions",
    );

    const { data: latestExtraction, error: latestExtractionError } =
      await extractionTable
        .select("extraction_version")
        .eq("document_id", document.id)
        .eq("organization_id", organizationId)
        .order("extraction_version", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (latestExtractionError) {
      throw new Error(latestExtractionError.message);
    }

    const nextVersion = Number(latestExtraction?.extraction_version ?? 0) + 1;
    const model =
      process.env.OPENAI_DOCUMENT_MODEL?.trim() || "gpt-5.6-terra";

    const { data: extraction, error: extractionInsertError } =
      await extractionTable
        .insert({
          organization_id: organizationId,
          document_id: document.id,
          extraction_version: nextVersion,
          is_current: false,
          processor_type: "ai",
          provider: "openai",
          model,
          status: "processing",
          processing_notes: {
            started_by: user.id,
            source: "preserved_original",
            understanding_version: 1,
            execution_mode: "openai_background",
          },
          created_by: user.id,
        })
        .select("id")
        .single();

    if (extractionInsertError || !extraction) {
      throw new Error(
        extractionInsertError?.message || "Unable to create document extraction.",
      );
    }

    extractionId = extraction.id;

    await documentTable
      .update({
        processing_status: "processing",
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id)
      .eq("organization_id", organizationId);

    console.log("[SAMZY-AI-DIAG] 7 EXTRACTION_ROW_READY");

    const base64 = documentBytes.toString("base64");
    console.log("[SAMZY-AI-DIAG] 8 BASE64_READY chars=" + base64.length);
    const sourceContent =
      mimeType === "application/pdf"
        ? {
            type: "input_file",
            filename: document.original_filename,
            file_data: `data:application/pdf;base64,${base64}`,
          }
        : {
            type: "input_image",
            image_url: `data:${mimeType};base64,${base64}`,
            detail: "high",
          };

    console.log("[SAMZY-AI-DIAG] 9 OPENAI_REQUEST_START");

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        background: true,
        input: [
          {
            role: "developer",
            content: [
              {
                type: "input_text",
                text:
                  "You are SAMZY's multilingual business-document understanding engine. Read the preserved business document exactly as supplied. Identify the document type and primary language, then extract factual header/summary fields and every visible line item. Preserve source-language labels and raw values. Map only concepts you can identify with reasonable confidence to concise language-neutral canonical roles. Never invent missing values, never infer products that are not visible, never calculate a value solely because it could be derived, and use conservative confidence scores. The customer may receive documents from any European country and language. Do not translate or rename the original document; normalized values are supplemental only.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "Analyze this document for review only. Return the complete structured extraction. Nothing from this result should be treated as confirmed business data until a human reviews it.",
              },
              sourceContent,
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "samzy_document_understanding",
            strict: true,
            schema: SMART_SHEET_DOCUMENT_UNDERSTANDING_SCHEMA,
          },
        },
        max_output_tokens: 32000,
      }),
    });

    console.log(
      "[SAMZY-AI-DIAG] 10 OPENAI_RESPONSE_RECEIVED status=" + aiResponse.status,
    );

    const aiPayload = await aiResponse.json();
    console.log("[SAMZY-AI-DIAG] 11 OPENAI_JSON_PARSED");
    if (!aiResponse.ok) {
      const apiMessage =
        normalizeAIText(aiPayload?.error?.message, 2000) ||
        `OpenAI request failed with status ${aiResponse.status}.`;
      throw new Error(apiMessage);
    }

    const responseId = normalizeAIText(aiPayload?.id, 300);
    if (!responseId) {
      throw new Error("OpenAI did not return a background response ID.");
    }

    const responseStatus = normalizeAIText(aiPayload?.status, 50) || "queued";

    const { error: extractionUpdateError } = await extractionTable
      .update({
        processing_notes: {
          started_by: user.id,
          source: "preserved_original",
          understanding_version: 1,
          execution_mode: "openai_background",
          openai_response_id: responseId,
          openai_status: responseStatus,
        },
      })
      .eq("id", extraction.id)
      .eq("organization_id", organizationId);

    if (extractionUpdateError) {
      throw new Error(extractionUpdateError.message);
    }

    revalidateSmartSheet(input.sheetId);

    return {
      ok: true,
      processing: true,
      extractionId: extraction.id,
      message: `${document.original_filename} is being analyzed in the background. You can keep using the Smart Sheet while SAMZY processes it.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to analyze document.";

    if (extractionId) {
      try {
        const { supabase, organizationId } = await getAuthorizedContext(
          input.sheetId,
        );

        await (supabase as any)
          .from("smart_sheet_document_extractions")
          .update({
            status: "failed",
            is_current: false,
            processing_notes: {
              error: message,
              understanding_version: 1,
              execution_mode: "openai_background",
            },
          })
          .eq("id", extractionId)
          .eq("organization_id", organizationId);

        await (supabase as any)
          .from("smart_sheet_documents")
          .update({
            processing_status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.documentId)
          .eq("organization_id", organizationId);
      } catch {
        // Preserve the original error returned to the UI.
      }
    }

    return { ok: false, message };
  }
}

type CheckSmartSheetDocumentAnalysisInput = {
  sheetId: string;
  documentId: string;
};

type CheckSmartSheetDocumentAnalysisResult = ActionResult & {
  status?: "processing" | "completed" | "failed";
  extractionId?: string;
};

async function persistCompletedDocumentUnderstanding(params: {
  supabase: SupabaseServerClient;
  organizationId: string;
  userId: string;
  sheetId: string;
  document: any;
  extraction: any;
  aiPayload: any;
}) {
  const {
    supabase,
    organizationId,
    userId,
    sheetId,
    document,
    extraction,
    aiPayload,
  } = params;

  const outputText = extractOpenAIResponseText(aiPayload);
  if (!outputText) {
    throw new Error("The AI processor returned no structured document output.");
  }

  let parsedOutput: unknown;
  try {
    parsedOutput = JSON.parse(outputText);
  } catch {
    throw new Error("The AI processor returned invalid structured output.");
  }

  const understanding = normalizeAIDocumentUnderstanding(parsedOutput);

  const fieldRows: Array<{
    line_item_index: number | null;
    [key: string]: unknown;
  }> = understanding.fields.map((field) => ({
    organization_id: organizationId,
    document_id: document.id,
    extraction_id: extraction.id,
    field_scope: "header",
    line_item_index: null,
    canonical_role: field.canonical_role,
    original_label: field.original_label,
    raw_value: field.raw_value,
    normalized_value: field.normalized_value,
    language: field.language,
    confidence: field.confidence,
    review_status: "unreviewed",
    metadata: { source: "ai" },
  }));

  for (const lineItem of understanding.line_items) {
    for (const field of lineItem.fields) {
      fieldRows.push({
        organization_id: organizationId,
        document_id: document.id,
        extraction_id: extraction.id,
        field_scope: "line_item",
        line_item_index: lineItem.line_index,
        canonical_role: field.canonical_role,
        original_label: field.original_label,
        raw_value: field.raw_value,
        normalized_value: field.normalized_value,
        language: field.language,
        confidence: field.confidence,
        review_status: "unreviewed",
        metadata: { source: "ai" },
      });
    }
  }

  const lineItemRows = understanding.line_items.map((lineItem) => ({
    organization_id: organizationId,
    document_id: document.id,
    extraction_id: extraction.id,
    line_index: lineItem.line_index,
    raw_payload: {
      fields: lineItem.fields.map((field) => ({
        original_label: field.original_label,
        raw_value: field.raw_value,
        canonical_role: field.canonical_role,
      })),
    },
    normalized_payload: buildLineItemNormalizedPayload(lineItem.fields),
    confidence: lineItem.confidence,
    review_status: "unreviewed",
    metadata: { source: "ai" },
  }));

  const fieldTable = (supabase as any).from("smart_sheet_document_fields");
  if (fieldRows.length > 0) {
    const { error } = await fieldTable.insert(fieldRows);
    if (error) throw new Error(error.message);
  }

  const lineItemTable = (supabase as any).from(
    "smart_sheet_document_line_items",
  );
  if (lineItemRows.length > 0) {
    const { error } = await lineItemTable.insert(lineItemRows);
    if (error) throw new Error(error.message);
  }

  const extractionTable = (supabase as any).from(
    "smart_sheet_document_extractions",
  );

  const { error: priorCurrentError } = await extractionTable
    .update({ is_current: false })
    .eq("document_id", document.id)
    .eq("organization_id", organizationId)
    .neq("id", extraction.id);
  if (priorCurrentError) throw new Error(priorCurrentError.message);

  const notes =
    extraction.processing_notes && typeof extraction.processing_notes === "object"
      ? extraction.processing_notes
      : {};

  const { error: extractionUpdateError } = await extractionTable
    .update({
      is_current: true,
      status: "completed",
      detected_language: understanding.detected_language,
      detected_document_type: understanding.document_type,
      confidence: understanding.overall_confidence,
      raw_payload: aiPayload,
      normalized_payload: {
        document_type: understanding.document_type,
        detected_language: understanding.detected_language,
        detected_currency: understanding.detected_currency,
        overall_confidence: understanding.overall_confidence,
        summary: understanding.summary,
        header_field_count: understanding.fields.length,
        line_item_count: understanding.line_items.length,
      },
      processing_notes: {
        ...notes,
        openai_status: "completed",
        reviewed: false,
      },
    })
    .eq("id", extraction.id)
    .eq("organization_id", organizationId);

  if (extractionUpdateError) throw new Error(extractionUpdateError.message);

  const documentTable = (supabase as any).from("smart_sheet_documents");
  const documentMetadata =
    document.metadata && typeof document.metadata === "object"
      ? document.metadata
      : {};

  const { error: documentUpdateError } = await documentTable
    .update({
      document_type: understanding.document_type,
      detected_language: understanding.detected_language,
      detected_currency: understanding.detected_currency,
      processing_status: "review_required",
      metadata: {
        ...documentMetadata,
        ai_understanding_version: 1,
        current_extraction_id: extraction.id,
      },
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", document.id)
    .eq("organization_id", organizationId);

  if (documentUpdateError) throw new Error(documentUpdateError.message);

  revalidateSmartSheet(sheetId);
  return understanding;
}

export async function checkSmartSheetDocumentAnalysis(
  input: CheckSmartSheetDocumentAnalysisInput,
): Promise<CheckSmartSheetDocumentAnalysisResult> {
  try {
    const { supabase, user, organizationId } = await getAuthorizedContext(
      input.sheetId,
    );

    const openAIKey = process.env.OPENAI_API_KEY?.trim();
    if (!openAIKey) {
      throw new Error(
        "OPENAI_API_KEY is not configured for document understanding.",
      );
    }

    const documentTable = (supabase as any).from("smart_sheet_documents");
    const { data: document, error: documentError } = await documentTable
      .select(
        "id,organization_id,smart_sheet_id,original_filename,metadata,processing_status",
      )
      .eq("id", input.documentId)
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (documentError || !document) {
      throw new Error(documentError?.message || "Preserved document not found.");
    }

    const extractionTable = (supabase as any).from(
      "smart_sheet_document_extractions",
    );

    const { data: extraction, error: extractionError } = await extractionTable
      .select("id,status,processing_notes,extraction_version")
      .eq("document_id", document.id)
      .eq("organization_id", organizationId)
      .order("extraction_version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (extractionError) throw new Error(extractionError.message);
    if (!extraction) {
      return {
        ok: false,
        status: "failed",
        message: "No document analysis is available to check.",
      };
    }

    if (extraction.status === "completed") {
      return {
        ok: true,
        status: "completed",
        extractionId: extraction.id,
        message: "Document analysis is ready for review.",
      };
    }

    if (extraction.status === "failed") {
      const notes =
        extraction.processing_notes && typeof extraction.processing_notes === "object"
          ? extraction.processing_notes
          : {};
      return {
        ok: false,
        status: "failed",
        extractionId: extraction.id,
        message:
          normalizeAIText((notes as any).error, 2000) ||
          "Document analysis failed.",
      };
    }

    const notes =
      extraction.processing_notes && typeof extraction.processing_notes === "object"
        ? extraction.processing_notes
        : {};
    const responseId = normalizeAIText((notes as any).openai_response_id, 300);

    if (!responseId) {
      return {
        ok: false,
        status: "failed",
        extractionId: extraction.id,
        message:
          "This earlier analysis did not retain a background response ID. Start Analyze document again once to create a resumable analysis.",
      };
    }

    const aiResponse = await fetch(
      `https://api.openai.com/v1/responses/${encodeURIComponent(responseId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${openAIKey}` },
        cache: "no-store",
      },
    );

    const aiPayload = await aiResponse.json();
    if (!aiResponse.ok) {
      const apiMessage =
        normalizeAIText(aiPayload?.error?.message, 2000) ||
        `OpenAI status check failed with status ${aiResponse.status}.`;
      throw new Error(apiMessage);
    }

    const status = normalizeAIText(aiPayload?.status, 50) || "unknown";

    if (status === "queued" || status === "in_progress") {
      await extractionTable
        .update({
          processing_notes: {
            ...notes,
            openai_status: status,
            last_checked_at: new Date().toISOString(),
          },
        })
        .eq("id", extraction.id)
        .eq("organization_id", organizationId);

      return {
        ok: true,
        status: "processing",
        extractionId: extraction.id,
        message: "SAMZY is still analyzing the document.",
      };
    }

    if (status !== "completed") {
      const errorMessage =
        normalizeAIText(aiPayload?.error?.message, 2000) ||
        `OpenAI document analysis ended with status ${status}.`;

      await extractionTable
        .update({
          status: "failed",
          is_current: false,
          processing_notes: {
            ...notes,
            openai_status: status,
            error: errorMessage,
          },
        })
        .eq("id", extraction.id)
        .eq("organization_id", organizationId);

      await documentTable
        .update({
          processing_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", document.id)
        .eq("organization_id", organizationId);

      return {
        ok: false,
        status: "failed",
        extractionId: extraction.id,
        message: errorMessage,
      };
    }

    await persistCompletedDocumentUnderstanding({
      supabase,
      organizationId,
      userId: user.id,
      sheetId: input.sheetId,
      document,
      extraction,
      aiPayload,
    });

    return {
      ok: true,
      status: "completed",
      extractionId: extraction.id,
      message: `${document.original_filename} analyzed. Review SAMZY's interpretation before mapping anything to the Smart Sheet.`,
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      message:
        error instanceof Error
          ? error.message
          : "Unable to check document analysis.",
    };
  }
}


/* =========================================================
   V4.11d1 — HUMAN DOCUMENT REVIEW FOUNDATION
   ========================================================= */

type SmartSheetDocumentReviewStatus =
  | "unreviewed"
  | "approved"
  | "rejected";

type UpdateSmartSheetDocumentFieldReviewInput = {
  sheetId: string;
  fieldId: string;
  normalizedValue: string | null;
  reviewStatus: SmartSheetDocumentReviewStatus;
};

type SetSmartSheetDocumentLineItemReviewInput = {
  sheetId: string;
  lineItemId: string;
  reviewStatus: Extract<SmartSheetDocumentReviewStatus, "approved" | "rejected">;
};

type BulkApproveHighConfidenceDocumentReviewInput = {
  sheetId: string;
  documentId: string;
  minimumConfidence?: number;
};

type BulkApproveHighConfidenceDocumentReviewResult = ActionResult & {
  approvedFieldCount?: number;
  approvedLineCount?: number;
  remainingFieldCount?: number;
  remainingLineCount?: number;
  reviewState?: "review_required" | "in_review" | "review_complete";
};

function normalizeHumanReviewValue(value: string | null) {
  if (value == null) return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, 4000) : null;
}

function normalizeDocumentReviewConfidence(value: unknown) {
  const numeric = typeof value === "string" ? Number(value) : value;
  return typeof numeric === "number" && Number.isFinite(numeric)
    ? Math.max(0, Math.min(1, numeric))
    : 0;
}

async function syncSmartSheetDocumentReviewStatus({
  supabase,
  organizationId,
  documentId,
  extractionId,
  userId,
}: {
  supabase: SupabaseServerClient;
  organizationId: string;
  documentId: string;
  extractionId: string;
  userId: string;
}) {
  const fieldTable = (supabase as any).from("smart_sheet_document_fields");
  const lineItemTable = (supabase as any).from(
    "smart_sheet_document_line_items",
  );

  const [fieldResult, lineResult] = await Promise.all([
    fieldTable
      .select("id,review_status")
      .eq("extraction_id", extractionId)
      .eq("organization_id", organizationId),
    lineItemTable
      .select("id,review_status")
      .eq("extraction_id", extractionId)
      .eq("organization_id", organizationId),
  ]);

  if (fieldResult.error) throw new Error(fieldResult.error.message);
  if (lineResult.error) throw new Error(lineResult.error.message);

  const fields = fieldResult.data ?? [];
  const lines = lineResult.data ?? [];
  const reviewedFields = fields.filter(
    (field: any) => field.review_status !== "unreviewed",
  ).length;
  const reviewedLines = lines.filter(
    (line: any) => line.review_status !== "unreviewed",
  ).length;
  const remainingFieldCount = Math.max(0, fields.length - reviewedFields);
  const remainingLineCount = Math.max(0, lines.length - reviewedLines);

  const anyReviewed = reviewedFields > 0 || reviewedLines > 0;
  const reviewState =
    remainingFieldCount === 0 && remainingLineCount === 0
      ? "review_complete"
      : anyReviewed
        ? "in_review"
        : "review_required";

  const documentTable = (supabase as any).from("smart_sheet_documents");
  const { data: document, error: documentError } = await documentTable
    .select("metadata")
    .eq("id", documentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (documentError || !document) {
    throw new Error(documentError?.message || "Document not found.");
  }

  const priorMetadata =
    document.metadata && typeof document.metadata === "object"
      ? document.metadata
      : {};

  const { error: updateError } = await documentTable
    .update({
      processing_status: reviewState,
      metadata: {
        ...priorMetadata,
        review_state: reviewState,
        review_counts: {
          field_total: fields.length,
          field_reviewed: reviewedFields,
          field_remaining: remainingFieldCount,
          line_total: lines.length,
          line_reviewed: reviewedLines,
          line_remaining: remainingLineCount,
        },
        last_reviewed_by: userId,
        last_reviewed_at: new Date().toISOString(),
      },
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("organization_id", organizationId);

  if (updateError) throw new Error(updateError.message);

  return {
    reviewState,
    remainingFieldCount,
    remainingLineCount,
  } as const;
}

export async function updateSmartSheetDocumentFieldReview(
  input: UpdateSmartSheetDocumentFieldReviewInput,
): Promise<ActionResult> {
  try {
    const { supabase, user, organizationId } =
      await getAuthorizedContext(input.sheetId);

    const allowedStatuses = new Set<SmartSheetDocumentReviewStatus>([
      "unreviewed",
      "approved",
      "rejected",
    ]);

    if (!allowedStatuses.has(input.reviewStatus)) {
      throw new Error("Invalid document field review status.");
    }

    const fieldTable = (supabase as any).from(
      "smart_sheet_document_fields",
    );

    const { data: field, error: fieldError } = await fieldTable
      .select(
        "id,document_id,extraction_id,field_scope,line_item_index,canonical_role,raw_value,normalized_value,review_status,metadata",
      )
      .eq("id", input.fieldId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (fieldError || !field) {
      throw new Error(fieldError?.message || "Document field not found.");
    }

    const documentTable = (supabase as any).from("smart_sheet_documents");
    const { data: document, error: documentError } = await documentTable
      .select("id,smart_sheet_id")
      .eq("id", field.document_id)
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (documentError || !document) {
      throw new Error(
        documentError?.message || "Document field does not belong to this Smart Sheet.",
      );
    }

    const extractionTable = (supabase as any).from(
      "smart_sheet_document_extractions",
    );
    const { data: extraction, error: extractionError } = await extractionTable
      .select("id,is_current,status")
      .eq("id", field.extraction_id)
      .eq("document_id", field.document_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (extractionError || !extraction || !extraction.is_current) {
      throw new Error(
        extractionError?.message ||
          "Only fields from the current document extraction can be reviewed.",
      );
    }

    if (extraction.status !== "completed") {
      throw new Error("Document analysis must be completed before review.");
    }

    const normalizedValue = normalizeHumanReviewValue(input.normalizedValue);
    const priorMetadata =
      field.metadata && typeof field.metadata === "object" ? field.metadata : {};
    const priorDisplay =
      typeof field.normalized_value === "string"
        ? field.normalized_value
        : field.normalized_value != null
          ? JSON.stringify(field.normalized_value)
          : field.raw_value ?? null;
    const humanEdited = normalizedValue !== priorDisplay;

    const { error: updateError } = await fieldTable
      .update({
        normalized_value: normalizedValue,
        review_status: input.reviewStatus,
        metadata: {
          ...priorMetadata,
          human_reviewed: input.reviewStatus !== "unreviewed",
          human_edited: humanEdited,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        },
      })
      .eq("id", field.id)
      .eq("organization_id", organizationId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (
      field.field_scope === "line_item" &&
      Number.isInteger(field.line_item_index) &&
      typeof field.canonical_role === "string" &&
      field.canonical_role.trim()
    ) {
      const lineItemTable = (supabase as any).from(
        "smart_sheet_document_line_items",
      );
      const { data: lineItem, error: lineItemError } = await lineItemTable
        .select("id,normalized_payload,metadata")
        .eq("extraction_id", field.extraction_id)
        .eq("line_index", field.line_item_index)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (lineItemError) {
        throw new Error(lineItemError.message);
      }

      if (lineItem) {
        const payload =
          lineItem.normalized_payload &&
          typeof lineItem.normalized_payload === "object"
            ? lineItem.normalized_payload
            : {};
        const lineMetadata =
          lineItem.metadata && typeof lineItem.metadata === "object"
            ? lineItem.metadata
            : {};

        const { error: lineUpdateError } = await lineItemTable
          .update({
            normalized_payload: {
              ...payload,
              [field.canonical_role]: normalizedValue ?? field.raw_value ?? null,
            },
            metadata: {
              ...lineMetadata,
              contains_human_field_review: true,
              last_human_reviewed_by: user.id,
              last_human_reviewed_at: new Date().toISOString(),
            },
          })
          .eq("id", lineItem.id)
          .eq("organization_id", organizationId);

        if (lineUpdateError) {
          throw new Error(lineUpdateError.message);
        }
      }
    }

    await syncSmartSheetDocumentReviewStatus({
      supabase,
      organizationId,
      documentId: field.document_id,
      extractionId: field.extraction_id,
      userId: user.id,
    });

    revalidateSmartSheet(input.sheetId);

    return {
      ok: true,
      message:
        input.reviewStatus === "approved"
          ? "Field approved."
          : input.reviewStatus === "rejected"
            ? "Field rejected."
            : "Field returned to unreviewed.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to review document field.",
    };
  }
}

export async function setSmartSheetDocumentLineItemReview(
  input: SetSmartSheetDocumentLineItemReviewInput,
): Promise<ActionResult> {
  try {
    const { supabase, user, organizationId } =
      await getAuthorizedContext(input.sheetId);

    if (
      input.reviewStatus !== "approved" &&
      input.reviewStatus !== "rejected"
    ) {
      throw new Error("Invalid line-item review status.");
    }

    const lineItemTable = (supabase as any).from(
      "smart_sheet_document_line_items",
    );
    const { data: lineItem, error: lineItemError } = await lineItemTable
      .select(
        "id,document_id,extraction_id,line_index,review_status,metadata",
      )
      .eq("id", input.lineItemId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (lineItemError || !lineItem) {
      throw new Error(lineItemError?.message || "Document line item not found.");
    }

    const documentTable = (supabase as any).from("smart_sheet_documents");
    const { data: document, error: documentError } = await documentTable
      .select("id,smart_sheet_id")
      .eq("id", lineItem.document_id)
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (documentError || !document) {
      throw new Error(
        documentError?.message ||
          "Document line item does not belong to this Smart Sheet.",
      );
    }

    const extractionTable = (supabase as any).from(
      "smart_sheet_document_extractions",
    );
    const { data: extraction, error: extractionError } = await extractionTable
      .select("id,is_current,status")
      .eq("id", lineItem.extraction_id)
      .eq("document_id", lineItem.document_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (extractionError || !extraction || !extraction.is_current) {
      throw new Error(
        extractionError?.message ||
          "Only line items from the current document extraction can be reviewed.",
      );
    }

    if (extraction.status !== "completed") {
      throw new Error("Document analysis must be completed before review.");
    }

    const priorMetadata =
      lineItem.metadata && typeof lineItem.metadata === "object"
        ? lineItem.metadata
        : {};

    const { error: updateLineError } = await lineItemTable
      .update({
        review_status: input.reviewStatus,
        metadata: {
          ...priorMetadata,
          human_reviewed: true,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        },
      })
      .eq("id", lineItem.id)
      .eq("organization_id", organizationId);

    if (updateLineError) {
      throw new Error(updateLineError.message);
    }

    const fieldTable = (supabase as any).from(
      "smart_sheet_document_fields",
    );
    const { data: lineFields, error: lineFieldsError } = await fieldTable
      .select("id,metadata")
      .eq("extraction_id", lineItem.extraction_id)
      .eq("line_item_index", lineItem.line_index)
      .eq("field_scope", "line_item")
      .eq("organization_id", organizationId);

    if (lineFieldsError) {
      throw new Error(lineFieldsError.message);
    }

    for (const field of lineFields ?? []) {
      const fieldMetadata =
        field.metadata && typeof field.metadata === "object"
          ? field.metadata
          : {};
      const { error: fieldUpdateError } = await fieldTable
        .update({
          review_status: input.reviewStatus,
          metadata: {
            ...fieldMetadata,
            human_reviewed: true,
            reviewed_via_line_item: true,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          },
        })
        .eq("id", field.id)
        .eq("organization_id", organizationId);

      if (fieldUpdateError) {
        throw new Error(fieldUpdateError.message);
      }
    }

    await syncSmartSheetDocumentReviewStatus({
      supabase,
      organizationId,
      documentId: lineItem.document_id,
      extractionId: lineItem.extraction_id,
      userId: user.id,
    });

    revalidateSmartSheet(input.sheetId);

    return {
      ok: true,
      message:
        input.reviewStatus === "approved"
          ? `Line ${lineItem.line_index + 1} approved.`
          : `Line ${lineItem.line_index + 1} rejected.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to review document line item.",
    };
  }
}


export async function bulkApproveHighConfidenceDocumentReview(
  input: BulkApproveHighConfidenceDocumentReviewInput,
): Promise<BulkApproveHighConfidenceDocumentReviewResult> {
  try {
    const { supabase, user, organizationId } =
      await getAuthorizedContext(input.sheetId);

    const minimumConfidence = Math.max(
      0.5,
      Math.min(1, input.minimumConfidence ?? 0.95),
    );

    const documentTable = (supabase as any).from("smart_sheet_documents");
    const { data: document, error: documentError } = await documentTable
      .select("id,smart_sheet_id")
      .eq("id", input.documentId)
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (documentError || !document) {
      throw new Error(documentError?.message || "Document not found.");
    }

    const extractionTable = (supabase as any).from(
      "smart_sheet_document_extractions",
    );
    const { data: extraction, error: extractionError } = await extractionTable
      .select("id,status,is_current")
      .eq("document_id", document.id)
      .eq("organization_id", organizationId)
      .eq("is_current", true)
      .maybeSingle();

    if (extractionError || !extraction) {
      throw new Error(
        extractionError?.message || "Current document extraction not found.",
      );
    }

    if (extraction.status !== "completed") {
      throw new Error("Document analysis must be completed before review.");
    }

    const fieldTable = (supabase as any).from(
      "smart_sheet_document_fields",
    );
    const lineItemTable = (supabase as any).from(
      "smart_sheet_document_line_items",
    );

    const [fieldResult, lineResult] = await Promise.all([
      fieldTable
        .select(
          "id,field_scope,line_item_index,canonical_role,confidence,review_status,metadata",
        )
        .eq("extraction_id", extraction.id)
        .eq("organization_id", organizationId),
      lineItemTable
        .select("id,line_index,confidence,review_status,metadata")
        .eq("extraction_id", extraction.id)
        .eq("organization_id", organizationId),
    ]);

    if (fieldResult.error) throw new Error(fieldResult.error.message);
    if (lineResult.error) throw new Error(lineResult.error.message);

    const allFields = fieldResult.data ?? [];
    const allLines = lineResult.data ?? [];
    const fieldsByLine = new Map<number, any[]>();

    for (const field of allFields) {
      if (
        field.field_scope === "line_item" &&
        Number.isInteger(field.line_item_index)
      ) {
        const existing = fieldsByLine.get(field.line_item_index) ?? [];
        existing.push(field);
        fieldsByLine.set(field.line_item_index, existing);
      }
    }

    const reviewedAt = new Date().toISOString();
    let approvedFieldCount = 0;
    let approvedLineCount = 0;

    // Header/summary fields are safe for bulk approval only when they are
    // recognized, unreviewed, high-confidence, and have not been human-edited.
    for (const field of allFields) {
      if (field.field_scope === "line_item") continue;
      const metadata =
        field.metadata && typeof field.metadata === "object"
          ? field.metadata
          : {};
      const eligible =
        field.review_status === "unreviewed" &&
        typeof field.canonical_role === "string" &&
        field.canonical_role.trim().length > 0 &&
        normalizeDocumentReviewConfidence(field.confidence) >=
          minimumConfidence &&
        metadata.human_edited !== true;

      if (!eligible) continue;

      const { error } = await fieldTable
        .update({
          review_status: "approved",
          metadata: {
            ...metadata,
            human_reviewed: true,
            reviewed_via_bulk_confidence: true,
            bulk_confidence_threshold: minimumConfidence,
            reviewed_by: user.id,
            reviewed_at: reviewedAt,
          },
        })
        .eq("id", field.id)
        .eq("organization_id", organizationId);

      if (error) throw new Error(error.message);
      approvedFieldCount += 1;
    }

    // A line is bulk-approved only when the line itself is high-confidence and
    // every field on that line is recognized, high-confidence, unreviewed, and
    // untouched by a human. One ambiguous field keeps the whole line for review.
    for (const line of allLines) {
      if (line.review_status !== "unreviewed") continue;
      if (
        normalizeDocumentReviewConfidence(line.confidence) < minimumConfidence
      ) {
        continue;
      }

      const lineFields = fieldsByLine.get(line.line_index) ?? [];
      if (lineFields.length === 0) continue;

      const lineEligible = lineFields.every((field: any) => {
        const metadata =
          field.metadata && typeof field.metadata === "object"
            ? field.metadata
            : {};
        return (
          field.review_status === "unreviewed" &&
          typeof field.canonical_role === "string" &&
          field.canonical_role.trim().length > 0 &&
          normalizeDocumentReviewConfidence(field.confidence) >=
            minimumConfidence &&
          metadata.human_edited !== true
        );
      });

      if (!lineEligible) continue;

      const lineMetadata =
        line.metadata && typeof line.metadata === "object" ? line.metadata : {};

      const { error: lineUpdateError } = await lineItemTable
        .update({
          review_status: "approved",
          metadata: {
            ...lineMetadata,
            human_reviewed: true,
            reviewed_via_bulk_confidence: true,
            bulk_confidence_threshold: minimumConfidence,
            reviewed_by: user.id,
            reviewed_at: reviewedAt,
          },
        })
        .eq("id", line.id)
        .eq("organization_id", organizationId);

      if (lineUpdateError) throw new Error(lineUpdateError.message);

      for (const field of lineFields) {
        const fieldMetadata =
          field.metadata && typeof field.metadata === "object"
            ? field.metadata
            : {};
        const { error: fieldUpdateError } = await fieldTable
          .update({
            review_status: "approved",
            metadata: {
              ...fieldMetadata,
              human_reviewed: true,
              reviewed_via_bulk_confidence: true,
              reviewed_via_line_item: true,
              bulk_confidence_threshold: minimumConfidence,
              reviewed_by: user.id,
              reviewed_at: reviewedAt,
            },
          })
          .eq("id", field.id)
          .eq("organization_id", organizationId);

        if (fieldUpdateError) throw new Error(fieldUpdateError.message);
        approvedFieldCount += 1;
      }

      approvedLineCount += 1;
    }

    const reviewSummary = await syncSmartSheetDocumentReviewStatus({
      supabase,
      organizationId,
      documentId: document.id,
      extractionId: extraction.id,
      userId: user.id,
    });

    revalidateSmartSheet(input.sheetId);

    return {
      ok: true,
      message:
        approvedFieldCount === 0 && approvedLineCount === 0
          ? `No additional unreviewed items met the ${Math.round(minimumConfidence * 100)}% confidence rule.`
          : `Approved ${approvedLineCount} high-confidence line${approvedLineCount === 1 ? "" : "s"} and ${approvedFieldCount} field${approvedFieldCount === 1 ? "" : "s"}.`,
      approvedFieldCount,
      approvedLineCount,
      remainingFieldCount: reviewSummary.remainingFieldCount,
      remainingLineCount: reviewSummary.remainingLineCount,
      reviewState: reviewSummary.reviewState,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to bulk-review high-confidence document data.",
    };
  }
}


/* =========================================================
   V4.11e1 — CONTROLLED SMART SHEET MAPPING PREVIEW
   =========================================================

   Preview only. This compares approved AI document concepts with the
   customer's current Smart Sheet column semantics. It never writes document
   values into rows/cells and never changes business calculations.
   ========================================================= */

type SmartSheetDocumentMappingPreviewInput = {
  sheetId: string;
  documentId: string;
};

type SmartSheetDocumentMappingPreviewRow = {
  scope: "header" | "line_item";
  canonicalRole: string;
  approvedValueCount: number;
  sampleValue: string | null;
  targetColumnId: string | null;
  targetColumnKey: string | null;
  targetColumnLabel: string | null;
  mappingStatus: "matched" | "needs_mapping" | "ambiguous";
  mappingSource: "semantic_metadata" | "system_identity" | "document_manual" | null;
};

type SmartSheetDocumentMappingColumn = {
  id: string;
  columnKey: string;
  label: string;
  position: number;
  hidden: boolean;
  isSystem: boolean;
};

type SmartSheetDocumentMappingPreviewResult = ActionResult & {
  rows?: SmartSheetDocumentMappingPreviewRow[];
  columns?: SmartSheetDocumentMappingColumn[];
  matchedRoleCount?: number;
  needsMappingRoleCount?: number;
  ambiguousRoleCount?: number;
  approvedLineCount?: number;
};

type SetSmartSheetDocumentConceptMappingInput = {
  sheetId: string;
  documentId: string;
  scope: "header" | "line_item";
  canonicalRole: string;
  targetColumnId: string;
};

type ClearSmartSheetDocumentConceptMappingInput = {
  sheetId: string;
  documentId: string;
  scope: "header" | "line_item";
  canonicalRole: string;
};

function readColumnCanonicalRole(column: any): {
  role: string | null;
  source: "semantic_metadata" | "system_identity" | null;
} {
  const businessMapping =
    column?.business_mapping && typeof column.business_mapping === "object"
      ? column.business_mapping
      : null;

  const explicitCanonical = normalizeAIText(
    businessMapping?.canonical_role,
    120,
  );

  if (explicitCanonical) {
    return {
      role: canonicalizeSmartSheetSemanticRole(explicitCanonical),
      source: "semantic_metadata",
    };
  }

  const semanticRole = normalizeAIText(column?.semantic_role, 120);
  if (semanticRole) {
    return {
      role: resolveSmartSheetSemanticRole(semanticRole).canonicalRole,
      source: "semantic_metadata",
    };
  }

  // Conservative identities for generic/system spreadsheet columns. Business-
  // specific price logic remains unmapped unless the customer has supplied
  // semantic metadata explicitly.
  const systemIdentityRoles: Record<string, string> = {
    description: "product_name",
    quantity: "quantity",
    sku_snapshot: "sku",
    barcode_snapshot: "barcode",
    pack_size: "pack_size",
    notes: "notes",
  };

  const key = String(column?.column_key || "");
  const identityRole = systemIdentityRoles[key];

  return identityRole
    ? { role: identityRole, source: "system_identity" }
    : { role: null, source: null };
}

function readManualDocumentConcepts(column: any): string[] {
  const businessMapping =
    column?.business_mapping &&
    typeof column.business_mapping === "object" &&
    !Array.isArray(column.business_mapping)
      ? column.business_mapping as Record<string, unknown>
      : null;

  const rawConcepts = Array.isArray(businessMapping?.document_concepts)
    ? businessMapping?.document_concepts
    : [];

  return Array.from(
    new Set(
      rawConcepts
        .map((value) =>
          typeof value === "string"
            ? canonicalizeSmartSheetSemanticRole(value)
            : "",
        )
        .filter(Boolean),
    ),
  );
}

function mappingPreviewValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 500);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).slice(0, 500);
  }
  try {
    return JSON.stringify(value).slice(0, 500);
  } catch {
    return null;
  }
}

export async function prepareSmartSheetDocumentMappingPreview(
  input: SmartSheetDocumentMappingPreviewInput,
): Promise<SmartSheetDocumentMappingPreviewResult> {
  try {
    const {
      supabase,
      organizationId,
    } = await getAuthorizedContext(input.sheetId);

    const { data: document, error: documentError } = await (supabase as any)
      .from("smart_sheet_documents")
      .select("id,smart_sheet_id,organization_id,processing_status,metadata")
      .eq("id", input.documentId)
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (documentError || !document) {
      throw new Error(documentError?.message || "Document not found.");
    }

    const { data: extraction, error: extractionError } = await (supabase as any)
      .from("smart_sheet_document_extractions")
      .select("id,status")
      .eq("document_id", document.id)
      .eq("organization_id", organizationId)
      .eq("is_current", true)
      .maybeSingle();

    if (extractionError || !extraction) {
      throw new Error(extractionError?.message || "Current document extraction not found.");
    }

    if (extraction.status !== "completed") {
      throw new Error("Document analysis must be completed before mapping preview.");
    }

    const [fieldsResult, linesResult, columnsResult] = await Promise.all([
      (supabase as any)
        .from("smart_sheet_document_fields")
        .select("field_scope,line_item_index,canonical_role,raw_value,normalized_value,review_status")
        .eq("extraction_id", extraction.id)
        .eq("organization_id", organizationId),
      (supabase as any)
        .from("smart_sheet_document_line_items")
        .select("line_index,review_status")
        .eq("extraction_id", extraction.id)
        .eq("organization_id", organizationId),
      (supabase as any)
        .from("smart_sheet_columns")
        .select("id,column_key,label,position,hidden,semantic_role,business_mapping,is_system")
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId)
        .order("position", { ascending: true }),
    ]);

    if (fieldsResult.error) throw new Error(fieldsResult.error.message);
    if (linesResult.error) throw new Error(linesResult.error.message);
    if (columnsResult.error) throw new Error(columnsResult.error.message);

    const approvedLines = new Set<number>(
      (linesResult.data ?? [])
        .filter((line: any) => line.review_status === "approved")
        .map((line: any) => Number(line.line_index)),
    );

    const targetColumnsByRole = new Map<
      string,
      Array<{
        id: string;
        columnKey: string;
        label: string;
        source: "semantic_metadata" | "system_identity" | "document_manual";
      }>
    >();

    const mappingColumns: SmartSheetDocumentMappingColumn[] =
      (columnsResult.data ?? []).map((column: any) => ({
        id: String(column.id),
        columnKey: String(column.column_key),
        label: String(column.label || column.column_key),
        position: Number(column.position ?? 0),
        hidden: Boolean(column.hidden),
        isSystem: Boolean(column.is_system),
      }));

    for (const column of columnsResult.data ?? []) {
      const manualConcepts = readManualDocumentConcepts(column);

      for (const manualRole of manualConcepts) {
        const manualList = targetColumnsByRole.get(manualRole) ?? [];
        manualList.push({
          id: String(column.id),
          columnKey: String(column.column_key),
          label: String(column.label || column.column_key),
          source: "document_manual",
        });
        targetColumnsByRole.set(manualRole, manualList);
      }

      const resolved = readColumnCanonicalRole(column);
      if (!resolved.role || !resolved.source) continue;

      // A manual document mapping for this same role is more specific than the
      // column's generic semantic/system identity. Avoid counting the same
      // column twice and falsely reporting an ambiguous match.
      if (manualConcepts.includes(resolved.role)) continue;

      const list = targetColumnsByRole.get(resolved.role) ?? [];
      list.push({
        id: String(column.id),
        columnKey: String(column.column_key),
        label: String(column.label || column.column_key),
        source: resolved.source,
      });
      targetColumnsByRole.set(resolved.role, list);
    }

    const grouped = new Map<
      string,
      {
        scope: "header" | "line_item";
        canonicalRole: string;
        approvedValueCount: number;
        sampleValue: string | null;
      }
    >();

    for (const field of fieldsResult.data ?? []) {
      if (field.review_status !== "approved") continue;

      const role = normalizeAIText(field.canonical_role, 120);
      if (!role) continue;

      const scope = field.field_scope === "line_item" ? "line_item" : "header";
      if (
        scope === "line_item" &&
        (!Number.isInteger(field.line_item_index) ||
          !approvedLines.has(Number(field.line_item_index)))
      ) {
        continue;
      }

      const canonicalRole = canonicalizeSmartSheetSemanticRole(role);
      if (!canonicalRole) continue;

      const key = `${scope}:${canonicalRole}`;
      const existing = grouped.get(key);
      const value = mappingPreviewValue(
        field.normalized_value ?? field.raw_value,
      );

      if (existing) {
        existing.approvedValueCount += 1;
        if (!existing.sampleValue && value) existing.sampleValue = value;
      } else {
        grouped.set(key, {
          scope,
          canonicalRole,
          approvedValueCount: 1,
          sampleValue: value,
        });
      }
    }

    const rows: SmartSheetDocumentMappingPreviewRow[] = Array.from(
      grouped.values(),
    )
      .map((group) => {
        const targets = targetColumnsByRole.get(group.canonicalRole) ?? [];
        const target = targets.length === 1 ? targets[0] : null;
        return {
          ...group,
          targetColumnId: target?.id ?? null,
          targetColumnKey: target?.columnKey ?? null,
          targetColumnLabel: target?.label ?? null,
          mappingStatus:
            targets.length === 1
              ? "matched"
              : targets.length > 1
                ? "ambiguous"
                : "needs_mapping",
          mappingSource: target?.source ?? null,
        } satisfies SmartSheetDocumentMappingPreviewRow;
      })
      .sort((a, b) => {
        if (a.scope !== b.scope) return a.scope === "header" ? -1 : 1;
        if (a.mappingStatus !== b.mappingStatus) return a.mappingStatus === "matched" ? -1 : 1;
        return a.canonicalRole.localeCompare(b.canonicalRole);
      });

    const matchedRoleCount = rows.filter((row) => row.mappingStatus === "matched").length;
    const needsMappingRoleCount = rows.filter((row) => row.mappingStatus === "needs_mapping").length;
    const ambiguousRoleCount = rows.filter((row) => row.mappingStatus === "ambiguous").length;

    return {
      ok: true,
      message: `Mapping preview prepared: ${matchedRoleCount} matched concept${matchedRoleCount === 1 ? "" : "s"}, ${needsMappingRoleCount} need${needsMappingRoleCount === 1 ? "s" : ""} mapping, ${ambiguousRoleCount} ambiguous. Nothing was written to the Smart Sheet.`,
      rows,
      columns: mappingColumns,
      matchedRoleCount,
      needsMappingRoleCount,
      ambiguousRoleCount,
      approvedLineCount: approvedLines.size,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to prepare Smart Sheet mapping preview.",
    };
  }
}


/* =========================================================
   V4.11e2 — MANUAL DOCUMENT CONCEPT MAPPING
   =========================================================

   Persists a document concept -> existing Smart Sheet column relationship in
   column business_mapping metadata. This does not alter cell values, formulas,
   calculations, column presentation, or the document extraction itself.
   ========================================================= */

export async function setSmartSheetDocumentConceptMapping(
  input: SetSmartSheetDocumentConceptMappingInput,
): Promise<ActionResult> {
  try {
    const { supabase, user, organizationId } =
      await getAuthorizedContext(input.sheetId);

    const canonicalRole = canonicalizeSmartSheetSemanticRole(
      input.canonicalRole,
    );

    if (!canonicalRole) {
      throw new Error("Document concept is required.");
    }

    const scope =
      input.scope === "line_item" ? "line_item" : "header";

    const { data: document, error: documentError } = await (supabase as any)
      .from("smart_sheet_documents")
      .select("id")
      .eq("id", input.documentId)
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (documentError || !document) {
      throw new Error(documentError?.message || "Document not found.");
    }

    const { data: extraction, error: extractionError } = await (supabase as any)
      .from("smart_sheet_document_extractions")
      .select("id,status")
      .eq("document_id", document.id)
      .eq("organization_id", organizationId)
      .eq("is_current", true)
      .maybeSingle();

    if (extractionError || !extraction) {
      throw new Error(
        extractionError?.message || "Current document extraction not found.",
      );
    }

    if (extraction.status !== "completed") {
      throw new Error("Document analysis must be completed before mapping.");
    }

    const { data: approvedFields, error: approvedFieldsError } = await (supabase as any)
      .from("smart_sheet_document_fields")
      .select("field_scope,line_item_index,canonical_role")
      .eq("extraction_id", extraction.id)
      .eq("organization_id", organizationId)
      .eq("review_status", "approved");

    if (approvedFieldsError) {
      throw new Error(approvedFieldsError.message);
    }

    let approvedLineIndexes = new Set<number>();
    if (scope === "line_item") {
      const { data: approvedLines, error: approvedLinesError } = await (supabase as any)
        .from("smart_sheet_document_line_items")
        .select("line_index")
        .eq("extraction_id", extraction.id)
        .eq("organization_id", organizationId)
        .eq("review_status", "approved");

      if (approvedLinesError) {
        throw new Error(approvedLinesError.message);
      }

      approvedLineIndexes = new Set<number>(
        (approvedLines ?? []).map((line: any) => Number(line.line_index)),
      );
    }

    const conceptIsApproved = (approvedFields ?? []).some((field: any) => {
      const fieldScope =
        field.field_scope === "line_item" ? "line_item" : "header";
      if (fieldScope !== scope) return false;
      if (
        canonicalizeSmartSheetSemanticRole(String(field.canonical_role || "")) !==
        canonicalRole
      ) {
        return false;
      }
      return scope === "header" ||
        approvedLineIndexes.has(Number(field.line_item_index));
    });

    if (!conceptIsApproved) {
      throw new Error(
        "Only approved document concepts can be mapped to the Smart Sheet.",
      );
    }

    const { data: columns, error: columnsError } = await (supabase as any)
      .from("smart_sheet_columns")
      .select("id,column_key,label,business_mapping")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .order("position", { ascending: true });

    if (columnsError) {
      throw new Error(columnsError.message);
    }

    const target = (columns ?? []).find(
      (column: any) => String(column.id) === input.targetColumnId,
    );

    if (!target) {
      throw new Error("Target Smart Sheet column not found.");
    }

    const now = new Date().toISOString();

    // Keep one explicit destination per document concept. If this role was
    // manually mapped to another column earlier, remove only that document
    // mapping entry; preserve every other business/semantic metadata key.
    for (const column of columns ?? []) {
      const currentMapping =
        column.business_mapping &&
        typeof column.business_mapping === "object" &&
        !Array.isArray(column.business_mapping)
          ? { ...(column.business_mapping as Record<string, unknown>) }
          : {};

      const concepts = readManualDocumentConcepts(column);
      const shouldContain = String(column.id) === String(target.id);
      const nextConcepts = shouldContain
        ? Array.from(new Set([...concepts, canonicalRole]))
        : concepts.filter((role) => role !== canonicalRole);

      const changed =
        nextConcepts.length !== concepts.length ||
        nextConcepts.some((role, index) => role !== concepts[index]);

      if (!changed) continue;

      if (nextConcepts.length > 0) {
        currentMapping.document_concepts = nextConcepts;
        currentMapping.document_mapping_version = 1;
        currentMapping.document_mapping_source = "manual_review";
        currentMapping.document_mapping_updated_by = user.id;
        currentMapping.document_mapping_updated_at = now;
      } else {
        delete currentMapping.document_concepts;
        delete currentMapping.document_mapping_version;
        delete currentMapping.document_mapping_source;
        delete currentMapping.document_mapping_updated_by;
        delete currentMapping.document_mapping_updated_at;
      }

      const { error: updateError } = await (supabase as any)
        .from("smart_sheet_columns")
        .update({
          business_mapping:
            Object.keys(currentMapping).length > 0 ? currentMapping : null,
          updated_by: user.id,
          updated_at: now,
        })
        .eq("id", column.id)
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    revalidateSmartSheet(input.sheetId);

    return {
      ok: true,
      message: `${canonicalRole} mapped to ${String(target.label || target.column_key)} for this Smart Sheet. Future reviewed documents can reuse this relationship.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to save document concept mapping.",
    };
  }
}



/* =========================================================
   V4.11e3 — REMOVE MANUAL DOCUMENT CONCEPT MAPPING
   =========================================================

   Removes only the explicit document concept relationship stored in
   business_mapping.document_concepts. Existing semantic_role,
   canonical_role metadata, formulas, cells, calculations, and document
   extraction/review data remain untouched.
   ========================================================= */

export async function clearSmartSheetDocumentConceptMapping(
  input: ClearSmartSheetDocumentConceptMappingInput,
): Promise<ActionResult> {
  try {
    const { supabase, user, organizationId } =
      await getAuthorizedContext(input.sheetId);

    const canonicalRole = canonicalizeSmartSheetSemanticRole(
      input.canonicalRole,
    );

    if (!canonicalRole) {
      throw new Error("Document concept is required.");
    }

    const scope =
      input.scope === "line_item" ? "line_item" : "header";

    const { data: document, error: documentError } = await (supabase as any)
      .from("smart_sheet_documents")
      .select("id")
      .eq("id", input.documentId)
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (documentError || !document) {
      throw new Error(documentError?.message || "Document not found.");
    }

    const { data: extraction, error: extractionError } = await (supabase as any)
      .from("smart_sheet_document_extractions")
      .select("id,status")
      .eq("document_id", document.id)
      .eq("organization_id", organizationId)
      .eq("is_current", true)
      .maybeSingle();

    if (extractionError || !extraction) {
      throw new Error(
        extractionError?.message || "Current document extraction not found.",
      );
    }

    if (extraction.status !== "completed") {
      throw new Error("Document analysis must be completed before mapping.");
    }

    const { data: approvedFields, error: approvedFieldsError } = await (supabase as any)
      .from("smart_sheet_document_fields")
      .select("field_scope,line_item_index,canonical_role")
      .eq("extraction_id", extraction.id)
      .eq("organization_id", organizationId)
      .eq("review_status", "approved");

    if (approvedFieldsError) {
      throw new Error(approvedFieldsError.message);
    }

    let approvedLineIndexes = new Set<number>();
    if (scope === "line_item") {
      const { data: approvedLines, error: approvedLinesError } = await (supabase as any)
        .from("smart_sheet_document_line_items")
        .select("line_index")
        .eq("extraction_id", extraction.id)
        .eq("organization_id", organizationId)
        .eq("review_status", "approved");

      if (approvedLinesError) {
        throw new Error(approvedLinesError.message);
      }

      approvedLineIndexes = new Set<number>(
        (approvedLines ?? []).map((line: any) => Number(line.line_index)),
      );
    }

    const conceptIsApproved = (approvedFields ?? []).some((field: any) => {
      const fieldScope =
        field.field_scope === "line_item" ? "line_item" : "header";
      if (fieldScope !== scope) return false;
      if (
        canonicalizeSmartSheetSemanticRole(String(field.canonical_role || "")) !==
        canonicalRole
      ) {
        return false;
      }
      return scope === "header" ||
        approvedLineIndexes.has(Number(field.line_item_index));
    });

    if (!conceptIsApproved) {
      throw new Error(
        "Only approved document concepts can be managed for this Smart Sheet.",
      );
    }

    const { data: columns, error: columnsError } = await (supabase as any)
      .from("smart_sheet_columns")
      .select("id,column_key,label,business_mapping")
      .eq("smart_sheet_id", input.sheetId)
      .eq("organization_id", organizationId)
      .order("position", { ascending: true });

    if (columnsError) {
      throw new Error(columnsError.message);
    }

    const now = new Date().toISOString();
    let removedFromLabel: string | null = null;

    for (const column of columns ?? []) {
      const concepts = readManualDocumentConcepts(column);
      if (!concepts.includes(canonicalRole)) continue;

      const currentMapping =
        column.business_mapping &&
        typeof column.business_mapping === "object" &&
        !Array.isArray(column.business_mapping)
          ? { ...(column.business_mapping as Record<string, unknown>) }
          : {};

      const nextConcepts = concepts.filter((role) => role !== canonicalRole);

      if (!removedFromLabel) {
        removedFromLabel = String(column.label || column.column_key);
      }

      if (nextConcepts.length > 0) {
        currentMapping.document_concepts = nextConcepts;
        currentMapping.document_mapping_version = 1;
        currentMapping.document_mapping_source = "manual_review";
        currentMapping.document_mapping_updated_by = user.id;
        currentMapping.document_mapping_updated_at = now;
      } else {
        delete currentMapping.document_concepts;
        delete currentMapping.document_mapping_version;
        delete currentMapping.document_mapping_source;
        delete currentMapping.document_mapping_updated_by;
        delete currentMapping.document_mapping_updated_at;
      }

      const { error: updateError } = await (supabase as any)
        .from("smart_sheet_columns")
        .update({
          business_mapping:
            Object.keys(currentMapping).length > 0 ? currentMapping : null,
          updated_by: user.id,
          updated_at: now,
        })
        .eq("id", column.id)
        .eq("smart_sheet_id", input.sheetId)
        .eq("organization_id", organizationId);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    if (!removedFromLabel) {
      throw new Error(
        `${canonicalRole} does not currently have a manual document mapping.`,
      );
    }

    revalidateSmartSheet(input.sheetId);

    return {
      ok: true,
      message: `${canonicalRole} manual mapping to ${removedFromLabel} was removed. No Smart Sheet cells were changed.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to remove document concept mapping.",
    };
  }
}


/* =========================================================
   SECURE CALCULATION HELPERS
   ========================================================= */

async function recalculateRow(
  supabase: SupabaseServerClient,
  rowId: string,
) {
  const {
    error,
  } =
    await supabase.rpc(
      "recalculate_smart_sheet_row_secure",
      {
        requested_row_id:
          rowId,
      },
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }
}


async function recalculateSheet(
  supabase: SupabaseServerClient,
  sheetId: string,
) {
  const {
    error,
  } =
    await supabase.rpc(
      "recalculate_smart_sheet_secure",
      {
        requested_sheet_id:
          sheetId,
      },
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }
}


/* =========================================================
   CACHE REVALIDATION
   ========================================================= */

function revalidateSmartSheet(
  sheetId: string,
) {
  revalidatePath(
    `/app/smart-sheets/${sheetId}`,
  );
} 