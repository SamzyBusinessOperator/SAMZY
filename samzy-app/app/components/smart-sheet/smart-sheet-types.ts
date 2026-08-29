export type SmartSheetCellMode =
  | "ocr"
  | "calculated"
  | "manual"
  | "same";

export type SmartSheetDriver =
  | "price"
  | "markup";

export type SmartSheetCellState = {
  id: string;
  row_id: string;
  column_key: string;
  mode: SmartSheetCellMode;
  source: string | null;
  ocr_confidence: number | null;
  previous_value: number | null;
  formula_value: number | null;
  manual_value: number | null;
  effective_value: number | null;
  is_review_required: boolean;
};

export type SmartSheetRow = {
  id: string;
  organization_id: string;
  smart_sheet_id: string;

  row_number: number;

  product_id: string | null;

  match_status:
    | "matched"
    | "unmatched"
    | "review";

  match_confidence: number | null;

  description: string;
  sku_snapshot: string | null;
  barcode_snapshot: string | null;
  pack_size: string | null;

  quantity: number;

  supplier_cost_ex_vat: number;
  item_cost: number;
  transported_cost: number;

  vat_rate: number;
  transport_rate: number;

  shop_sem_price: number | null;
  c_ivacp_price: number | null;
  shop_com_price: number | null;
  special_price: number | null;
  big_wholesale_price: number | null;
  rest_com_price: number | null;
  public_price: number | null;

  shop_sem_markup: number | null;
  shop_com_markup: number | null;
  special_markup: number | null;
  rest_com_markup: number | null;
  big_wholesale_markup: number | null;

  shop_sem_driver: SmartSheetDriver;
  shop_com_driver: SmartSheetDriver;
  special_driver: SmartSheetDriver;
  rest_com_driver: SmartSheetDriver;
  big_wholesale_driver: SmartSheetDriver;

  line_subtotal: number;
  line_vat: number;
  line_total: number;

  notes: string | null;

  created_at: string;
  updated_at: string;
};

export type SmartSheet = {
  id: string;
  organization_id: string;
  sheet_type:
    | "supplier_invoice"
    | "sales_receipt";

  supplier_id: string | null;
  purchase_id: string | null;

  title: string;
  document_reference: string | null;
  document_date: string | null;

  currency: string;

  status:
    | "processing"
    | "draft"
    | "confirmed"
    | "cancelled";

  ocr_status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "manual";

  ocr_confidence: number | null;

  source_file_url: string | null;

  transport_rate: number;

  subtotal: number;
  vat_total: number;
  total: number;

  revision_number: number;

  confirmed_at: string | null;
  confirmed_by: string | null;

  created_at: string;
  updated_at: string;
  last_edited_at: string;
};

export type CellStateMap = Record<
  string,
  SmartSheetCellState
>;

export function cellStateKey(
  rowId: string,
  columnKey: string,
) {
  return `${rowId}:${columnKey}`;
}

export function truncateTwo(
  value: unknown,
): string {
  const number =
    Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return "0.00";
  }

  const truncated =
    Math.trunc(
      number * 100,
    ) / 100;

  return truncated.toFixed(2);
}