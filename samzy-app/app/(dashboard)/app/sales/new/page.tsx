import { redirect } from "next/navigation";

import NewSaleForm from "@/components/sales/NewSaleForm";
import { createClient } from "@/lib/supabase/server";

type SubmittedItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discountAmount: number;
};

export default async function NewSalePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const organizationId = membership.organization_id;

  const { data: products, error: productsError } =
    await supabase
      .from("products")
      .select(
        `
          id,
          name,
          sku,
          selling_price,
          current_stock,
          vat_rate
        `,
      )
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("name", { ascending: true });

  if (productsError) {
    throw new Error(
      `Unable to load products: ${productsError.message}`,
    );
  }

  async function createSale(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      redirect("/onboarding");
    }

    const organizationId =
      membership.organization_id;

    const rawItems = formData.get("items");

    if (
      typeof rawItems !== "string" ||
      !rawItems.trim()
    ) {
      throw new Error(
        "Sale must contain at least one product.",
      );
    }

    let items: SubmittedItem[];

    try {
      items = JSON.parse(rawItems);
    } catch {
      throw new Error("Invalid sale items.");
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      throw new Error(
        "Sale must contain at least one product.",
      );
    }

    const normalizedItems = items.map((item) => ({
      productId: String(
        item.productId || "",
      ).trim(),

      quantity: Number(
        item.quantity,
      ),

      unitPrice: Number(
        item.unitPrice,
      ),

      vatRate: Number(
        item.vatRate,
      ),

      discountAmount: Number(
        item.discountAmount || 0,
      ),
    }));

    for (const item of normalizedItems) {
      if (!item.productId) {
        throw new Error(
          "Every sale item requires a product.",
        );
      }

      if (
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new Error(
          "Sale item quantity must be greater than zero.",
        );
      }

      if (
        !Number.isFinite(item.unitPrice) ||
        item.unitPrice < 0
      ) {
        throw new Error(
          "Sale item price cannot be negative.",
        );
      }

      if (
        !Number.isFinite(item.vatRate) ||
        item.vatRate < 0
      ) {
        throw new Error(
          "VAT rate cannot be negative.",
        );
      }

      if (
        !Number.isFinite(
          item.discountAmount,
        ) ||
        item.discountAmount < 0
      ) {
        throw new Error(
          "Discount cannot be negative.",
        );
      }
    }

    const productIds = [
      ...new Set(
        normalizedItems.map(
          (item) => item.productId,
        ),
      ),
    ];

    if (
      productIds.length !==
      normalizedItems.length
    ) {
      throw new Error(
        "A product can only appear once in a sale.",
      );
    }

    const {
      data: validProducts,
      error: verifyError,
    } = await supabase
      .from("products")
      .select("id")
      .eq(
        "organization_id",
        organizationId,
      )
      .eq("status", "active")
      .in("id", productIds);

    if (verifyError) {
      throw new Error(
        `Unable to verify products: ${verifyError.message}`,
      );
    }

    if (
      (validProducts ?? []).length !==
      productIds.length
    ) {
      throw new Error(
        "One or more products do not belong to your organization.",
      );
    }

    const saleDateValue =
      formData.get("sale_date");

    const saleDate =
      typeof saleDateValue === "string" &&
      saleDateValue
        ? saleDateValue
        : new Date()
            .toISOString()
            .slice(0, 10);

    const paymentValue =
      formData.get("payment_method");

    const allowedPayments = new Set([
      "cash",
      "card",
      "mb_way",
      "bank_transfer",
      "other",
    ]);

    const paymentMethod =
      typeof paymentValue === "string" &&
      allowedPayments.has(paymentValue)
        ? paymentValue
        : null;

    const notesValue =
      formData.get("notes");

    const notes =
      typeof notesValue === "string" &&
      notesValue.trim()
        ? notesValue.trim()
        : null;

    const {
      data: generatedSaleNumber,
      error: numberError,
    } = await supabase.rpc(
      "generate_sale_number",
    );

    if (
      numberError ||
      !generatedSaleNumber
    ) {
      throw new Error(
        numberError?.message ||
          "Unable to generate sale number.",
      );
    }

    const {
      data: sale,
      error: saleError,
    } = await supabase
      .from("sales")
      .insert({
        organization_id:
          organizationId,

        sale_number:
          generatedSaleNumber,

        status: "draft",

        sale_date:
          saleDate,

        payment_method:
          paymentMethod,

        currency: "EUR",

        notes,

        created_by:
          user.id,
      })
      .select("id")
      .single();

    if (
      saleError ||
      !sale
    ) {
      throw new Error(
        saleError?.message ||
          "Unable to create sale.",
      );
    }

    const saleItems =
      normalizedItems.map(
        (item) => ({
          organization_id:
            organizationId,

          sale_id:
            sale.id,

          product_id:
            item.productId,

          quantity:
            item.quantity,

          unit_price:
            item.unitPrice,

          vat_rate:
            item.vatRate,

          discount_amount:
            item.discountAmount,
        }),
      );

    const { error: itemError } =
      await supabase
        .from("sale_items")
        .insert(saleItems);

    if (itemError) {
      await supabase
        .from("sales")
        .delete()
        .eq(
          "id",
          sale.id,
        )
        .eq(
          "organization_id",
          organizationId,
        );

      throw new Error(
        `Unable to save sale items: ${itemError.message}`,
      );
    }

    redirect(
      `/app/sales/${sale.id}`,
    );
  }

  return (
    <NewSaleForm
      products={(products ?? []).map(
        (product) => ({
          id: product.id,

          name: product.name,

          sku: product.sku,

          selling_price:
            product.selling_price === null
              ? null
              : Number(
                  product.selling_price,
                ),

          current_stock:
            product.current_stock === null
              ? null
              : Number(
                  product.current_stock,
                ),

          vat_rate:
            product.vat_rate === null
              ? null
              : Number(
                  product.vat_rate,
                ),
        }),
      )}
      action={createSale}
    />
  );
}