import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ArrowLeft } from "lucide-react";

import EditSupplierForm from "@/components/suppliers/EditSupplierForm";
import { createClient } from "@/lib/supabase/server";

type EditSupplierPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditSupplierPage({
  params,
  searchParams,
}: EditSupplierPageProps) {
  const { id } = await params;
  const query = await searchParams;

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

  const {
    data: supplier,
    error: supplierError,
  } = await supabase
    .from("suppliers")
    .select(
      `
        id,
        name,
        contact_name,
        email,
        phone,
        vat_number,
        address,
        city,
        postal_code,
        country_code,
        notes,
        status
      `,
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (supplierError || !supplier) {
    notFound();
  }

  async function updateSupplier(
    formData: FormData,
  ) {
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

    const getString = (name: string) => {
      const value = formData.get(name);

      return typeof value === "string"
        ? value.trim()
        : "";
    };

    const name = getString("name");
    const contactName =
      getString("contact_name");
    const email = getString("email");
    const phone = getString("phone");
    const vatNumber =
      getString("vat_number");
    const address =
      getString("address");
    const city = getString("city");
    const postalCode =
      getString("postal_code");

    const countryCode =
      getString("country_code").toUpperCase() ||
      "PT";

    const notes = getString("notes");

    const status =
      getString("status") === "inactive"
        ? "inactive"
        : "active";

    if (name.length < 2) {
      redirect(
        `/app/suppliers/${id}/edit?error=${encodeURIComponent(
          "Supplier name must contain at least 2 characters.",
        )}`,
      );
    }

    if (countryCode.length !== 2) {
      redirect(
        `/app/suppliers/${id}/edit?error=${encodeURIComponent(
          "Country code must contain exactly 2 letters.",
        )}`,
      );
    }

    /*
     * Make sure the supplier being edited
     * belongs to the authenticated organization.
     */
    const { data: existingSupplier } =
      await supabase
        .from("suppliers")
        .select("id")
        .eq("id", id)
        .eq(
          "organization_id",
          organizationId,
        )
        .maybeSingle();

    if (!existingSupplier) {
      redirect(
        `/app/suppliers?error=${encodeURIComponent(
          "Supplier was not found.",
        )}`,
      );
    }

    const { error } = await supabase
      .from("suppliers")
      .update({
        name,
        contact_name:
          contactName || null,
        email: email || null,
        phone: phone || null,
        vat_number:
          vatNumber || null,
        address: address || null,
        city: city || null,
        postal_code:
          postalCode || null,
        country_code:
          countryCode,
        notes: notes || null,
        status,
      })
      .eq("id", id)
      .eq(
        "organization_id",
        organizationId,
      );

    if (error) {
      redirect(
        `/app/suppliers/${id}/edit?error=${encodeURIComponent(
          error.message,
        )}`,
      );
    }

    revalidatePath("/app/suppliers");

    revalidatePath(
      `/app/suppliers/${id}`,
    );

    revalidatePath(
      `/app/suppliers/${id}/edit`,
    );

    revalidatePath(
      "/app/purchases/new",
    );

    redirect(
      `/app/suppliers/${id}`,
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/app/suppliers/${id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition hover:text-[#101828]"
      >
        <ArrowLeft size={16} />
        Back to supplier
      </Link>

      <div className="mt-5">
        <h1 className="text-3xl font-semibold tracking-tight text-[#101828]">
          Edit supplier
        </h1>

        <p className="mt-2 text-sm text-[#667085]">
          Update supplier information,
          contact details and account status.
        </p>
      </div>

      {query.error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {query.error}
        </div>
      ) : null}

      <EditSupplierForm
        supplier={{
          id: supplier.id,
          name: supplier.name,
          contact_name:
            supplier.contact_name,
          email: supplier.email,
          phone: supplier.phone,
          vat_number:
            supplier.vat_number,
          address: supplier.address,
          city: supplier.city,
          postal_code:
            supplier.postal_code,
          country_code:
            supplier.country_code,
          notes: supplier.notes,
          status: supplier.status,
        }}
        action={updateSupplier}
      />
    </div>
  );
}