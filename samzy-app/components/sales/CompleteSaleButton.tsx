"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";

type Props = {
  saleNumber: string;
  itemCount: number;
  action: () => void | Promise<void>;
};

export default function CompleteSaleButton({
  saleNumber,
  itemCount,
  action,
}: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  function openDialog() {
    setErrorMessage(null);
    setOpen(true);
  }

  function closeDialog() {
    if (submitting) {
      return;
    }

    setErrorMessage(null);
    setOpen(false);
  }

  async function handleConfirm() {
    if (submitting) {
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      await action();

      /*
       * On success, the server action redirects back to
       * the sale detail page.
       *
       * In Next.js, that redirect controls navigation,
       * so we deliberately do not throw or force another
       * client-side navigation here.
       */
    } catch (error) {
      /*
       * A genuine unexpected client/server-action failure
       * should not crash the entire page.
       *
       * Keep the modal open and give the customer a clear
       * recoverable message.
       */
      console.error(
        "Unable to complete sale:",
        error,
      );

      setErrorMessage(
        "The sale could not be completed. No additional action has been taken. Please try again.",
      );

      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white transition hover:bg-black"
      >
        <CheckCircle2 size={16} />
        Complete sale
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="complete-sale-title"
            aria-describedby="complete-sale-description"
            className="w-full max-w-md rounded-2xl border border-[#eaecf0] bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-[#eaecf0] px-6 py-5">
              <div>
                <h2
                  id="complete-sale-title"
                  className="text-lg font-semibold text-[#101828]"
                >
                  Complete sale?
                </h2>

                <p className="mt-1 text-sm text-[#667085]">
                  Review this action before
                  confirming.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#f2f4f7] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-xl bg-[#f9fafb] p-4">
                <p className="text-sm font-semibold text-[#101828]">
                  {saleNumber}
                </p>

                <p
                  id="complete-sale-description"
                  className="mt-2 text-sm leading-6 text-[#667085]"
                >
                  Completing this sale will deduct
                  inventory for{" "}
                  <strong className="text-[#344054]">
                    {itemCount}{" "}
                    {itemCount === 1
                      ? "product line"
                      : "product lines"}
                  </strong>{" "}
                  and mark the transaction as
                  completed.
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-sm font-medium text-orange-800">
                  Completed sales become read-only
                  and cannot be completed again.
                </p>
              </div>

              {errorMessage ? (
                <div className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-red-600"
                  />

                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Unable to complete sale
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-700">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#eaecf0] px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={closeDialog}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirm}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Confirm completion
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}