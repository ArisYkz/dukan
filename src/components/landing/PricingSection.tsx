import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLabels } from "@/hooks/useLabels";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const PricingSection = () => {
  const { LANDING } = useLabels();
  const [yearly, setYearly] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);
  const proPrice = yearly ? "150,000" : "15,000";
  const proPeriod = yearly ? LANDING.PER_YEAR : LANDING.PER_MONTH;

  const basicFeatures = (LANDING.BASIC_FEATURES as string[] | undefined) || ["Unlimited products", "Store customization", "Product categories", "No Telegram notifications"];
  const proFeatures = (LANDING.PRO_FEATURES as string[] | undefined) || ["All Free features", "Telegram notifications", "Kaspi payment verification"];
  const noTelegramText = (LANDING.NO_TELEGRAM as string) || "No Telegram notifications";

  return (
    <section className="py-24 md:py-32">
      <div className="container">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12 md:mb-16">
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4 block">{LANDING.PRICING}</span>
          <h2 className="font-heading text-3xl md:text-4xl tracking-tight text-foreground mb-8">{LANDING.SIMPLE_PRICING}</h2>
          <div className="inline-flex items-center gap-3 bg-card border border-border px-1.5 py-1.5 rounded-none">
            <button onClick={() => setYearly(false)} className={cn("px-5 py-2 font-mono text-xs tracking-wider transition-all", !yearly ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{LANDING.MONTHLY}</button>
            <button onClick={() => setYearly(true)} className={cn("px-5 py-2 font-mono text-xs tracking-wider transition-all relative", yearly ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
              {LANDING.YEARLY}
              <span className="absolute -top-2.5 -right-2 bg-sage text-sage-foreground text-[9px] font-mono px-1.5 py-0.5 tracking-wider">{LANDING.SAVE_2_MONTHS}</span>
            </button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-px bg-border max-w-3xl mx-auto">
          {/* Basic */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="bg-background p-8 md:p-12 flex flex-col">
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground mb-6">Basic</span>
            <div className="mb-8"><span className="font-heading text-4xl md:text-5xl text-foreground">{LANDING.FREE}</span></div>
            <ul className="space-y-4 mb-10 flex-1">
              {basicFeatures.map((f) => {
                const isNoTelegram = f === noTelegramText;
                return (
                  <li key={f} className={cn("flex items-start gap-3 text-sm font-body", isNoTelegram ? "text-destructive/70" : "text-muted-foreground")}>
                    {isNoTelegram ? (
                      <X className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                    ) : (
                      <Check className="w-4 h-4 mt-0.5 text-sage shrink-0" />
                    )}
                    {f}
                  </li>
                );
              })}
            </ul>
            <Button asChild variant="outline" className="w-full rounded-none h-12 font-mono text-xs tracking-wider border-foreground/20 hover:bg-foreground/5">
              <a href="/auth?plan=basic">{LANDING.GET_STARTED}</a>
            </Button>
          </motion.div>

          {/* Pro */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="bg-foreground text-background p-8 md:p-12 flex flex-col relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sage text-sage-foreground font-mono text-[10px] tracking-[0.15em] uppercase px-3 py-1">
              {LANDING.MOST_POPULAR || "Most Popular"}
            </span>
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-background/60 mb-6">Pro</span>
            <div className="mb-8">
              {yearly ? (
                <div className="space-y-1">
                  <span className="font-heading text-4xl md:text-5xl text-background">{proPrice} ₸</span>
                  <span className="font-body text-background/50 text-sm ml-2">/ {proPeriod}</span>
                  <div className="block text-xs font-mono text-sage mt-1 line-through text-background/40">15,000 ₸ / month</div>
                </div>
              ) : (
                <><span className="font-heading text-4xl md:text-5xl text-background">{proPrice} ₸</span><span className="font-body text-background/50 text-sm ml-2">/ {proPeriod}</span></>
              )}
            </div>
            {yearly && (<p className="font-mono text-xs text-sage mb-4 -mt-4">{LANDING.SAVE_2_MONTHS_LONG}</p>)}
            <ul className="space-y-4 mb-10 flex-1">
              {proFeatures.map((f) => (<li key={f} className="flex items-start gap-3 text-sm font-body text-background/70"><Check className="w-4 h-4 mt-0.5 text-sage shrink-0" />{f}</li>))}
            </ul>
            <Button asChild className="w-full rounded-none h-12 font-mono text-xs tracking-wider bg-background text-foreground hover:bg-background/90">
              <a href={user ? "/dashboard?tab=billing" : "/auth?tab=billing"} className="flex items-center justify-center gap-2">{LANDING.CHOOSE_PRO}</a>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
