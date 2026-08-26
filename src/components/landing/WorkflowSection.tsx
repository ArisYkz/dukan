import { motion } from "framer-motion";
import { Store, ImagePlus, CreditCard, MessageSquare } from "lucide-react";
import { useLabels } from "@/hooks/useLabels";

const WorkflowSection = () => {
  const { LANDING } = useLabels();

  const steps = [
    { icon: Store, number: "01", title: LANDING.STEP_1_TITLE, description: LANDING.STEP_1_DESC },
    { icon: ImagePlus, number: "02", title: LANDING.STEP_2_TITLE, description: LANDING.STEP_2_DESC },
    { icon: CreditCard, number: "03", title: LANDING.STEP_3_TITLE, description: LANDING.STEP_3_DESC },
    { icon: MessageSquare, number: "04", title: LANDING.STEP_4_TITLE, description: LANDING.STEP_4_DESC },
  ];

  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16 md:mb-20">
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4 block">{LANDING.HOW_IT_WORKS}</span>
          <h2 className="font-heading text-3xl md:text-4xl tracking-tight text-foreground">{LANDING.FOUR_STEPS}</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <motion.div key={step.number} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }} className="relative text-center group">
              <span className="font-mono text-6xl font-bold text-border/70 group-hover:text-sage/20 transition-colors duration-500 block mb-4 select-none">{step.number}</span>
              <div className="inline-flex items-center justify-center w-10 h-10 border border-border rounded-full mb-4"><step.icon className="w-4 h-4 text-foreground" /></div>
              <h3 className="font-heading text-lg mb-2 text-foreground">{step.title}</h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
