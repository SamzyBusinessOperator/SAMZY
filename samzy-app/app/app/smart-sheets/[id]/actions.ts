"use server";

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

type BatchPasteCellInput = {
  rowId: string;
  columnKey: string;
  value: CellValue;
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

    const columnKey =
      input.columnKey;

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

    const affectedRowIds =
      new Set<string>();

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