import { AlertTriangle } from "lucide-react";
import { SUPPORT_TELEGRAM } from "@/lib/format";
import { useLabels } from "@/hooks/useLabels";

interface BannedScreenProps {
  onLogout: () => void;
}

const BannedScreen = ({ onLogout }: BannedScreenProps) => {
  const { BANNED, ACTIONS } = useLabels();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="border border-border rounded-none p-12 max-w-md text-center space-y-4">
        <h1 className="font-mono text-2xl font-bold">{BANNED.TITLE}</h1>
        <p className="font-mono text-sm text-muted-foreground">{BANNED.DESCRIPTION}</p>
        <a href={SUPPORT_TELEGRAM} target="_blank" rel="noopener noreferrer" className="inline-block font-mono text-xs tracking-wide uppercase border border-border px-6 py-3 hover:bg-muted transition-colors">{BANNED.CONTACT_SUPPORT}</a>
        <button onClick={onLogout} className="block mx-auto font-mono text-xs text-muted-foreground hover:text-foreground transition-colors mt-4">{ACTIONS.LOGOUT}</button>
      </div>
    </div>
  );
};

export default BannedScreen;
