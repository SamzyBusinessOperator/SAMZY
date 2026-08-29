"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type DeleteProductButtonProps = {
  productId: string;
  productName: string;
  organizationId: string;
};

export default function DeleteProductButton({
  productId,
  productName,
  organizationId,
}: DeleteProductButtonProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (deleting) return;

    setDeleting(true);
    setError(null);

    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("organization_id", organizationId);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    setOpen(false);

    router.push("/app/products");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
      >
        <Trash2 size={16} />
        Delete product
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-product-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-2xl">
            <div className="flex items-start justify-between p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <AlertTriangle size={20} />
                </div>

                <div>
                  <h2
                    id="delete-product-title"
                    className="text-lg font-semibold text-[#101828]"
                  >
                    Delete product?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#667085]">
                    You are about to permanently delete{" "}
                    <span className="font-semibold text-[#344054]">
                      {productName}
                    </span>
                    .
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!deleting) {
                    setOpen(false);
                    setError(null);
                  }
                }}
                disabled={deleting}
                aria-label="Close"
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#f2f4f7] hover:text-[#101828] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pb-6">
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-700">
                  This action cannot be undone.
                </p>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#eaecf0] bg-[#fcfcfd] p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                disabled={deleting}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex h-11 min-w-[145px] items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete product
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}