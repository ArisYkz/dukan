import { useState, useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

const ZOOM = 2.5;
const LENS = 160;

const ProductGallery = ({ images, productName }: ProductGalleryProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  if (images.length === 0) {
    return (
      <div className="max-h-[50vh] aspect-square flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
          <ImageOff className="w-8 h-8" strokeWidth={1} />
          <span className="text-[10px] font-mono uppercase tracking-wider">No Image</span>
        </div>
      </div>
    );
  }

  if (images.length === 1) {
    return <ZoomableImage src={images[0]} alt={productName} />;
  }

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {images.map((img, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0">
              <ZoomableImage src={img} blurSrc={images[0]} alt={`${productName} ${i + 1}`} />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={scrollPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-background/70 backdrop-blur rounded-sm hover:bg-background/90 transition-colors z-10"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-background/70 backdrop-blur rounded-sm hover:bg-background/90 transition-colors z-10"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === selectedIndex ? "bg-foreground" : "bg-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

/** Single image with loading skeleton, fade-in, and cursor-following zoom lens */
const ZoomableImage = ({ src, alt, blurSrc }: { src: string; alt: string; blurSrc?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => { setStatus("loading"); }, [src]);

  const handleMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const half = LENS / 2;
    setLens({
      x: Math.min(Math.max(x, half), rect.width - half),
      y: Math.min(Math.max(y, half), rect.height - half),
    });
  }, []);

  const handleLeave = useCallback(() => setLens(null), []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center overflow-hidden cursor-crosshair min-h-[30vh]"
      onMouseMove={status === "loaded" ? handleMove : undefined}
      onMouseLeave={handleLeave}
    >
      {/* Blurred background — uses blurSrc (first image) if provided, else self */}
      <div className="absolute inset-0 scale-110" aria-hidden="true">
        <img
          src={blurSrc || src}
          alt=""
          className="w-full h-full object-cover blur-xl opacity-25"
        />
      </div>

      {/* Skeleton */}
      {status === "loading" && (
        <div className="absolute inset-0 bg-muted/30 animate-pulse" />
      )}

      {/* Error fallback */}
      {status === "error" && (
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/40 py-12">
          <ImageOff className="w-8 h-8" strokeWidth={1} />
          <span className="text-[10px] font-mono uppercase tracking-wider">Failed to load</span>
        </div>
      )}

      {/* Image */}
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[50vh] object-contain transition-all duration-700"
        style={{
          filter: status === "loaded" ? "blur(0)" : "blur(20px)",
          transform: status === "loaded" ? "scale(1)" : "scale(1.05)",
          opacity: status === "error" ? 0 : 1,
        }}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />

      {/* Zoom lens */}
      {lens && status === "loaded" && (
        <div
          className="absolute pointer-events-none border-2 border-white/60 shadow-lg"
          style={{
            width: LENS,
            height: LENS,
            left: lens.x - LENS / 2,
            top: lens.y - LENS / 2,
            backgroundImage: `url(${src})`,
            backgroundSize: `${ZOOM * 100}%`,
            backgroundPosition: `${(lens.x / (containerRef.current?.offsetWidth || 1)) * 100}% ${(lens.y / (containerRef.current?.offsetHeight || 1)) * 100}%`,
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
    </div>
  );
};

export default ProductGallery;
