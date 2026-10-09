import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  showLabel = false,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const starSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-9 h-9',
  }[size];

  const displayVal = hoverValue !== null ? hoverValue : value;

  const getLabel = (val: number) => {
    switch (val) {
      case 5:
        return 'Rất hài lòng (5/5)';
      case 4:
        return 'Hài lòng (4/5)';
      case 3:
        return 'Bình thường (3/5)';
      case 2:
        return 'Chưa hài lòng (2/5)';
      case 1:
        return 'Rất kém (1/5)';
      default:
        return 'Chưa đánh giá';
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= displayVal;
          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              onClick={() => onChange && onChange(star)}
              onMouseEnter={() => !readOnly && setHoverValue(star)}
              onMouseLeave={() => !readOnly && setHoverValue(null)}
              className={`p-0.5 transition-transform duration-150 ${
                readOnly
                  ? 'cursor-default'
                  : 'cursor-pointer hover:scale-115 focus:outline-none'
              }`}
            >
              <Star
                className={`${starSizes} ${
                  filled
                    ? 'fill-[#FFD700] text-[#FFD700] drop-shadow-xs'
                    : 'text-neutral-300 hover:text-amber-200'
                } transition-colors`}
              />
            </button>
          );
        })}
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-neutral-600 mt-1">
          {getLabel(displayVal)}
        </span>
      )}
    </div>
  );
};
