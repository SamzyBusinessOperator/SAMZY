import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  Building2,
  Save,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type NewSupplierPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewSupplierPage({
  searchParams,
}: NewSupplierPageProps) {
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

  async function createSupplier(formData: FormData) {
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

    const name = getString("name");
    const contactName = getString("contact_name");
    const email = getString("email");
    const phone = getString("phone");
    const vatNumber = getString("vat_number");
    const address = getString("address");
    const city = getString("city");
    const postalCode = getString("postal_code");
    const countryCode =
      getString("country_code").toUpperCase() || "PT";
    const notes = getString("notes");

    const status =
      getString("status") === "inactive"
        ? "inactive"
        : "active";

    if (name.length < 2) {
      redirect(
        `/app/suppliers/new?error=${encodeURIComponent(
          "Supplier name must contain at least 2 characters.",
        )}`,
      );
    }

    if (countryCode.length !== 2) {
      redirect(
        `/app/suppliers/new?error=${encodeURIComponent(
          "Country code must contain exactly 2 letters.",
        )}`,
      );
    }

    const {
      data: supplier,
      error,
    } = await supabase
      .from("suppliers")
      .insert({
        organization_id: organizationId,
        name,
        contact_name: contactName || null,
        email: email || null,
        phone: phone || null,
        vat_number: vatNumber || null,
        address: address || null,
        city: city || null,
        postal_code: postalCode || null,
        country_code: countryCode,
        notes: notes || null,
        status,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !supplier) {
      redirect(
        `/app/suppliers/new?error=${encodeURIComponent(
          error?.message || "Unable to create supplier.",
        )}`,
      );
    }

    revalidatePath("/app/suppliers");

    redirect(`/app/suppliers/${supplier.id}`);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/app/suppliers"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition hover:text-[#101828]"
      >
        <ArrowLeft size={16} />
        Back to suppliers
      </Link>

      <div className="mt-5">
        <h1 className="text-3xl font-semibold tracking-tight text-[#101828]">
          Add supplier
        </h1>

        <p className="mt-2 text-sm text-[#667085]">
          Create a supplier profile for purchasing and supplier price
          tracking.
        </p>
      </div>

      {params.error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      ) : null}

      <form
        action={createSupplier}
        className="mt-8 space-y-6"
      >
        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f4f7] text-[#475467]">
              <Building2 size={18} />
            </div>

            <div>
              <h2 className="font-semibold text-[#101828]">
                Supplier information
              </h2>

              <p className="mt-1 text-sm text-[#667085]">
                Basic company and contact information.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Supplier name"
              name="name"
              required
              placeholder="Example: Spark Cash & Carry"
            />

            <Field
              label="Contact name"
              name="contact_name"
              placeholder="Main contact person"
            />

            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="supplier@example.com"
            />

            <Field
              label="Phone"
              name="phone"
              type="tel"
              placeholder="+351 ..."
            />

            <Field
              label="VAT number"
              name="vat_number"
              placeholder="PT123456789"
            />

            <label>
              <span className="text-sm font-medium text-[#344054]">
                Status
              </span>

              <select
                name="status"
                defaultValue="active"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm outline-none transition focus:border-[#101828]"
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Address
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Supplier billing or business address.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field
                label="Address"
                name="address"
                placeholder="Street and building number"
              />
            </div>

            <Field
              label="City"
              name="city"
              placeholder="Lisbon"
            />

            <Field
              label="Postal code"
              name="postal_code"
              placeholder="1000-001"
            />

            <Field
              label="Country code"
              name="country_code"
              defaultValue="PT"
              maxLength={2}
              placeholder="PT"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-[#101828]">
            Notes
          </h2>

          <p className="mt-1 text-sm text-[#667085]">
            Store internal information about this supplier.
          </p>

          <textarea
            name="notes"
            rows={5}
            placeholder="Payment terms, delivery schedule, minimum order, account manager..."
            className="mt-5 w-full rounded-xl border border-[#d0d5dd] px-4 py-3 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
          />
        </section>

        <div className="flex flex-col-reverse gap-3 pb-10 sm:flex-row sm:justify-end">
          <Link
            href="/app/suppliers"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#101828] px-6 text-sm font-semibold text-white transition hover:bg-black"
          >
            <Save size={16} />
            Create supplier
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  defaultValue,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  maxLength?: number;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-[#344054]">
        {label}

        {required ? (
          <span className="text-red-600">
            {" "}
            *
          </span>
        ) : null}
      </span>

      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        maxLength={maxLength}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
      />
    </label>
  );
}