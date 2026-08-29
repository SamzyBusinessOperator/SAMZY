"use client";

import SmartSheetCell from "./SmartSheetCell";

import type {
  SmartSheetCellState,
  SmartSheetDriver,
} from "./smart-sheet-types";

type Props = {
  sheetId: string;
  rowId: string;

  priceColumn: string;
  markupColumn: string;

  price: number | null;
  markup: number | null;

  driver: SmartSheetDriver;

  priceState?: SmartSheetCellState;
  markupState?: SmartSheetCellState;
};

export default function PriceMarkupCell({
  sheetId,
  rowId,
  priceColumn,
  markupColumn,
  price,
  markup,
  driver,
  priceState,
  markupState,
}: Props) {
  const priceIsDriver =
    driver === "price";

  const markupIsDriver =
    driver === "markup";

  return (
    <div
      style={{
        minWidth: "130px",
        display: "grid",
        gap: "8px",
      }}
    >
      {/* PRICE */}

      <div>
        <div
          style={{
            marginBottom: "3px",
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "#9ca3af",
          }}
        >
          PRICE
        </div>

        <SmartSheetCell
          sheetId={sheetId}
          rowId={rowId}
          columnKey={priceColumn}
          value={price}
          state={priceState}
          type="money"
          allowSame={priceIsDriver}
        />
      </div>

      {/* MARKUP */}

      <div
        style={{
          borderTop: "1px solid #f0f0f0",
          paddingTop: "7px",
        }}
      >
        <div
          style={{
            marginBottom: "3px",
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "#9ca3af",
          }}
        >
          MARKUP
        </div>

        <SmartSheetCell
          sheetId={sheetId}
          rowId={rowId}
          columnKey={markupColumn}
          value={markup}
          state={markupState}
          type="percent"
          allowSame={markupIsDriver}
        />
      </div>
    </div>
  );
}