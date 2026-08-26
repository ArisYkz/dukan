import { motion } from "framer-motion";
import { useLabels } from "@/hooks/useLabels";

interface StoreCreationFormProps {
  storeForm: { name: string; slug: string; instagram: string };
  setStoreForm: (form: { name: string; slug: string; instagram: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const StoreCreationForm = ({ storeForm, setStoreForm, onSubmit }: StoreCreationFormProps) => {
  const { STORE_CREATION, ACTIONS } = useLabels();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <h1 className="font-mono text-3xl text-center mb-8">{STORE_CREATION.TITLE}</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">{STORE_CREATION.STORE_NAME}</label>
            <input value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
          </div>
          <div>
            <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1.5 block">{STORE_CREATION.INSTAGRAM}</label>
            <input value={storeForm.instagram} onChange={(e) => setStoreForm({ ...storeForm, instagram: e.target.value })} placeholder="@username" className="w-full border border-border bg-transparent px-3 py-2.5 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground py-3 text-sm tracking-wide uppercase rounded-sm hover:opacity-90 transition-opacity active:scale-[0.98]">
            {ACTIONS.CREATE}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default StoreCreationForm;
