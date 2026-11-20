import { useState } from 'react';
import { Shield } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#18181B] via-[#111114] to-[#1F1215] text-zinc-400 p-6 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Shield className="w-8 h-8 text-[#DC2626] mb-2 opacity-80" strokeWidth={1.75} />
        {fallbackTitle ? (
          <span className="text-xs font-medium text-zinc-300 text-center">
            {fallbackTitle}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
