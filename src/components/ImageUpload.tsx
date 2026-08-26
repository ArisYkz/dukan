import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { optimizeImage, formatBytes } from "@/lib/imageOptimizer";

interface ImageUploadProps {
  bucket: string;
  folder: string;
  value?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  accept?: string;
  className?: string;
  previewClass?: string;
}

const ImageUpload = ({
  bucket,
  folder,
  value,
  onUpload,
  onRemove,
  label = "Сурет жүктеу",
  accept = "image/*",
  className = "",
  previewClass = "w-full h-40 object-cover rounded-sm",
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{ original: string; optimized: string; savings: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Файл 10MB-дан аспауы керек");
      return;
    }

    setOptimizing(true);
    setCompressionStats(null);
    try {
      const { blob, fileName, originalSize, optimizedSize } = await optimizeImage(file);
      
      // Calculate compression ratio
      const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(0);
      setCompressionStats({
        original: formatBytes(originalSize),
        optimized: formatBytes(optimizedSize),
        savings: `${savings}%`,
      });
      
      setOptimizing(false);
      setUploading(true);

      // Show compression result
      toast.success(`✅ Image optimized: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (-${savings}%)`);

      const filePath = `${folder}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, { upsert: true, contentType: "image/webp" });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      onUpload(data.publicUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Жүктеу қатесі: " + message);
    } finally {
      setUploading(false);
      setOptimizing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      {value ? (
        <div className="relative group">
          <img src={value} alt="" className={previewClass} loading="lazy" />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || optimizing}
          className="w-full border border-dashed border-border rounded-sm p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-ring hover:text-foreground transition-colors disabled:opacity-50"
        >
          {(uploading || optimizing) ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs tracking-wide uppercase">
                {optimizing ? "🗜️ Оңтайландыру..." : "☁️ Жүктелуде..."}
              </span>
              {compressionStats && (
                <span className="text-[10px] text-muted-foreground">
                  {compressionStats.original} → {compressionStats.optimized} (-{compressionStats.savings})
                </span>
              )}
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span className="text-xs tracking-wide uppercase">{label}</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;
