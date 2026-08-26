import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem("dukan_cookie_consent");
    if (!consented) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("dukan_cookie_consent", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="container max-w-6xl mx-auto py-4 px-4 flex items-center justify-between gap-4">
        <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
          Duken тек тіркелу және сессияны басқару үшін қажетті cookie файлдарын пайдаланады.{" "}
          <Link to="/privacy" className="underline hover:text-foreground transition-colors">Толығырақ</Link>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={accept}
            className="bg-foreground text-background px-4 py-2 text-[10px] font-mono uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            Қабылдау
          </button>
          <button onClick={accept} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
