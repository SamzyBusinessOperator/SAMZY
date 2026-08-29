import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";

import NewPurchaseForm from "@/components/purchases/NewPurchaseForm";
import { createClient } from "@/lib/supabase/server";

type NewPurchasePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

type PurchaseItemInput = {
  product_id: string;
  ordered_quantity: number;
  unit_cost: number;
  vat_rate: number;
};

export default async function NewPurchasePage({
  searchParams,
}: NewPurchasePageProps) {
  const params = await searchParams;

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

  const [
    { data: organization },
    { data: suppliers },
    { data: products },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("currency")
      .eq("id", organizationId)
      .single(),

    supabase
      .from("suppliers")
      .select(
        `
          id,
          name,
          contact_name,
          email,
          phone,
          vat_number,
          status
        `,
      )
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("name", { ascending: true }),

    supabase
      .from("products")
      .select(
        `
          id,
          name,
          sku,
          brand,
          unit,
          cost_price,
          vat_rate,
          status
        `,
      )
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("name", { ascending: true }),
  ]);

  async function createPurchase(formData: FormData) {
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

    const organizationId = membership.organization_id;

    const getString = (name: string) => {
      const value = formData.get(name);

      return typeof value === "string"
        ? value.trim()
        : "";
    };

    const supplierMode =
      getString("supplier_mode") || "existing";

    let supplierId =
      getString("supplier_id") || null;

    const purchaseDate =
      getString("purchase_date");

    const expectedDate =
      getString("expected_date");

    const supplierReference =
      getString("supplier_reference");

    const notes =
      getString("notes");

    const purchaseStatus =
      getString("purchase_status") === "ordered"
        ? "ordered"
        : "draft";

    const itemsJson =
      getString("items_json");

    if (!purchaseDate) {
      redirect(
        `/app/purchases/new?error=${encodeURIComponent(
          "Purchase date is required.",
        )}`,
      );
    }

    let items: PurchaseItemInput[];

    try {
      items = JSON.parse(itemsJson);
    } catch {
      redirect(
        `/app/purchases/new?error=${encodeURIComponent(
          "Purchase items could not be read.",
        )}`,
      );
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      redirect(
        `/app/purchases/new?error=${encodeURIComponent(
          "Add at least one product to the purchase.",
        )}`,
      );
    }

    const cleanedItems = items
      .map((item) => ({
        product_id:
          String(item.product_id || "").trim(),

        ordered_quantity:
          Number(item.ordered_quantity),

        unit_cost:
          Number(item.unit_cost),

        vat_rate:
          Number(item.vat_rate),
      }))
      .filter(
        (item) =>
          item.product_id &&
          Number.isFinite(
            item.ordered_quantity,
          ) &&
          item.ordered_quantity > 0 &&
          Number.isFinite(item.unit_cost) &&
          item.unit_cost >= 0 &&
          Number.isFinite(item.vat_rate) &&
          item.vat_rate >= 0,
      );

    if (
      cleanedItems.length !== items.length
    ) {
      redirect(
        `/app/purchases/new?error=${encodeURIComponent(
          "One or more purchase items contain invalid values.",
        )}`,
      );
    }

    const duplicateProducts =
      cleanedItems.some(
        (item, index) =>
          cleanedItems.findIndex(
            (candidate) =>
              candidate.product_id ===
              item.product_id,
          ) !== index,
      );

    if (duplicateProducts) {
      redirect(
        `/app/purchases/new?error=${encodeURIComponent(
          "The same product cannot be added more than once to a purchase.",
        )}`,
      );
    }

    /*
     * Confirm every submitted product belongs
     * to the authenticated organization.
     */
    const productIds = cleanedItems.map(
      (item) => item.product_id,
    );

    const { data: validProducts } =
      await supabase
        .from("products")
        .select("id")
        .eq(
          "organization_id",
          organizationId,
        )
        .in("id", productIds);

    if (
      !validProducts ||
      validProducts.length !==
        productIds.length
    ) {
      redirect(
        `/app/purchases/new?error=${encodeURIComponent(
          "One or more selected products are invalid.",
        )}`,
      );
    }

    /*
     * Either use an existing supplier
     * or create one directly from this page.
     */
    if (supplierMode === "new") {
      const supplierName =
        getString("new_supplier_name");

      const contactName =
        getString("new_supplier_contact");

      const supplierEmail =
        getString("new_supplier_email");

      const supplierPhone =
        getString("new_supplier_phone");

      const supplierVat =
        getString("new_supplier_vat");

      if (
        supplierName.length < 2
      ) {
        redirect(
          `/app/purchases/new?error=${encodeURIComponent(
            "New supplier name is required.",
          )}`,
        );
      }

      const {
        data: newSupplier,
        error: supplierError,
      } = await supabase
        .from("suppliers")
        .insert({
          organization_id:
            organizationId,

          name: supplierName,

          contact_name:
            contactName || null,

          email:
            supplierEmail || null,

          phone:
            supplierPhone || null,

          vat_number:
            supplierVat || null,

          country_code: "PT",

          status: "active",

          created_by: user.id,
        })
        .select("id")
        .single();

      if (
        supplierError ||
        !newSupplier
      ) {
        redirect(
          `/app/purchases/new?error=${encodeURIComponent(
            supplierError?.message ||
              "Unable to create supplier.",
          )}`,
        );
      }

      supplierId =
        newSupplier.id;
    }

    if (!supplierId) {
      redirect(
        `/app/purchases/new?error=${encodeURIComponent(
          "Please select or create a supplier.",
        )}`,
      );
    }

    /*
     * Confirm existing supplier belongs
     * to this organization.
     */
    const { data: supplier } =
      await supabase
        .from("suppliers")
        .select("id")
        .eq("id", supplierId)
        .eq(
          "organization_id",
          organizationId,
        )
        .maybeSingle();

    if (!supplier) {
      redirect(
        `/app/purchases/new?error=${encodeURIComponent(
          "Supplier was not found.",
        )}`,
      );
    }

    /*
     * Generate the human-readable
     * purchase number.
     */
    const {
      data: generatedNumber,
      error: numberError,
    } = await supabase.rpc(
      "generate_purchase_number",
    );

    if (
      numberError ||
      !generatedNumber
    ) {
      redirect(
        `/app/purchases/new?error=${encodeURIComponent(
          numberError?.message ||
            "Unable to generate purchase number.",
        )}`,
      );
    }

    const {
      data: organization,
    } = await supabase
      .from("organizations")
      .select("currency")
      .eq("id", organizationId)
      .single();

    /*
     * Create the purchase header.
     *
     * Inventory is NOT changed here.
     */
    const {
      data: purchase,
      error: purchaseError,
    } = await supabase
      .from("purchases")
      .insert({
        organization_id:
          organizationId,

        supplier_id:
          supplierId,

        purchase_number:
          String(generatedNumber),

        supplier_reference:
          supplierReference || null,

        status:
          purchaseStatus,

        purchase_date:
          purchaseDate,

        expected_date:
          expectedDate || null,

        currency:
          organization?.currency ||
          "EUR",

        notes:
          notes || null,

        created_by:
          user.id,
      })
      .select("id")
      .single();

    if (
      purchaseError ||
      !purchase
    ) {
      redirect(
        `/app/purchases/new?error=${encodeURIComponent(
          purchaseError?.message ||
            "Unable to create purchase.",
        )}`,
      );
    }

    /*
     * Create purchase line items.
     *
     * Database triggers calculate:
     *
     * line_subtotal
     * line_vat
     * line_total
     *
     * and refresh the purchase totals.
     */
    const purchaseItems =
      cleanedItems.map((item) => ({
        organization_id:
          organizationId,

        purchase_id:
          purchase.id,

        product_id:
          item.product_id,

        ordered_quantity:
          item.ordered_quantity,

        received_quantity: 0,

        unit_cost:
          item.unit_cost,

        vat_rate:
          item.vat_rate,
      }));

    const { error: itemsError } =
      await supabase
        .from("purchase_items")
        .insert(purchaseItems);

    if (itemsError) {
      /*
       * Avoid leaving an empty purchase
       * if line creation fails.
       */
      await supabase
        .from("purchases")
        .delete()
        .eq("id", purchase.id)
        .eq(
          "organization_id",
          organizationId,
        );

      redirect(
        `/app/purchases/new?error=${encodeURIComponent(
          itemsError.message,
        )}`,
      );
    }

    revalidatePath(
      "/app/purchases",
    );

    redirect(
      `/app/purchases/${purchase.id}`,
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/app/purchases"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition hover:text-[#101828]"
      >
        <ArrowLeft size={16} />
        Back to purchases
      </Link>

      <div className="mt-5">
        <h1 className="text-3xl font-semibold tracking-tight text-[#101828]">
          New purchase
        </h1>

        <p className="mt-2 text-sm text-[#667085]">
          Create a supplier purchase order
          and define the products being ordered.
        </p>
      </div>

      {params.error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      ) : null}

      <NewPurchaseForm
        suppliers={suppliers ?? []}
        products={products ?? []}
        currency={
          organization?.currency ||
          "EUR"
        }
        action={createPurchase}
      />
    </div>
  );
}