import Image from "next/image";
import Link from "next/link";

const BLACK = "#1d1d1f";
const MID_GRAY = "#6e6e73";
const BORDER = "#d2d2d7";
const ORANGE = "#fc7800";
const WHITE = "#ffffff";

const sections = [
  {
    title: "1. Who We Are",
    content:
      'SAMZY is an AI-powered business workspace developed in Lisbon, Portugal. SAMZY helps businesses manage products, inventory, suppliers, documents, pricing, reports and operational data in one connected platform. References to "SAMZY", "we", "us" or "our" in this policy refer to SAMZY and its operator.',
  },
  {
    title: "2. What This Policy Covers",
    content:
      "This Privacy Policy applies to the SAMZY website, platform and related services. It explains what information we collect, why we collect it, how it is used and the choices available to users.",
  },
  {
    title: "3. Information We Collect",
    content:
      "We may collect account information such as your name, email address, organization name and login details. We may also process business information entered into SAMZY, including products, suppliers, customers, invoices, receipts, quotations, delivery documents, inventory records, pricing data, reports and workspace activity.",
  },
  {
    title: "4. Documents and AI Processing",
    content:
      "When users upload documents such as invoices, receipts, quotations or delivery notes, SAMZY may process those files using OCR and AI technologies to extract structured information. This processing is performed only to provide the requested platform functionality, such as creating products, updating inventory, comparing supplier prices or generating reports.",
  },
  {
    title: "5. Organization Data Isolation",
    content:
      "Each organization operates within its own protected workspace. Business data is separated by organization and access is restricted to authorized members of that organization. SAMZY does not intentionally share one customer’s private business data with another customer.",
  },
  {
    title: "6. How We Use Information",
    content:
      "We use information to provide and operate the SAMZY platform, authenticate users, manage organizations and workspaces, process uploaded documents, maintain products and inventory, generate reports, improve platform reliability, provide support and prevent misuse or security threats.",
  },
  {
    title: "7. Legal Basis for Processing",
    content:
      "Where applicable under data protection law, we process personal data because it is necessary to provide the service requested by the user, to fulfil contractual obligations, to comply with legal requirements, to protect legitimate business interests or because the user has provided consent.",
  },
  {
    title: "8. Service Providers",
    content:
      "SAMZY may use reputable infrastructure and technology providers to operate the platform. These may include providers for hosting, databases, authentication, document processing, email delivery, analytics and AI services. Providers are given access only to the information necessary to perform their services.",
  },
  {
    title: "9. Data Security",
    content:
      "We use reasonable technical and organizational safeguards to protect information, including secure authentication, encrypted connections, access controls, organization-level isolation and reputable infrastructure providers. No internet-based system can be guaranteed to be completely secure, but we work to reduce risk and respond appropriately to security issues.",
  },
  {
    title: "10. Data Retention",
    content:
      "We retain information for as long as necessary to provide the SAMZY service, maintain business records, comply with legal obligations, resolve disputes and enforce agreements. Users may request deletion of personal data, subject to any legal or operational retention requirements.",
  },
  {
    title: "11. Cookies and Local Storage",
    content:
      "SAMZY may use essential cookies and browser storage to keep users signed in, remember preferences, maintain language settings and record cookie consent. These technologies are required for core functionality. We may introduce optional analytics or performance tools in the future, subject to appropriate notice and consent requirements.",
  },
  {
    title: "12. Your Rights",
    content:
      "Depending on your location, you may have the right to access personal data, correct inaccurate information, request deletion, restrict or object to processing, withdraw consent and request data portability. You may contact us to exercise these rights.",
  },
  {
    title: "13. International Data Processing",
    content:
      "Some service providers used by SAMZY may process data outside your country. Where required, we use appropriate contractual, technical or legal safeguards for international data transfers.",
  },
  {
    title: "14. Children’s Privacy",
    content:
      "SAMZY is intended for business users and is not directed to children. We do not knowingly collect personal data from children through the platform.",
  },
  {
    title: "15. Changes to This Policy",
    content:
      "We may update this Privacy Policy as SAMZY evolves or as legal requirements change. Updates will be posted on this page with a revised effective date. Continued use of the service after an update indicates acceptance of the revised policy where permitted by law.",
  },
  {
    title: "16. Contact Us",
    content:
      "For privacy questions or requests, contact us at samzyaioperator@gmail.com.",
  },
];

export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: WHITE,
        color: BLACK,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif",
      }}
    >
      <nav
        style={{
          display: "flex",
          height: 64,
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${BORDER}`,
          padding: "0 40px",
        }}
      >
        <Link
          href="/landing"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
          }}
        >
          <Image
            src="/samzy-logo.png"
            alt="SAMZY"
            width={28}
            height={28}
            priority
          />

          <span
            style={{
              color: BLACK,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: -0.4,
            }}
          >
            SAMZY
          </span>
        </Link>

        <Link
          href="/landing"
          style={{
            color: MID_GRAY,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          ← Back to home
        </Link>
      </nav>

      <main
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "72px 24px 110px",
        }}
      >
        <p
          style={{
            marginBottom: 14,
            color: ORANGE,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          Legal
        </p>

        <h1
          style={{
            margin: "0 0 10px",
            color: BLACK,
            fontSize: 50,
            fontWeight: 900,
            letterSpacing: -2.7,
            lineHeight: 1,
          }}
        >
          Privacy Policy
        </h1>

        <p
          style={{
            marginBottom: 52,
            color: MID_GRAY,
            fontSize: 14,
          }}
        >
          Last updated: 2 August 2026
        </p>

        <div
          style={{
            borderRadius: 20,
            border: `1px solid ${BORDER}`,
            background: "#fafafa",
            padding: 24,
            marginBottom: 48,
          }}
        >
          <p
            style={{
              margin: 0,
              color: MID_GRAY,
              fontSize: 15,
              lineHeight: 1.75,
            }}
          >
            This policy explains how SAMZY handles personal and business
            information across its website and AI-powered business workspace.
          </p>
        </div>

        {sections.map((section, index) => (
          <section
            key={section.title}
            style={{
              marginBottom: 40,
              paddingBottom: 40,
              borderBottom:
                index < sections.length - 1
                  ? `1px solid ${BORDER}`
                  : "none",
            }}
          >
            <h2
              style={{
                margin: "0 0 12px",
                color: BLACK,
                fontSize: 20,
                fontWeight: 750,
                letterSpacing: -0.5,
              }}
            >
              {section.title}
            </h2>

            <p
              style={{
                margin: 0,
                color: MID_GRAY,
                fontSize: 15,
                lineHeight: 1.75,
              }}
            >
              {section.content}
            </p>
          </section>
        ))}
      </main>

      <footer
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          borderTop: `1px solid ${BORDER}`,
          padding: "24px 40px",
        }}
      >
        <span
          style={{
            color: MID_GRAY,
            fontSize: 12,
          }}
        >
          © 2026 SAMZY. Lisbon, Portugal.
        </span>

        <Link
          href="/terms"
          style={{
            color: MID_GRAY,
            fontSize: 12,
            textDecoration: "none",
          }}
        >
          Terms of Service
        </Link>
      </footer>
    </div>
  );
}