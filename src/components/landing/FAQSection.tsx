import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLabels } from "@/hooks/useLabels";

const FAQSection = () => {
  const { LANDING } = useLabels();
  const questions = (LANDING.FAQ_QUESTIONS as string[]) || [];
  const answers = (LANDING.FAQ_ANSWERS as string[]) || [];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (questions.length === 0) return null;

  return (
    <section className="py-24 md:py-32">
      <div className="container max-w-3xl">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="font-mono text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4 block">
            FAQ
          </span>
          <h2 className="font-heading text-3xl md:text-4xl tracking-tight text-foreground">
            {LANDING.FAQ_TITLE as string || "Frequently Asked Questions"}
          </h2>
        </motion.div>

        <div className="space-y-px">
          {questions.map((question, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="border border-border"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left bg-background hover:bg-muted/50 transition-colors"
                >
                  <span className="font-mono text-sm tracking-wide text-foreground">
                    {question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 pt-0 border-t border-border">
                        <p className="font-body text-sm text-muted-foreground leading-relaxed pt-4">
                          {answers[i]}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
