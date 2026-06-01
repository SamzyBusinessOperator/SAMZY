"use client";
import Image from "next/image";
import Link from "next/link";

const BLACK = "#1d1d1f";
const MID_GRAY = "#6e6e73";
const LIGHT_GRAY = "#f5f5f7";
const BORDER = "#d2d2d7";
const ORANGE = "#FC7800";
const WHITE = "#ffffff";

export default function Privacy() {
  return (
    <div style={{ fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, sans-serif", background: WHITE, color: BLACK, minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid " + BORDER, padding: "0 40px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/landing" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
          <Image src="/logo.png" alt="Samzy" width={22} height={22} />
          <span style={{ fontSize: 17, fontWeight: 700, color: BLACK }}>Samzy</span>
        </Link>
        <Link href="/landing" style={{ fontSize: 13, color: MID_GRAY, textDecoration: "none" }}>← Back</Link>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 100px" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: ORANGE, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 12 }}>Legal</p>
        <h1 style={{ fontSize: 48, fontWeight: 900, color: BLACK, letterSpacing: -2.5, margin: "0 0 8px" }}>Privacy Policy</h1>
        <p style={{ fontSize: 14, color: MID_GRAY, marginBottom: 48 }}>Last updated: 1 June 2026</p>

        {[
          {
            title: "1. Who We Are",
            content: "Samzy is a custom business software agency based in Lisbon, Portugal. We build private, branded software solutions for retail businesses and supermarkets. References to \"Samzy\", \"we\", \"us\", or \"our\" in this policy refer to Samzy and its operator."
          },
          {
            title: "2. What This Policy Covers",
            content: "This Privacy Policy applies to the Samzy agency website (samzyai.com) and describes how we handle any information collected through this website. This policy does not apply to software applications we build for individual clients — each client's application has its own separate privacy policy and data handling practices."
          },
          {
            title: "3. Information We Collect",
            content: "On our agency website (samzyai.com), we collect minimal information. When you contact us via email or WhatsApp, we receive your name, contact details, and the content of your message. We use this information solely to respond to your enquiry and discuss potential projects. We do not use tracking cookies, analytics tools, or advertising pixels on our website."
          },
          {
            title: "4. Client Software & Data Privacy",
            content: "When we build software for a business client, all data entered into that software (products, sales, suppliers, staff, pricing) belongs exclusively to that client. Each client's application runs on its own isolated database. No data is shared between different clients. Samzy does not sell, share, or use client business data for any purpose other than operating and maintaining the client's software."
          },
          {
            title: "5. How We Use Your Information",
            content: "We use contact information you provide to respond to enquiries, discuss project requirements, provide quotes, and communicate about projects we are working on together. We do not send marketing emails without your consent. We do not share your information with third parties."
          },
          {
            title: "6. Data Security",
            content: "We take data security seriously. Client applications are built with industry-standard security practices, isolated databases, and secure authentication. We use reputable infrastructure providers including Vercel (hosting) and Supabase (database) for client deployments, both of which maintain high security standards."
          },
          {
            title: "7. Data Retention",
            content: "Contact enquiry information is retained only as long as necessary to respond to and manage your enquiry. If a project does not proceed, we delete your contact details within 90 days. For active clients, data is retained for the duration of our working relationship and deleted upon request or contract termination."
          },
          {
            title: "8. Your Rights",
            content: "You have the right to request access to any personal data we hold about you, request correction of inaccurate data, request deletion of your data, and withdraw consent for data processing at any time. To exercise any of these rights, contact us at samzyaioperator@gmail.com."
          },
          {
            title: "9. Cookies",
            content: "The samzyai.com website does not use cookies for tracking or advertising. Client applications may use essential session cookies solely for authentication purposes — these are required for the app to function and cannot be disabled."
          },
          {
            title: "10. Changes to This Policy",
            content: "We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated date. Continued use of our website after changes constitutes acceptance of the updated policy."
          },
          {
            title: "11. Contact Us",
            content: "If you have any questions about this Privacy Policy or how we handle your data, please contact us at samzyaioperator@gmail.com."
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 40, paddingBottom: 40, borderBottom: i < 10 ? "1px solid " + BORDER : "none" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: BLACK, letterSpacing: -0.5, margin: "0 0 12px" }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: MID_GRAY, lineHeight: 1.7, margin: 0 }}>{section.content}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid " + BORDER, padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: MID_GRAY }}>© 2026 Samzy. Lisbon, Portugal.</span>
        <Link href="/terms" style={{ fontSize: 12, color: MID_GRAY, textDecoration: "none" }}>Terms of Service</Link>
      </footer>
    </div>
  );
}
