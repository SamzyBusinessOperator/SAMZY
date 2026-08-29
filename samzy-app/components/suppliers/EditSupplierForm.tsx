"use client";

import Link from "next/link";
import {
  Building2,
  MapPin,
  Save,
} from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  vat_number: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  notes: string | null;
  status: string;
};

type EditSupplierFormProps = {
  supplier: Supplier;

  action: (
    formData: FormData,
  ) => void | Promise<void>;
};

export default function EditSupplierForm({
  supplier,
  action,
}: EditSupplierFormProps) {
  return (
    <form
      action={action}
      className="mt-8 space-y-6"
    >
      {/* SUPPLIER INFORMATION */}
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
              Update company and contact
              information.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field
            label="Supplier name"
            name="name"
            required
            defaultValue={
              supplier.name
            }
          />

          <Field
            label="Contact name"
            name="contact_name"
            defaultValue={
              supplier.contact_name ||
              ""
            }
          />

          <Field
            label="Email"
            name="email"
            type="email"
            defaultValue={
              supplier.email || ""
            }
          />

          <Field
            label="Phone"
            name="phone"
            type="tel"
            defaultValue={
              supplier.phone || ""
            }
          />

          <Field
            label="VAT number"
            name="vat_number"
            defaultValue={
              supplier.vat_number ||
              ""
            }
          />

          <label>
            <span className="text-sm font-medium text-[#344054]">
              Status
            </span>

            <select
              name="status"
              defaultValue={
                supplier.status
              }
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

      {/* ADDRESS */}
      <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f4f7] text-[#475467]">
            <MapPin size={18} />
          </div>

          <div>
            <h2 className="font-semibold text-[#101828]">
              Address
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Update the supplier&apos;s
              business or billing address.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field
              label="Address"
              name="address"
              defaultValue={
                supplier.address || ""
              }
            />
          </div>

          <Field
            label="City"
            name="city"
            defaultValue={
              supplier.city || ""
            }
          />

          <Field
            label="Postal code"
            name="postal_code"
            defaultValue={
              supplier.postal_code ||
              ""
            }
          />

          <Field
            label="Country code"
            name="country_code"
            maxLength={2}
            defaultValue={
              supplier.country_code ||
              "PT"
            }
          />
        </div>
      </section>

      {/* NOTES */}
      <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-[#101828]">
          Notes
        </h2>

        <p className="mt-1 text-sm text-[#667085]">
          Store internal information about
          this supplier.
        </p>

        <textarea
          name="notes"
          rows={5}
          defaultValue={
            supplier.notes || ""
          }
          placeholder="Payment terms, delivery schedule, minimum order, account manager..."
          className="mt-5 w-full rounded-xl border border-[#d0d5dd] px-4 py-3 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
        />
      </section>

      {/* STATUS INFORMATION */}
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-sm font-semibold text-blue-900">
          Supplier status
        </p>

        <p className="mt-1 text-sm leading-6 text-blue-700">
          Inactive suppliers remain in
          historical purchase records but
          will no longer appear as active
          supplier options for new
          purchases.
        </p>
      </section>

      {/* ACTIONS */}
      <div className="flex flex-col-reverse gap-3 pb-10 sm:flex-row sm:justify-end">
        <Link
          href={`/app/suppliers/${supplier.id}`}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
        >
          Cancel
        </Link>

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#101828] px-6 text-sm font-semibold text-white transition hover:bg-black"
        >
          <Save size={16} />
          Save changes
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
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
        defaultValue={
          defaultValue
        }
        maxLength={maxLength}
        className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition focus:border-[#101828]"
      />
    </label>
  );
}