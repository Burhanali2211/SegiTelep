import React, { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface QRCodeDisplayProps {
  url: string;
  size?: number;
  className?: string;
}

// Simple QR code generator using SVG
// This creates a basic QR-like pattern - for production use qrcode.react
export const QRCodeDisplay = memo<QRCodeDisplayProps>(({ 
  url, 
  size = 200,
  className 
}) => {
  // Generate a simple hash-based pattern for visual representation
  const pattern = useMemo(() => {
    const modules: boolean[][] = [];
    const moduleCount = 21; // Standard QR size
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    // Generate pattern based on hash
    for (let row = 0; row < moduleCount; row++) {
      modules[row] = [];
      for (let col = 0; col < moduleCount; col++) {
        // Position detection patterns (corners)
        const isPositionPattern = 
          (row < 7 && col < 7) ||
          (row < 7 && col >= moduleCount - 7) ||
          (row >= moduleCount - 7 && col < 7);
        
        if (isPositionPattern) {
          // Position pattern design
          const inOuter = row === 0 || row === 6 || col === 0 || col === 6 ||
                         (row < 7 && (col === moduleCount - 7 || col === moduleCount - 1)) ||
                         (col >= moduleCount - 7 && (row === 0 || row === 6)) ||
                         (row >= moduleCount - 7 && (col === 0 || col === 6));
          const inInner = (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
                         (row >= 2 && row <= 4 && col >= moduleCount - 5 && col <= moduleCount - 3) ||
                         (row >= moduleCount - 5 && row <= moduleCount - 3 && col >= 2 && col <= 4);
          modules[row][col] = inOuter || inInner;
        } else {
          // Data pattern based on position and hash
          const seed = (hash + row * moduleCount + col) % 100;
          modules[row][col] = seed > 45;
        }
      }
    }
    
    return modules;
  }, [url]);

  const moduleSize = size / pattern.length;

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rounded-lg bg-white p-2"
      >
        {pattern.map((row, rowIndex) =>
          row.map((cell, colIndex) =>
            cell ? (
              <rect
                key={`${rowIndex}-${colIndex}`}
                x={colIndex * moduleSize}
                y={rowIndex * moduleSize}
                width={moduleSize}
                height={moduleSize}
                fill="black"
              />
            ) : null
          )
        )}
      </svg>
      <p className="text-xs text-muted-foreground text-center max-w-[200px] break-all">
        {url}
      </p>
    </div>
  );
});

QRCodeDisplay.displayName = 'QRCodeDisplay';
