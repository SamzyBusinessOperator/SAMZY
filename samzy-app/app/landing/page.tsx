import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { ModulesSection } from "@/components/landing/ModulesSection";
import { SolutionsSection } from "@/components/landing/SolutionsSection";
import { TrustSection } from "@/components/landing/TrustSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fbfcff] text-[#07113b]">
      <LandingHeader />

      <main>
        <HeroSection />
        <HowItWorksSection />
        <ModulesSection />
        <SolutionsSection />
        <TrustSection />
        <FinalCtaSection />
      </main>

      <LandingFooter />
    </div>
  );
}