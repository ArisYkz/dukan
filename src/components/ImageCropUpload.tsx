import { useState, useRef, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Upload, X, Loader2, Crop } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ERROR_CODES } from "@/lib/errorCodes";
import { optimizeImage, formatBytes, preprocessStoreImage } from "@/lib/imageOptimizer";
import { deleteStorageFile } from "@/lib/storageCleanup";
import { useLabels } from "@/hooks/useLabels";

interface ImageCropUploadProps {
  bucket: string;
  folder: string;
  value?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  label?: string;
  accept?: string;
  className?: string;
  previewClass?: string;
  aspectRatio?: number;
  maxWidth?: number;
  maxHeight?: number;
  imageType?: 'banner' | 'logo' | 'product';
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas error")); return; }
      ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
      // Output as PNG to preserve quality before optimization step
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Blob error"))),
        "image/png",
        1,
      );
    };
    image.onerror = () => reject(new Error("Image load error"));
    image.src = imageSrc;
  });
}

const ImageCropUpload = ({
  bucket,
  folder,
  value,
  onUpload,
  onRemove,
  label,
  accept = "image/*",
  className = "",
  previewClass = "w-full h-40 object-cover rounded-sm",
  aspectRatio,
  imageType = 'product',
}: ImageCropUploadProps) => {
  const { IMAGE_UPLOAD } = useLabels();
  const resolvedLabel = label ?? IMAGE_UPLOAD.LABEL;
  const [uploading, setUploading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${ERROR_CODES.IMG_001}: File must not exceed 10MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleCropConfirm = async () => {
    if (!cropSrc || !croppedArea) return;
    setOptimizing(true);
    try {
      // Step 1: Crop
      const croppedBlob = await getCroppedBlob(cropSrc, croppedArea);
      
      let blob: Blob;
      let fileName: string;
      let originalSize: number;
      let optimizedSize: number;

      // Step 2: Process based on image type
      if (imageType === 'banner' || imageType === 'logo') {
        // Use specialized preprocessing for banners/logos
        const croppedFile = new File([croppedBlob], 'cropped.png', { type: 'image/png' });
        const processedFile = await preprocessStoreImage(croppedFile, imageType);
        blob = processedFile;
        fileName = processedFile.name;
        originalSize = croppedBlob.size;
        optimizedSize = processedFile.size;
      } else {
        // Use standard optimization for product images
        const result = await optimizeImage(croppedBlob);
        blob = result.blob;
        fileName = result.fileName;
        originalSize = result.originalSize;
        optimizedSize = result.optimizedSize;
      }

      setOptimizing(false);
      setUploading(true);

      toast.success(`${formatBytes(originalSize)} → ${formatBytes(optimizedSize)}`);

      const filePath = `${folder}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, { upsert: true, contentType: "image/webp" });
      if (uploadError) throw uploadError;

      // Delete previous file if exists
      if (value) {
        try {
          await deleteStorageFile(value);
        } catch (err: unknown) {
          // Silently ignore deletion errors
          console.warn('Failed to delete old image:', err);
        }
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      onUpload(data.publicUrl);
      setCropSrc(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`${ERROR_CODES.IMG_002}: ${message}`);
    } finally {
      setUploading(false);
      setOptimizing(false);
    }
  };

  const handleRemove = async () => {
    if (value) {
      try {
        await deleteStorageFile(value);
      } catch (err: unknown) {
        console.warn('Failed to delete image on remove:', err);
      }
    }
    onRemove?.();
  };

  return (
    <div className={className}>
      {/* Crop modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-sm w-full max-w-lg overflow-hidden">
            <div className="relative h-72 md:h-96 bg-muted">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCropConfirm}
                  disabled={uploading || optimizing}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 text-sm tracking-wide uppercase rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {(uploading || optimizing) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crop className="w-4 h-4" />}
                  {optimizing ? IMAGE_UPLOAD.OPTIMIZING : uploading ? IMAGE_UPLOAD.UPLOADING : IMAGE_UPLOAD.CROP_UPLOAD}
                </button>
                <button
                  type="button"
                  onClick={() => setCropSrc(null)}
                  className="px-4 py-2.5 text-sm border border-border rounded-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {value ? (
        <div className="relative group">
          <img src={value} alt="" className={previewClass} loading="lazy" />
          {onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1.5 right-1.5 p-1.5 bg-muted-foreground/30 text-foreground/60 rounded-sm shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <X className="w-4 h-4" />
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
          <Upload className="w-5 h-5" />
          <span className="text-xs tracking-wide uppercase">{resolvedLabel}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ImageCropUpload;
