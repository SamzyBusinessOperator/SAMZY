"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  current_stock: number;
  reserved_stock: number;
  reorder_level: number;
  unit: string | null;
};

type Props = {
  products: Product[];
  selectedProductId: string;
};

export default function AdjustStockProductSelector({
  products,
  selectedProductId,
}: Props) {
  const router = useRouter();

  const [changingProduct, setChangingProduct] =
    useState(false);

  function handleProductChange(
    productId: string,
  ) {
    if (
      !productId ||
      productId === selectedProductId
    ) {
      return;
    }

    setChangingProduct(true);

    router.push(
      `/app/inventory/adjust?product=${encodeURIComponent(
        productId,
      )}`,
    );
  }

  const selectedProduct =
    products.find(
      (product) =>
        product.id === selectedProductId,
    ) ?? products[0];

  const currentStock = Number(
    selectedProduct?.current_stock ?? 0,
  );

  const reservedStock = Number(
    selectedProduct?.reserved_stock ?? 0,
  );

  const availableStock =
    currentStock - reservedStock;

  const reorderLevel = Number(
    selectedProduct?.reorder_level ?? 0,
  );

  const unit =
    selectedProduct?.unit || "unit";

  return (
    <>
      <div className="mt-6">
        <label>
          <span className="text-sm font-medium text-[#344054]">
            Product{" "}
            <span className="text-red-600">
              *
            </span>
          </span>

          <div className="relative mt-2">
            <select
              name="product_id"
              required
              value={selectedProductId}
              disabled={changingProduct}
              onChange={(event) =>
                handleProductChange(
                  event.target.value,
                )
              }
              className="h-12 w-full rounded-xl border border-[#d0d5dd] bg-white px-4 pr-12 text-sm outline-none transition focus:border-[#101828] disabled:cursor-wait disabled:bg-[#f9fafb]"
            >
              {products.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                >
                  {product.name}
                  {product.sku
                    ? ` — ${product.sku}`
                    : ""}
                </option>
              ))}
            </select>

            {changingProduct ? (
              <div className="pointer-events-none absolute inset-y-0 right-10 flex items-center">
                <Loader2
                  size={16}
                  className="animate-spin text-[#667085]"
                />
              </div>
            ) : null}
          </div>
        </label>

        {changingProduct ? (
          <p className="mt-2 text-xs text-[#667085]">
            Loading selected product...
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <InfoCard
          label="System stock"
          value={`${formatQuantity(
            currentStock,
          )} ${unit}`}
        />

        <InfoCard
          label="Reserved"
          value={`${formatQuantity(
            reservedStock,
          )} ${unit}`}
        />

        <InfoCard
          label="Available"
          value={`${formatQuantity(
            availableStock,
          )} ${unit}`}
        />

        <InfoCard
          label="Reorder level"
          value={`${formatQuantity(
            reorderLevel,
          )} ${unit}`}
        />
      </div>
    </>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] p-4">
      <p className="text-xs text-[#667085]">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold text-[#101828]">
        {value}
      </p>
    </div>
  );
}

function formatQuantity(
  value: number,
) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}