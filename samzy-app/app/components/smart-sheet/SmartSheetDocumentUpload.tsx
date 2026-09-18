"use client";

import { useRef, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { uploadSmartSheetDocument } from "@/app/app/smart-sheets/[id]/actions";

type Props = {
  sheetId: string;
};

export default function SmartSheetDocumentUpload({ sheetId }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function chooseFile() {
    if (isPending) return;
    inputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setMessage(null);
    setIsError(false);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("sheetId", sheetId);
      formData.set("file", file);

      const result = await uploadSmartSheetDocument(formData);

      setIsError(!result.ok);
      setMessage(result.message ?? (result.ok ? "Document uploaded." : "Upload failed."));

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/tiff"
        onChange={handleFileChange}
        disabled={isPending}
        aria-label="Upload source document"
        style={{ display: "none" }}
      />

      <button
        type="button"
        onClick={chooseFile}
        disabled={isPending}
        title="Preserve the original PDF or image before OCR / AI understanding"
        style={{
          height: "38px",
          padding: "0 14px",
          borderRadius: "8px",
          border: "1px solid #d0d5dd",
          background: isPending ? "#f9fafb" : "#ffffff",
          color: isPending ? "#98a2b3" : "#344054",
          fontSize: "12px",
          fontWeight: 650,
          cursor: isPending ? "wait" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {isPending ? "Uploading…" : "Upload document"}
      </button>

      {message ? (
        <div
          role={isError ? "alert" : "status"}
          style={{
            position: "absolute",
            top: "44px",
            right: 0,
            zIndex: 80,
            width: "320px",
            padding: "10px 12px",
            border: `1px solid ${isError ? "#fecdca" : "#abefc6"}`,
            borderRadius: "8px",
            background: isError ? "#fef3f2" : "#ecfdf3",
            color: isError ? "#b42318" : "#067647",
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
  );
}
