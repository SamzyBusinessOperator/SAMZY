"use client";
import Image from "next/image";
import Link from "next/link";

const BLACK = "#1d1d1f";
const MID_GRAY = "#6e6e73";
const BORDER = "#d2d2d7";
const ORANGE = "#FC7800";
const WHITE = "#ffffff";

export default function Terms() {
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
        <h1 style={{ fontSize: 48, fontWeight: 900, color: BLACK, letterSpacing: -2.5, margin: "0 0 8px" }}>Terms of Service</h1>
        <p style={{ fontSize: 14, color: MID_GRAY, marginBottom: 48 }}>Last updated: 1 June 2026</p>

        {[
          {
            title: "1. Agreement to Terms",
            content: "By accessing samzyai.com or engaging Samzy for software development services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our website or services."
          },
          {
            title: "2. Services",
            content: "Samzy provides custom business software development services. We build private, branded software applications for retail businesses and supermarkets. Each client engagement is governed by a separate service agreement that outlines specific deliverables, timelines, and pricing. The samzyai.com website is a portfolio and contact platform only — no services are purchased directly through this website."
          },
          {
            title: "3. Custom Software Development",
            content: "Software built by Samzy for a client is custom-built for that client's specific needs. The client receives a fully operational software solution deployed on infrastructure in their name. Samzy retains ownership of the underlying codebase and framework, while the client owns their business data, their branding, and their specific configuration. Each client's software is entirely private and isolated from other clients."
          },
          {
            title: "4. Payment Terms",
            content: "Pricing for each project is agreed upon before work begins and outlined in a separate proposal or agreement. Monthly service fees (hosting, maintenance, and support) are due at the beginning of each month. Late payments may result in service suspension. All prices are in Euros (EUR) unless otherwise stated."
          },
          {
            title: "5. Client Responsibilities",
            content: "Clients are responsible for providing accurate business information required to build and configure their software, maintaining the security of their login credentials, ensuring their staff use the software appropriately, and notifying Samzy promptly of any issues or required changes."
          },
          {
            title: "6. Intellectual Property",
            content: "Samzy retains intellectual property rights over the software framework, codebase architecture, and development methodology. Clients own their business data, custom branding assets (logos, colors), and business-specific configurations. Clients may not reverse-engineer, resell, or redistribute the software built for them."
          },
          {
            title: "7. Data Ownership & Privacy",
            content: "All business data entered into a client's software application belongs entirely to that client. Samzy does not sell, share, or use client data for any purpose other than operating the client's software. Upon contract termination, clients may request a full export of their data. Data is deleted from our systems within 30 days of contract termination unless a longer retention period is legally required."
          },
          {
            title: "8. Service Availability",
            content: "We aim to maintain 99% uptime for all client applications. Scheduled maintenance will be communicated in advance. Samzy is not liable for downtime caused by third-party infrastructure providers (Vercel, Supabase) or events outside our reasonable control."
          },
          {
            title: "9. Limitation of Liability",
            content: "Samzy's liability to any client is limited to the monthly fees paid in the three months preceding any claim. We are not liable for indirect, incidental, or consequential damages, including loss of profits or business interruption, arising from use of our software."
          },
          {
            title: "10. Termination",
            content: "Either party may terminate a service agreement with 30 days written notice. Upon termination, the client's software will remain operational for the notice period. After termination, Samzy will provide a data export upon request and then permanently delete all client data from our systems."
          },
          {
            title: "11. Governing Law",
            content: "These Terms of Service are governed by the laws of Portugal. Any disputes arising from these terms or our services will be subject to the exclusive jurisdiction of the courts of Lisbon, Portugal."
          },
          {
            title: "12. Changes to Terms",
            content: "We may update these Terms of Service from time to time. Clients will be notified of material changes with at least 30 days notice. Continued use of our services after changes take effect constitutes acceptance of the updated terms."
          },
          {
            title: "13. Contact",
            content: "For any questions about these Terms of Service, please contact us at samzyaioperator@gmail.com."
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 40, paddingBottom: 40, borderBottom: i < 12 ? "1px solid " + BORDER : "none" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: BLACK, letterSpacing: -0.5, margin: "0 0 12px" }}>{section.title}</h2>
            <p style={{ fontSize: 15, color: MID_GRAY, lineHeight: 1.7, margin: 0 }}>{section.content}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid " + BORDER, padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: MID_GRAY }}>© 2026 Samzy. Lisbon, Portugal.</span>
        <Link href="/privacy" style={{ fontSize: 12, color: MID_GRAY, textDecoration: "none" }}>Privacy Policy</Link>
      </footer>
    </div>
  );
}
