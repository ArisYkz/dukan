import { motion } from "framer-motion";
import { ShieldCheck, Users, Zap } from "lucide-react";
import { useLabels } from "@/hooks/useLabels";

const ManifestoSection = () => {
  const { LANDING } = useLabels();

  const values = [
    { icon: ShieldCheck, title: LANDING.NO_COMMISSION, description: LANDING.NO_COMMISSION_DESC },
    { icon: Users, title: LANDING.DIRECT_SALES, description: LANDING.DIRECT_SALES_DESC },
    { icon: Zap, title: LANDING.DIGITAL_PRESENCE, description: LANDING.DIGITAL_PRESENCE_DESC },
  ];

  return (
    <section id="features" className="py-24 md:py-32 bg-surface-warm border-t border-b border-border">
      <div className="container">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="max-w-2xl mx-auto text-center mb-16 md:mb-20">
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4 block">{LANDING.OUR_PRINCIPLES}</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl tracking-tight text-foreground leading-[1.1]">{(LANDING.NO_COMMISSION_DESC as string).split('.')[0]}.</h2>
          <p className="font-body text-muted-foreground mt-6 text-base md:text-lg leading-relaxed max-w-lg mx-auto">{LANDING.DIGITAL_PRESENCE_DESC}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-px bg-border max-w-4xl mx-auto">
          {values.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }} className="bg-background p-8 md:p-10 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-sage/10 text-sage mb-6"><item.icon className="w-5 h-5" /></div>
              <h3 className="font-heading text-lg md:text-xl mb-3 text-foreground">{item.title}</h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ManifestoSection;
