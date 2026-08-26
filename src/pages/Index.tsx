import LandingNavbar from "@/components/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import ManifestoSection from "@/components/landing/ManifestoSection";
import WorkflowSection from "@/components/landing/WorkflowSection";
import FAQSection from "@/components/landing/FAQSection";
import PricingSection from "@/components/landing/PricingSection";
import LandingFooter from "@/components/landing/LandingFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <HeroSection />
      <ManifestoSection />
      <WorkflowSection />
      <FAQSection />
      <PricingSection />
      <LandingFooter />
    </div>
  );
};

export default Index;
