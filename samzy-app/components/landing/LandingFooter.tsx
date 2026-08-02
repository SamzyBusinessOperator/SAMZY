import Link from "next/link";
import { Mail } from "lucide-react";

import { Brand } from "./Brand";

const footerGroups = [
  {
    title: "Product",
    links: [
      ["Features", "#modules"],
      ["How It Works", "#how-it-works"],
      ["Solutions", "#solutions"],
      ["Pricing", "#pricing"],
    ],
  },
  {
    title: "Solutions",
    links: [
      ["Retail", "#solutions"],
      ["Wholesale", "#solutions"],
      ["Distribution", "#solutions"],
      ["Service Businesses", "#solutions"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Help Center", "#"],
      ["Documentation", "#"],
      ["Templates", "#"],
      ["Blog", "#"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About Us", "#"],
      ["Careers", "#"],
      ["Contact Us", "mailto:samzyaioperator@gmail.com"],
      ["Privacy Policy", "/privacy"],
    ],
  },
];

const socialLinks = [
  {
    label: "X",
    href: "#",
  },
  {
    label: "in",
    href: "#",
  },
  {
    label: "YT",
    href: "#",
  },
  {
    label: "GH",
    href: "#",
  },
];

export function LandingFooter() {
  return (
    <footer id="footer" className="border-t border-[#eef0f5] bg-white">
      <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.25fr_repeat(4,0.75fr)_1.25fr] lg:px-10">
        <div>
          <Brand compact />

          <p className="mt-5 max-w-[240px] text-xs leading-6 text-[#778096]">
            The intelligent business workspace for modern companies.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f6fa] text-[11px] font-bold text-[#606a83] transition hover:bg-violet-50 hover:text-violet-600"
              >
                {social.label}
              </a>
            ))}

            <a
              href="mailto:samzyaioperator@gmail.com"
              aria-label="Email SAMZY"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f6fa] text-[#606a83] transition hover:bg-violet-50 hover:text-violet-600"
            >
              <Mail size={16} strokeWidth={1.9} />
            </a>
          </div>
        </div>

        {footerGroups.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs font-bold text-[#111a3d]">
              {group.title}
            </h3>

            <div className="mt-5 space-y-3">
              {group.links.map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="block text-xs text-[#747d93] transition hover:text-violet-600"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div>
          <h3 className="text-xs font-bold text-[#111a3d]">
            Stay Updated
          </h3>

          <p className="mt-5 text-xs leading-5 text-[#747d93]">
            Subscribe for product updates, business tips and best practices.
          </p>

          <form className="mt-5">
            <div className="flex overflow-hidden rounded-xl border border-[#dde2ec] bg-white">
              <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
                <Mail
                  size={15}
                  strokeWidth={1.9}
                  className="shrink-0 text-[#98a2b3]"
                />

                <input
                  type="email"
                  aria-label="Email address"
                  placeholder="Enter your email"
                  className="min-w-0 flex-1 py-3 text-xs outline-none placeholder:text-[#a1a7b6]"
                />
              </div>

              <button
                type="submit"
                className="bg-[#07113b] px-4 text-xs font-semibold text-white transition hover:bg-[#111d52]"
              >
                Subscribe
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="border-t border-[#eef0f5]">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-4 px-5 py-6 text-[11px] text-[#7e879c] sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <p>© 2026 SAMZY. Lisbon, Portugal.</p>

          <div className="flex flex-wrap gap-5">
            <Link href="/privacy" className="hover:text-violet-600">
              Privacy Policy
            </Link>

            <Link href="/terms" className="hover:text-violet-600">
              Terms of Service
            </Link>

            <span>Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}