import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, Save, Key, Building, MapPin, Hash, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLabels } from "@/hooks/useLabels";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { StoreRow } from "@/types/store";

const KazPostSettings = ({ store }: { store: StoreRow }) => {
  const { KAZPOST, ACTIONS } = useLabels();
  const [apiKey, setApiKey] = useState("");
  const [deaNumber, setDeaNumber] = useState(store.kazpost_dea_number || "");
  const [deaDepCode, setDeaDepCode] = useState(store.kazpost_dea_depcode || "");
  const [senderBin, setSenderBin] = useState(store.kazpost_sender_bin || "");
  const [senderIndex, setSenderIndex] = useState(store.kazpost_sender_index || "");
  const [senderCity, setSenderCity] = useState(store.kazpost_sender_city || "");
  const [senderStreet, setSenderStreet] = useState(store.kazpost_sender_street || "");
  const [senderHouse, setSenderHouse] = useState(store.kazpost_sender_house || "");
  const [hasKey, setHasKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    supabase.rpc("check_store_has_kazpost_key", { p_store_id: store.id })
      .then(({ data }) => setHasKey(!!data))
      .catch(() => {});
  }, [store.id]);

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    const { error } = await supabase.functions.invoke("kazpost-store-key", {
      body: { storeId: store.id, apiKey: apiKey.trim() },
    });
    setSavingKey(false);
    if (error) {
      toast.error("Failed to save API key");
    } else {
      toast.success("KazPost API key saved");
      setHasKey(true);
      setApiKey("");
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    const { error } = await supabase
      .from("stores")
      .update({
        kazpost_dea_number: deaNumber || null,
        kazpost_dea_depcode: deaDepCode || null,
        kazpost_sender_bin: senderBin || null,
        kazpost_sender_index: senderIndex || null,
        kazpost_sender_city: senderCity || null,
        kazpost_sender_street: senderStreet || null,
        kazpost_sender_house: senderHouse || null,
      })
      .eq("id", store.id);
    setSavingConfig(false);
    if (error) {
      toast.error("Failed to save configuration");
    } else {
      toast.success("KazPost configuration saved");
    }
  };

  const inputClass =
    "w-full h-9 bg-transparent border border-border/50 rounded-none px-3 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/20 transition-all";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="rounded-none border border-border/40 bg-card p-5 md:p-6 space-y-5 transition-colors">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground/50" />
          <h3 className="text-xs md:text-sm font-semibold tracking-[0.2em] uppercase text-foreground opacity-90">{KAZPOST.TITLE}</h3>
          <Popover>
            <PopoverTrigger asChild>
              <button className="ml-0.5 p-0.5 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground/40 hover:text-muted-foreground" aria-label="Help">
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-72 p-4 rounded-none border-border text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-foreground/70">{KAZPOST.API_KEY}</h4>
                <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {(KAZPOST.API_KEY_HELP as string) || ""}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {hasKey && (
            <span className="text-xs font-medium text-[hsl(142,70%,40%)] uppercase tracking-wider ml-2">
              ● {KAZPOST.CONFIGURED}
            </span>
          )}
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Key className="w-3 h-3 text-muted-foreground/50" />
            <label className="text-sm font-medium text-foreground/60">{KAZPOST.API_KEY}</label>
          </div>
          <div className="flex gap-2">
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? KAZPOST.API_KEY_CHANGE : KAZPOST.API_KEY_PLACEHOLDER}
              className={`${inputClass} flex-1`}
              maxLength={32}
            />
            <button
              onClick={handleSaveKey}
              disabled={savingKey || !apiKey.trim()}
              className="px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded-none hover:opacity-90 transition-opacity disabled:opacity-30 flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              {savingKey ? ACTIONS.SAVING : KAZPOST.SAVE_KEY}
            </button>
          </div>
          <p className="text-xs text-muted-foreground/40">
            {KAZPOST.API_KEY_HINT}
          </p>
        </div>

        {/* DEA Number & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Hash className="w-3 h-3 text-muted-foreground/50" />
              <label className="text-sm font-medium text-foreground/60">{KAZPOST.DEA_NUMBER}</label>
            </div>
            <input value={deaNumber} onChange={(e) => setDeaNumber(e.target.value)} placeholder={KAZPOST.DEA_NUMBER_PLACEHOLDER} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Hash className="w-3 h-3 text-muted-foreground/50" />
              <label className="text-sm font-medium text-foreground/60">{KAZPOST.DEA_DEP_CODE}</label>
            </div>
            <input value={deaDepCode} onChange={(e) => setDeaDepCode(e.target.value)} placeholder={KAZPOST.DEA_DEP_CODE_PLACEHOLDER} className={inputClass} />
          </div>
        </div>

        {/* Sender Information */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Building className="w-3 h-3 text-muted-foreground/50" />
            <label className="text-sm font-medium text-foreground/60">{KAZPOST.SENDER_BIN}</label>
          </div>
          <input value={senderBin} onChange={(e) => setSenderBin(e.target.value)} placeholder={KAZPOST.SENDER_BIN_PLACEHOLDER} className={inputClass} maxLength={12} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-muted-foreground/50" />
            <label className="text-sm font-medium text-foreground/60">{KAZPOST.SENDER_ADDRESS}</label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input value={senderIndex} onChange={(e) => setSenderIndex(e.target.value)} placeholder={KAZPOST.SENDER_INDEX} className={inputClass} maxLength={6} />
            <input value={senderCity} onChange={(e) => setSenderCity(e.target.value)} placeholder={KAZPOST.SENDER_CITY} className={inputClass} />
            <input value={senderStreet} onChange={(e) => setSenderStreet(e.target.value)} placeholder={KAZPOST.SENDER_STREET} className={inputClass} />
            <input value={senderHouse} onChange={(e) => setSenderHouse(e.target.value)} placeholder={KAZPOST.SENDER_HOUSE} className={inputClass} />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="px-4 py-2 bg-foreground text-background text-xs font-medium rounded-none hover:opacity-90 transition-opacity disabled:opacity-30 flex items-center gap-1"
          >
            <Save className="w-3 h-3" />
            {savingConfig ? KAZPOST.SAVING : KAZPOST.SAVE_CONFIG}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default KazPostSettings;
