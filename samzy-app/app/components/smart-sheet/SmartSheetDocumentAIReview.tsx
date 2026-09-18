"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  analyzeSmartSheetDocument,
  bulkApproveHighConfidenceDocumentReview,
  checkSmartSheetDocumentAnalysis,
  clearSmartSheetDocumentConceptMapping,
  prepareSmartSheetDocumentMappingPreview,
  setSmartSheetDocumentConceptMapping,
  setSmartSheetDocumentLineItemReview,
  updateSmartSheetDocumentFieldReview,
} from "@/app/app/smart-sheets/[id]/actions";

type DocumentRecord = {
  id: string;
  original_filename: string;
  mime_type: string;
  document_type: string;
  detected_language: string | null;
  detected_currency: string | null;
  processing_status: string;
  created_at: string;
} | null;

type ExtractionRecord = {
  id: string;
  extraction_version: number;
  status: string;
  provider: string | null;
  model: string | null;
  detected_language: string | null;
  detected_document_type: string | null;
  confidence: number | string | null;
  normalized_payload: Record<string, unknown> | null;
  created_at: string;
} | null;

type FieldRecord = {
  id: string;
  field_scope: string;
  line_item_index: number | null;
  canonical_role: string | null;
  original_label: string | null;
  raw_value: string | null;
  normalized_value: unknown;
  language: string | null;
  confidence: number | string | null;
  review_status: string;
};

type LineItemRecord = {
  id: string;
  line_index: number;
  raw_payload: Record<string, unknown> | null;
  normalized_payload: Record<string, unknown> | null;
  confidence: number | string | null;
  review_status: string;
};

type MappingPreviewRow = {
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

type MappingPreviewColumn = {
  id: string;
  columnKey: string;
  label: string;
  position: number;
  hidden: boolean;
  isSystem: boolean;
};

type Props = {
  sheetId: string;
  document: DocumentRecord;
  extraction: ExtractionRecord;
  fields: FieldRecord[];
  lineItems: LineItemRecord[];
};

export default function SmartSheetDocumentAIReview({
  sheetId,
  document,
  extraction,
  fields,
  lineItems,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPolling, setIsPolling] = useState(
    document?.processing_status === "processing",
  );
  const [isBulkPending, startBulkTransition] = useTransition();
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState(false);
  const [isMappingPending, startMappingTransition] = useTransition();
  const [mappingRows, setMappingRows] = useState<MappingPreviewRow[] | null>(null);
  const [mappingMessage, setMappingMessage] = useState<string | null>(null);
  const [mappingError, setMappingError] = useState(false);
  const [mappingColumns, setMappingColumns] = useState<MappingPreviewColumn[]>([]);
  const [mappingSelections, setMappingSelections] = useState<Record<string, string>>({});
  const [isManualMappingPending, startManualMappingTransition] = useTransition();
  const [manualMappingKey, setManualMappingKey] = useState<string | null>(null);

  const hasCompletedReview = extraction?.status === "completed";

  function analyzeDocument() {
    if (!document || isPending || isPolling) return;

    setMessage(null);
    setIsError(false);

    startTransition(async () => {
      const result = await analyzeSmartSheetDocument({
        sheetId,
        documentId: document.id,
      });

      setIsError(!result.ok);
      setMessage(
        result.message ??
          (result.ok
            ? "Document analyzed."
            : "Document analysis failed."),
      );

      if (result.ok) {
        setIsPolling(Boolean(result.processing));
        if (!result.processing) {
          router.refresh();
          setIsOpen(true);
        }
      }
    });
  }

  useEffect(() => {
    if (!isPolling || !document) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const checkStatus = async () => {
      const result = await checkSmartSheetDocumentAnalysis({
        sheetId,
        documentId: document.id,
      });

      if (cancelled) return;

      if (result.status === "completed" && result.ok) {
        setIsPolling(false);
        setIsError(false);
        setMessage(result.message ?? "Document analysis is ready for review.");
        router.refresh();
        setIsOpen(true);
        return;
      }

      if (result.status === "failed" || !result.ok) {
        setIsPolling(false);
        setIsError(true);
        setMessage(result.message ?? "Document analysis failed.");
        return;
      }

      setIsError(false);
      setMessage(result.message ?? "SAMZY is still analyzing the document.");
      timeoutId = setTimeout(checkStatus, 3500);
    };

    timeoutId = setTimeout(checkStatus, 1200);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPolling, document, sheetId, router]);

  function bulkApproveHighConfidence() {
    if (!document || !extraction || isBulkPending) return;

    setBulkMessage(null);
    setBulkError(false);

    startBulkTransition(async () => {
      const result = await bulkApproveHighConfidenceDocumentReview({
        sheetId,
        documentId: document.id,
        minimumConfidence: 0.95,
      });

      setBulkError(!result.ok);
      setBulkMessage(
        result.message ??
          (result.ok
            ? "High-confidence review completed."
            : "Unable to bulk-review document."),
      );

      if (result.ok) router.refresh();
    });
  }

  function prepareMappingPreview() {
    if (!document || !extraction || isMappingPending) return;

    setMappingMessage(null);
    setMappingError(false);

    startMappingTransition(async () => {
      const result = await prepareSmartSheetDocumentMappingPreview({
        sheetId,
        documentId: document.id,
      });

      setMappingError(!result.ok);
      setMappingMessage(
        result.message ??
          (result.ok
            ? "Mapping preview prepared."
            : "Unable to prepare mapping preview."),
      );

      if (result.ok) {
        const nextRows = (result.rows ?? []) as MappingPreviewRow[];
        const nextColumns = (result.columns ?? []) as MappingPreviewColumn[];
        setMappingRows(nextRows);
        setMappingColumns(nextColumns);
        setMappingSelections((current) => {
          const next = { ...current };
          for (const row of nextRows) {
            const key = `${row.scope}:${row.canonicalRole}`;
            if (row.targetColumnId) {
              next[key] = row.targetColumnId;
            } else {
              delete next[key];
            }
          }
          return next;
        });
      }
    });
  }

  function saveManualMapping(row: MappingPreviewRow) {
    if (!document || !extraction || isManualMappingPending) return;

    const key = `${row.scope}:${row.canonicalRole}`;
    const targetColumnId = mappingSelections[key];
    if (!targetColumnId) {
      setMappingError(true);
      setMappingMessage(`Choose a Smart Sheet column for ${row.canonicalRole}.`);
      return;
    }

    setMappingMessage(null);
    setMappingError(false);
    setManualMappingKey(key);

    startManualMappingTransition(async () => {
      const result = await setSmartSheetDocumentConceptMapping({
        sheetId,
        documentId: document.id,
        scope: row.scope,
        canonicalRole: row.canonicalRole,
        targetColumnId,
      });

      if (!result.ok) {
        setMappingError(true);
        setMappingMessage(result.message ?? "Unable to save mapping.");
        setManualMappingKey(null);
        return;
      }

      const refreshed = await prepareSmartSheetDocumentMappingPreview({
        sheetId,
        documentId: document.id,
      });

      setMappingError(!refreshed.ok);
      setMappingMessage(
        refreshed.ok
          ? result.message ?? "Mapping saved."
          : refreshed.message ?? "Mapping saved, but preview could not refresh.",
      );

      if (refreshed.ok) {
        const nextRows = (refreshed.rows ?? []) as MappingPreviewRow[];
        const nextColumns = (refreshed.columns ?? []) as MappingPreviewColumn[];
        setMappingRows(nextRows);
        setMappingColumns(nextColumns);
        setMappingSelections((current) => {
          const next = { ...current };
          for (const nextRow of nextRows) {
            const nextKey = `${nextRow.scope}:${nextRow.canonicalRole}`;
            if (nextRow.targetColumnId) {
              next[nextKey] = nextRow.targetColumnId;
            } else {
              delete next[nextKey];
            }
          }
          return next;
        });
      }

      setManualMappingKey(null);
    });
  }


  function removeManualMapping(row: MappingPreviewRow) {
    if (!document || !extraction || isManualMappingPending) return;

    const key = `${row.scope}:${row.canonicalRole}`;

    setMappingMessage(null);
    setMappingError(false);
    setManualMappingKey(key);

    startManualMappingTransition(async () => {
      const result = await clearSmartSheetDocumentConceptMapping({
        sheetId,
        documentId: document.id,
        scope: row.scope,
        canonicalRole: row.canonicalRole,
      });

      if (!result.ok) {
        setMappingError(true);
        setMappingMessage(result.message ?? "Unable to remove mapping.");
        setManualMappingKey(null);
        return;
      }

      const refreshed = await prepareSmartSheetDocumentMappingPreview({
        sheetId,
        documentId: document.id,
      });

      setMappingError(!refreshed.ok);
      setMappingMessage(
        refreshed.ok
          ? result.message ?? "Mapping removed."
          : refreshed.message ?? "Mapping removed, but preview could not refresh.",
      );

      if (refreshed.ok) {
        const nextRows = (refreshed.rows ?? []) as MappingPreviewRow[];
        const nextColumns = (refreshed.columns ?? []) as MappingPreviewColumn[];
        setMappingRows(nextRows);
        setMappingColumns(nextColumns);
        setMappingSelections((current) => {
          const next = { ...current };

          for (const nextRow of nextRows) {
            const nextKey = `${nextRow.scope}:${nextRow.canonicalRole}`;
            if (nextRow.targetColumnId) {
              next[nextKey] = nextRow.targetColumnId;
            } else {
              delete next[nextKey];
            }
          }

          return next;
        });
      }

      setManualMappingKey(null);
    });
  }

  function handlePrimaryClick() {
    if (!document) return;

    if (hasCompletedReview) {
      setIsOpen(true);
      return;
    }

    analyzeDocument();
  }

  const headerFields = fields.filter(
    (field) => field.field_scope === "header",
  );
  const reviewedFieldCount = fields.filter(
    (field) => field.review_status !== "unreviewed",
  ).length;
  const approvedLineCount = lineItems.filter(
    (lineItem) => lineItem.review_status === "approved",
  ).length;
  const rejectedLineCount = lineItems.filter(
    (lineItem) => lineItem.review_status === "rejected",
  ).length;
  const reviewedLineCount = approvedLineCount + rejectedLineCount;
  const reviewState =
    fields.length > 0 &&
    reviewedFieldCount === fields.length &&
    reviewedLineCount === lineItems.length
      ? "review_complete"
      : reviewedFieldCount > 0 || reviewedLineCount > 0
        ? "in_review"
        : "review_required";

  return (
    <>
      <div
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={handlePrimaryClick}
          disabled={!document || isPending || isPolling}
          title={
            !document
              ? "Upload a document first"
              : hasCompletedReview
                ? "Review SAMZY's AI interpretation"
                : "Analyze the latest preserved document with AI"
          }
          style={{
            height: "38px",
            padding: "0 14px",
            borderRadius: "8px",
            border: "1px solid #d0d5dd",
            background: hasCompletedReview ? "#f4f3ff" : "#ffffff",
            color: !document || isPending || isPolling ? "#98a2b3" : "#6941c6",
            fontSize: "12px",
            fontWeight: 700,
            cursor: !document || isPending || isPolling ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {isPending
            ? "Analyzing…"
            : hasCompletedReview
              ? "AI Review"
              : "Analyze document"}
        </button>

        {message ? (
          <div
            role={isError ? "alert" : "status"}
            style={{
              position: "absolute",
              top: "44px",
              right: 0,
              zIndex: 90,
              width: "360px",
              padding: "10px 12px",
              border: `1px solid ${isError ? "#fecdca" : "#bdb4fe"}`,
              borderRadius: "8px",
              background: isError ? "#fef3f2" : "#f4f3ff",
              color: isError ? "#b42318" : "#5925dc",
              boxShadow: "0 8px 24px rgba(16, 24, 40, 0.12)",
              fontSize: "12px",
              lineHeight: 1.4,
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        ) : null}
      </div>

      {isOpen && document ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="SAMZY AI document review"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            justifyContent: "flex-end",
            background: "rgba(16, 24, 40, 0.32)",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <aside
            style={{
              width: "min(720px, 92vw)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              background: "#ffffff",
              boxShadow: "-12px 0 32px rgba(16, 24, 40, 0.16)",
            }}
          >
            <div
              style={{
                padding: "18px 20px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
                borderBottom: "1px solid #e4e7ec",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 750,
                    color: "#101828",
                  }}
                >
                  AI Document Review
                </div>
                <div
                  style={{
                    marginTop: "4px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "12px",
                    color: "#667085",
                  }}
                >
                  {document.original_filename}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  width: "32px",
                  height: "32px",
                  border: "1px solid #e4e7ec",
                  borderRadius: "7px",
                  background: "#ffffff",
                  color: "#475467",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                flex: "1 1 auto",
                overflowY: "auto",
                padding: "18px 20px 28px",
              }}
            >
              {!extraction ? (
                <EmptyReview onAnalyze={analyzeDocument} pending={isPending} />
              ) : (
                <>
                  <ReviewSummary
                    document={document}
                    extraction={extraction}
                    lineItemCount={lineItems.length}
                    reviewedFieldCount={reviewedFieldCount}
                    fieldCount={fields.length}
                    approvedLineCount={approvedLineCount}
                    rejectedLineCount={rejectedLineCount}
                    reviewState={reviewState}
                    isBulkPending={isBulkPending}
                    bulkMessage={bulkMessage}
                    bulkError={bulkError}
                    onBulkApprove={bulkApproveHighConfidence}
                    isMappingPending={isMappingPending}
                    mappingRows={mappingRows}
                    mappingMessage={mappingMessage}
                    mappingError={mappingError}
                    mappingColumns={mappingColumns}
                    mappingSelections={mappingSelections}
                    isManualMappingPending={isManualMappingPending}
                    manualMappingKey={manualMappingKey}
                    onMappingSelectionChange={(key, columnId) =>
                      setMappingSelections((current) => ({
                        ...current,
                        [key]: columnId,
                      }))
                    }
                    onSaveManualMapping={saveManualMapping}
                    onRemoveManualMapping={removeManualMapping}
                    onPrepareMapping={prepareMappingPreview}
                  />

                  <SectionTitle>Document fields</SectionTitle>
                  {headerFields.length > 0 ? (
                    <div
                      style={{
                        border: "1px solid #e4e7ec",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      {headerFields.map((field, index) => (
                        <FieldRow
                          key={field.id}
                          sheetId={sheetId}
                          field={field}
                          showBorder={index > 0}
                        />
                      ))}
                    </div>
                  ) : (
                    <MutedBox>No header fields were extracted.</MutedBox>
                  )}

                  <SectionTitle>Line items</SectionTitle>
                  {lineItems.length > 0 ? (
                    <div style={{ display: "grid", gap: "10px" }}>
                      {lineItems.map((lineItem) => (
                        <LineItemCard
                          key={lineItem.id}
                          sheetId={sheetId}
                          lineItem={lineItem}
                          fields={fields.filter(
                            (field) =>
                              field.field_scope === "line_item" &&
                              field.line_item_index === lineItem.line_index,
                          )}
                        />
                      ))}
                    </div>
                  ) : (
                    <MutedBox>No line items were extracted.</MutedBox>
                  )}
                </>
              )}
            </div>

            <div
              style={{
                flex: "0 0 auto",
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                borderTop: "1px solid #e4e7ec",
                background: "#f9fafb",
              }}
            >
              <span style={{ fontSize: "11px", color: "#667085" }}>
                Review only — nothing here has been written to the Smart Sheet.
              </span>

              <button
                type="button"
                onClick={analyzeDocument}
                disabled={isPending}
                style={{
                  height: "34px",
                  padding: "0 12px",
                  border: "1px solid #d0d5dd",
                  borderRadius: "7px",
                  background: "#ffffff",
                  color: isPending ? "#98a2b3" : "#344054",
                  fontSize: "11px",
                  fontWeight: 650,
                  cursor: isPending ? "wait" : "pointer",
                }}
              >
                {isPending || isPolling ? "Analyzing…" : "Analyze again"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function EmptyReview({
  onAnalyze,
  pending,
}: {
  onAnalyze: () => void;
  pending: boolean;
}) {
  return (
    <div
      style={{
        padding: "28px",
        border: "1px dashed #d0d5dd",
        borderRadius: "10px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 700, color: "#101828" }}>
        This preserved document has not been analyzed yet.
      </div>
      <div style={{ marginTop: "6px", fontSize: "12px", color: "#667085" }}>
        SAMZY will interpret the document for review without changing the spreadsheet.
      </div>
      <button
        type="button"
        onClick={onAnalyze}
        disabled={pending}
        style={{
          marginTop: "16px",
          height: "36px",
          padding: "0 14px",
          border: "1px solid #6941c6",
          borderRadius: "7px",
          background: "#6941c6",
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: 700,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {pending ? "Analyzing…" : "Analyze with AI"}
      </button>
    </div>
  );
}

function ReviewSummary({
  document,
  extraction,
  lineItemCount,
  reviewedFieldCount,
  fieldCount,
  approvedLineCount,
  rejectedLineCount,
  reviewState,
  isBulkPending,
  bulkMessage,
  bulkError,
  onBulkApprove,
  isMappingPending,
  mappingRows,
  mappingMessage,
  mappingError,
  mappingColumns,
  mappingSelections,
  isManualMappingPending,
  manualMappingKey,
  onMappingSelectionChange,
  onSaveManualMapping,
  onRemoveManualMapping,
  onPrepareMapping,
}: {
  document: NonNullable<DocumentRecord>;
  extraction: NonNullable<ExtractionRecord>;
  lineItemCount: number;
  reviewedFieldCount: number;
  fieldCount: number;
  approvedLineCount: number;
  rejectedLineCount: number;
  reviewState: "review_required" | "in_review" | "review_complete";
  isBulkPending: boolean;
  bulkMessage: string | null;
  bulkError: boolean;
  onBulkApprove: () => void;
  isMappingPending: boolean;
  mappingRows: MappingPreviewRow[] | null;
  mappingMessage: string | null;
  mappingError: boolean;
  mappingColumns: MappingPreviewColumn[];
  mappingSelections: Record<string, string>;
  isManualMappingPending: boolean;
  manualMappingKey: string | null;
  onMappingSelectionChange: (key: string, columnId: string) => void;
  onSaveManualMapping: (row: MappingPreviewRow) => void;
  onRemoveManualMapping: (row: MappingPreviewRow) => void;
  onPrepareMapping: () => void;
}) {
  const payload = extraction.normalized_payload ?? {};
  const summary =
    typeof payload.summary === "string" ? payload.summary : "No summary available.";

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "8px",
        }}
      >
        <Metric label="Type" value={humanize(document.document_type)} />
        <Metric label="Language" value={(document.detected_language || "—").toUpperCase()} />
        <Metric label="Currency" value={document.detected_currency || "—"} />
        <Metric label="Confidence" value={formatConfidence(extraction.confidence)} />
      </div>

      <div
        style={{
          marginTop: "12px",
          padding: "12px",
          border: "1px solid #e4e7ec",
          borderRadius: "8px",
          background: "#f9fafb",
          fontSize: "12px",
          lineHeight: 1.55,
          color: "#475467",
        }}
      >
        {summary}
        <div style={{ marginTop: "8px", fontSize: "11px", color: "#98a2b3" }}>
          {lineItemCount} line item{lineItemCount === 1 ? "" : "s"} · {extraction.model || "AI model"}
        </div>
        <div
          style={{
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: "1px solid #e4e7ec",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 14px",
            fontSize: "11px",
            color: "#667085",
          }}
        >
          <span>Fields reviewed: <strong style={{ color: "#344054" }}>{reviewedFieldCount}/{fieldCount}</strong></span>
          <span>Lines approved: <strong style={{ color: "#067647" }}>{approvedLineCount}</strong></span>
          <span>Lines rejected: <strong style={{ color: "#b42318" }}>{rejectedLineCount}</strong></span>
          <span>Review status: <strong style={{ color: reviewState === "review_complete" ? "#067647" : reviewState === "in_review" ? "#b54708" : "#475467" }}>{humanize(reviewState)}</strong></span>
        </div>

        <div
          style={{
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: "1px solid #e4e7ec",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#344054" }}>
              Confidence-assisted review
            </div>
            <div style={{ marginTop: "2px", fontSize: "10px", color: "#667085" }}>
              Approves only unreviewed, recognized, untouched items at 95%+ confidence. Ambiguous, low-confidence, edited, approved, and rejected items are left unchanged.
            </div>
            {bulkMessage ? (
              <div
                style={{
                  marginTop: "5px",
                  fontSize: "10px",
                  fontWeight: 650,
                  color: bulkError ? "#b42318" : "#067647",
                }}
              >
                {bulkMessage}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onBulkApprove}
            disabled={isBulkPending || reviewState === "review_complete"}
            style={{
              height: "32px",
              padding: "0 10px",
              border: "1px solid #abefc6",
              borderRadius: "6px",
              background: "#ecfdf3",
              color:
                isBulkPending || reviewState === "review_complete"
                  ? "#98a2b3"
                  : "#067647",
              fontSize: "10px",
              fontWeight: 750,
              cursor:
                isBulkPending || reviewState === "review_complete"
                  ? "not-allowed"
                  : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {isBulkPending ? "Reviewing…" : "Approve 95%+ confidence"}
          </button>
        </div>

        <div
          style={{
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: "1px solid #e4e7ec",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#344054" }}>
                Smart Sheet mapping preview
              </div>
              <div style={{ marginTop: "2px", fontSize: "10px", color: "#667085" }}>
                Compares approved document concepts with this sheet's semantic column metadata. Preview only — no cells are changed.
              </div>
              {mappingMessage ? (
                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "10px",
                    fontWeight: 650,
                    color: mappingError ? "#b42318" : "#475467",
                  }}
                >
                  {mappingMessage}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onPrepareMapping}
              disabled={isMappingPending || reviewedFieldCount === 0}
              style={{
                height: "32px",
                padding: "0 10px",
                border: "1px solid #bdb4fe",
                borderRadius: "6px",
                background: "#f4f3ff",
                color:
                  isMappingPending || reviewedFieldCount === 0
                    ? "#98a2b3"
                    : "#5925dc",
                fontSize: "10px",
                fontWeight: 750,
                cursor:
                  isMappingPending || reviewedFieldCount === 0
                    ? "not-allowed"
                    : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {isMappingPending ? "Preparing…" : "Prepare mapping preview"}
            </button>
          </div>

          {mappingRows ? (
            <MappingPreviewTable
              rows={mappingRows}
              columns={mappingColumns}
              selections={mappingSelections}
              pending={isManualMappingPending}
              pendingKey={manualMappingKey}
              onSelectionChange={onMappingSelectionChange}
              onSave={onSaveManualMapping}
              onRemove={onRemoveManualMapping}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

function MappingPreviewTable({
  rows,
  columns,
  selections,
  pending,
  pendingKey,
  onSelectionChange,
  onSave,
  onRemove,
}: {
  rows: MappingPreviewRow[];
  columns: MappingPreviewColumn[];
  selections: Record<string, string>;
  pending: boolean;
  pendingKey: string | null;
  onSelectionChange: (key: string, columnId: string) => void;
  onSave: (row: MappingPreviewRow) => void;
  onRemove: (row: MappingPreviewRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          marginTop: "8px",
          padding: "9px 10px",
          border: "1px dashed #d0d5dd",
          borderRadius: "6px",
          fontSize: "10px",
          color: "#667085",
        }}
      >
        No approved canonical concepts are ready for mapping preview yet.
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: "8px",
        border: "1px solid #e4e7ec",
        borderRadius: "7px",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "86px 140px minmax(0,1fr) 72px",
          gap: "8px",
          padding: "7px 9px",
          background: "#f9fafb",
          borderBottom: "1px solid #e4e7ec",
          fontSize: "9px",
          fontWeight: 750,
          color: "#667085",
          textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}
      >
        <span>Scope</span>
        <span>Concept</span>
        <span>Target column</span>
        <span>Values</span>
      </div>
      {rows.map((row, index) => (
        <div
          key={`${row.scope}:${row.canonicalRole}`}
          style={{
            display: "grid",
            gridTemplateColumns: "86px 140px minmax(0,1fr) 72px",
            gap: "8px",
            padding: "8px 9px",
            alignItems: "center",
            borderTop: index > 0 ? "1px solid #eef0f3" : "none",
            fontSize: "10px",
          }}
        >
          <span style={{ color: "#667085" }}>{humanize(row.scope)}</span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontWeight: 700,
                color: "#344054",
              }}
              title={row.canonicalRole}
            >
              {row.canonicalRole}
            </div>
            {row.sampleValue ? (
              <div
                style={{
                  marginTop: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "#98a2b3",
                }}
                title={row.sampleValue}
              >
                e.g. {row.sampleValue}
              </div>
            ) : null}
          </div>
          <div style={{ minWidth: 0 }}>
            {row.mappingStatus === "matched" &&
            row.mappingSource !== "document_manual" ? (
              <>
                <div
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 700,
                    color: "#067647",
                  }}
                  title={row.targetColumnLabel ?? row.targetColumnKey ?? ""}
                >
                  {row.targetColumnLabel ?? row.targetColumnKey}
                </div>
                <div style={{ marginTop: "2px", color: "#98a2b3" }}>
                  {row.mappingSource === "semantic_metadata"
                    ? "Semantic mapping"
                    : "System identity"}
                </div>
              </>
            ) : (
              <ManualMappingControl
                row={row}
                columns={columns}
                selectedColumnId={
                  selections[`${row.scope}:${row.canonicalRole}`] ?? ""
                }
                pending={
                  pending &&
                  pendingKey === `${row.scope}:${row.canonicalRole}`
                }
                disabled={pending}
                onSelectionChange={(columnId) =>
                  onSelectionChange(
                    `${row.scope}:${row.canonicalRole}`,
                    columnId,
                  )
                }
                onSave={() => onSave(row)}
                onRemove={
                  row.mappingStatus === "matched" &&
                  row.mappingSource === "document_manual"
                    ? () => onRemove(row)
                    : undefined
                }
              />
            )}
          </div>
          <span style={{ textAlign: "right", color: "#475467", fontWeight: 700 }}>
            {row.approvedValueCount}
          </span>
        </div>
      ))}
    </div>
  );
}

function ManualMappingControl({
  row,
  columns,
  selectedColumnId,
  pending,
  disabled,
  onSelectionChange,
  onSave,
  onRemove,
}: {
  row: MappingPreviewRow;
  columns: MappingPreviewColumn[];
  selectedColumnId: string;
  pending: boolean;
  disabled: boolean;
  onSelectionChange: (columnId: string) => void;
  onSave: () => void;
  onRemove?: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: "5px" }}>
      <span
        style={{
          justifySelf: "start",
          display: "inline-flex",
          padding: "2px 6px",
          borderRadius: "999px",
          background:
            row.mappingStatus === "matched"
              ? "#ecfdf3"
              : row.mappingStatus === "ambiguous"
                ? "#fffaeb"
                : "#f2f4f7",
          color:
            row.mappingStatus === "matched"
              ? "#067647"
              : row.mappingStatus === "ambiguous"
                ? "#b54708"
                : "#475467",
          fontWeight: 700,
        }}
      >
        {row.mappingStatus === "matched"
          ? `Manual mapping · ${row.targetColumnLabel ?? row.targetColumnKey ?? ""}`
          : row.mappingStatus === "ambiguous"
            ? "Ambiguous"
            : "Needs mapping"}
      </span>
      <div style={{ display: "flex", gap: "5px", minWidth: 0 }}>
        <select
          value={selectedColumnId}
          onChange={(event) => onSelectionChange(event.target.value)}
          disabled={disabled}
          aria-label={`Map ${row.canonicalRole} to Smart Sheet column`}
          style={{
            minWidth: 0,
            flex: "1 1 auto",
            height: "29px",
            border: "1px solid #d0d5dd",
            borderRadius: "6px",
            background: "#ffffff",
            padding: "0 7px",
            color: "#344054",
            fontSize: "10px",
          }}
        >
          <option value="">Choose column…</option>
          {columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.label}{column.hidden ? " (hidden)" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onSave}
          disabled={
            disabled ||
            !selectedColumnId ||
            (row.mappingStatus === "matched" &&
              selectedColumnId === row.targetColumnId)
          }
          style={{
            height: "29px",
            padding: "0 8px",
            border: "1px solid #bdb4fe",
            borderRadius: "6px",
            background: "#f4f3ff",
            color:
              disabled ||
              !selectedColumnId ||
              (row.mappingStatus === "matched" &&
                selectedColumnId === row.targetColumnId)
                ? "#98a2b3"
                : "#5925dc",
            fontSize: "10px",
            fontWeight: 750,
            cursor:
              disabled ||
              !selectedColumnId ||
              (row.mappingStatus === "matched" &&
                selectedColumnId === row.targetColumnId)
                ? "not-allowed"
                : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {pending
            ? "Working…"
            : row.mappingStatus === "matched"
              ? "Change"
              : "Map"}
        </button>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            style={{
              height: "29px",
              padding: "0 8px",
              border: "1px solid #fecdca",
              borderRadius: "6px",
              background: "#fef3f2",
              color: disabled ? "#98a2b3" : "#b42318",
              fontSize: "10px",
              fontWeight: 750,
              cursor: disabled ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {pending ? "Working…" : "Remove"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div
      style={{
        marginTop: "20px",
        marginBottom: "8px",
        fontSize: "12px",
        fontWeight: 750,
        color: "#344054",
      }}
    >
      {children}
    </div>
  );
}

function FieldRow({
  sheetId,
  field,
  showBorder,
}: {
  sheetId: string;
  field: FieldRecord;
  showBorder: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(displayFieldValue(field));
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState(false);

  function submitReview(
    reviewStatus: "unreviewed" | "approved" | "rejected",
    value = draftValue,
  ) {
    if (isPending) return;
    setLocalMessage(null);
    setLocalError(false);

    startTransition(async () => {
      const result = await updateSmartSheetDocumentFieldReview({
        sheetId,
        fieldId: field.id,
        normalizedValue: value === "—" ? null : value,
        reviewStatus,
      });

      setLocalError(!result.ok);
      setLocalMessage(result.message ?? (result.ok ? "Saved." : "Unable to save."));

      if (result.ok) {
        setIsEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <div
      style={{
        padding: "10px 12px",
        display: "grid",
        gridTemplateColumns: "150px minmax(0, 1fr) 66px 164px",
        gap: "10px",
        alignItems: "center",
        borderTop: showBorder ? "1px solid #eef0f3" : "none",
        background:
          field.review_status === "rejected"
            ? "#fff8f7"
            : field.review_status === "approved"
              ? "#f6fef9"
              : "#ffffff",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: "11px",
            fontWeight: 700,
            color: "#344054",
          }}
          title={field.canonical_role || field.original_label || "Unmapped field"}
        >
          {field.canonical_role || field.original_label || "Unmapped field"}
        </div>
        {field.original_label ? (
          <div
            style={{
              marginTop: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "10px",
              color: "#98a2b3",
            }}
          >
            {field.original_label}
          </div>
        ) : null}
        <div style={{ marginTop: "4px" }}>{reviewStatusBadge(field.review_status)}</div>
      </div>

      <div style={{ minWidth: 0 }}>
        {isEditing ? (
          <input
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            disabled={isPending}
            autoFocus
            style={{
              width: "100%",
              height: "32px",
              padding: "0 9px",
              border: "1px solid #bdb4fe",
              borderRadius: "6px",
              outline: "none",
              fontSize: "12px",
              color: "#101828",
              background: "#ffffff",
            }}
          />
        ) : (
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: "12px",
              color: "#101828",
            }}
            title={displayFieldValue(field)}
          >
            {displayFieldValue(field)}
          </div>
        )}
        {localMessage ? (
          <div
            style={{
              marginTop: "4px",
              fontSize: "10px",
              color: localError ? "#b42318" : "#067647",
            }}
          >
            {localMessage}
          </div>
        ) : null}
      </div>

      <div style={{ textAlign: "right", fontSize: "10px", color: confidenceTone(field.confidence) }}>
        {formatConfidence(field.confidence)}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "5px", flexWrap: "wrap" }}>
        {isEditing ? (
          <>
            <SmallReviewButton
              label={isPending ? "Saving…" : "Save"}
              disabled={isPending}
              onClick={() => submitReview(field.review_status as "unreviewed" | "approved" | "rejected")}
            />
            <SmallReviewButton
              label="Cancel"
              disabled={isPending}
              onClick={() => {
                setDraftValue(displayFieldValue(field));
                setIsEditing(false);
                setLocalMessage(null);
              }}
            />
          </>
        ) : (
          <SmallReviewButton
            label="Edit"
            disabled={isPending}
            onClick={() => {
              setDraftValue(displayFieldValue(field));
              setIsEditing(true);
            }}
          />
        )}
        <SmallReviewButton
          label="✓ Approve"
          disabled={isPending}
          tone="approve"
          onClick={() => submitReview("approved")}
        />
        <SmallReviewButton
          label="× Reject"
          disabled={isPending}
          tone="reject"
          onClick={() => submitReview("rejected")}
        />
      </div>
    </div>
  );
}

function LineItemCard({
  sheetId,
  lineItem,
  fields,
}: {
  sheetId: string;
  lineItem: LineItemRecord;
  fields: FieldRecord[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState(false);

  function reviewLine(reviewStatus: "approved" | "rejected") {
    if (isPending) return;
    setLocalMessage(null);
    setLocalError(false);

    startTransition(async () => {
      const result = await setSmartSheetDocumentLineItemReview({
        sheetId,
        lineItemId: lineItem.id,
        reviewStatus,
      });

      setLocalError(!result.ok);
      setLocalMessage(result.message ?? (result.ok ? "Saved." : "Unable to save."));
      if (result.ok) router.refresh();
    });
  }

  return (
    <div
      style={{
        border:
          lineItem.review_status === "approved"
            ? "1px solid #abefc6"
            : lineItem.review_status === "rejected"
              ? "1px solid #fecdca"
              : "1px solid #e4e7ec",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          background: "#f9fafb",
          borderBottom: fields.length > 0 ? "1px solid #eef0f3" : "none",
          fontSize: "11px",
          fontWeight: 700,
          color: "#475467",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <span>Line {lineItem.line_index + 1}</span>
          {reviewStatusBadge(lineItem.review_status)}
          {localMessage ? (
            <span style={{ fontSize: "10px", color: localError ? "#b42318" : "#067647" }}>
              {localMessage}
            </span>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: confidenceTone(lineItem.confidence), marginRight: "4px" }}>
            {formatConfidence(lineItem.confidence)}
          </span>
          <SmallReviewButton
            label={isPending ? "Saving…" : "Approve line"}
            disabled={isPending}
            tone="approve"
            onClick={() => reviewLine("approved")}
          />
          <SmallReviewButton
            label="Reject line"
            disabled={isPending}
            tone="reject"
            onClick={() => reviewLine("rejected")}
          />
        </div>
      </div>

      {fields.map((field, index) => (
        <FieldRow
          key={field.id}
          sheetId={sheetId}
          field={field}
          showBorder={index > 0}
        />
      ))}
    </div>
  );
}

function SmallReviewButton({
  label,
  onClick,
  disabled = false,
  tone = "neutral",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "approve" | "reject";
}) {
  const palette =
    tone === "approve"
      ? { border: "#abefc6", background: "#ecfdf3", color: "#067647" }
      : tone === "reject"
        ? { border: "#fecdca", background: "#fef3f2", color: "#b42318" }
        : { border: "#d0d5dd", background: "#ffffff", color: "#475467" };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: "26px",
        padding: "0 7px",
        border: `1px solid ${palette.border}`,
        borderRadius: "5px",
        background: palette.background,
        color: disabled ? "#98a2b3" : palette.color,
        fontSize: "10px",
        fontWeight: 700,
        cursor: disabled ? "wait" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function reviewStatusBadge(status: string) {
  const normalized = status || "unreviewed";
  const palette =
    normalized === "approved"
      ? { background: "#ecfdf3", color: "#067647", label: "Approved" }
      : normalized === "rejected"
        ? { background: "#fef3f2", color: "#b42318", label: "Rejected" }
        : { background: "#f2f4f7", color: "#667085", label: "Unreviewed" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: "20px",
        padding: "0 6px",
        borderRadius: "999px",
        background: palette.background,
        color: palette.color,
        fontSize: "9px",
        fontWeight: 750,
        whiteSpace: "nowrap",
      }}
    >
      {palette.label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "10px",
        border: "1px solid #e4e7ec",
        borderRadius: "8px",
        background: "#ffffff",
      }}
    >
      <div style={{ fontSize: "10px", color: "#98a2b3" }}>{label}</div>
      <div
        style={{
          marginTop: "4px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "12px",
          fontWeight: 700,
          color: "#101828",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MutedBox({ children }: { children: string }) {
  return (
    <div
      style={{
        padding: "12px",
        border: "1px dashed #d0d5dd",
        borderRadius: "8px",
        fontSize: "11px",
        color: "#667085",
      }}
    >
      {children}
    </div>
  );
}

function displayFieldValue(field: FieldRecord) {
  if (typeof field.normalized_value === "string" && field.normalized_value.trim()) {
    return field.normalized_value;
  }

  if (field.normalized_value != null) {
    try {
      return JSON.stringify(field.normalized_value);
    } catch {
      // Fall through to raw value.
    }
  }

  return field.raw_value || "—";
}

function formatConfidence(value: number | string | null) {
  const numberValue = typeof value === "string" ? Number(value) : value;
  if (typeof numberValue !== "number" || !Number.isFinite(numberValue)) {
    return "—";
  }

  return `${Math.round(Math.max(0, Math.min(1, numberValue)) * 100)}%`;
}

function confidenceTone(value: number | string | null) {
  const numberValue = typeof value === "string" ? Number(value) : value;
  if (typeof numberValue !== "number" || !Number.isFinite(numberValue)) {
    return "#667085";
  }
  if (numberValue >= 0.9) return "#067647";
  if (numberValue >= 0.7) return "#b54708";
  return "#b42318";
}

function humanize(value: string | null | undefined) {
  const normalized = (value || "unknown").replace(/[_-]+/g, " ").trim();
  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}
