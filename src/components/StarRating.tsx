import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

const StarRating = ({ rating, maxStars = 5, size = 14, interactive = false, onRate }: StarRatingProps) => {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = i < Math.round(rating);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate?.(i + 1)}
            className={`p-0 border-0 bg-transparent ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}`}
          >
            <Star
              size={size}
              strokeWidth={1}
              className={`transition-colors ${filled ? "fill-foreground text-foreground" : "fill-transparent text-muted-foreground/30"}`}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
