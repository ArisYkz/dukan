import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLabels } from "@/hooks/useLabels";

const HeroSection = () => {
  const { LANDING } = useLabels();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-background">
      <div className="container relative z-10 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          {/* Critical LCP content - render immediately without animation delay */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-none border border-border bg-background font-mono text-xs tracking-wider uppercase mb-8 text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5" />
            {LANDING.TAGLINE}
          </span>

          {/* LCP Element: H1 should render immediately */}
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl tracking-tight leading-[1.05] text-foreground mb-6">
            {LANDING.HERO_TITLE_1}
            <br />
            <span className="font-heading font-bold italic" style={{ letterSpacing: '-0.02em', lineHeight: '1.2', color: 'hsl(28, 45%, 42%)' }}>{LANDING.HERO_TITLE_2}</span>.
          </h1>

          <p className="font-body text-muted-foreground text-lg md:text-xl max-w-xl mx-auto mb-12 leading-relaxed">
            {LANDING.HERO_DESC}
          </p>

          {/* Buttons can animate later - not critical for LCP */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 font-body text-sm tracking-wide px-8 h-12 rounded-none min-w-[180px]">
              <a href="/auth">
                {LANDING.OPEN_STORE}
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="font-body text-sm tracking-wide px-8 h-12 rounded-none border-foreground/20 hover:bg-foreground/5 min-w-[180px]" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              {LANDING.VIEW_FEATURES}
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
