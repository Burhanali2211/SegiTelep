import React, { memo } from 'react';
import { useAssetUrl } from '@/hooks/useAssetUrl';
import { ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssetThumbnailProps {
    assetId?: string;
    data?: string | Blob;
    className?: string;
}

export const AssetThumbnail = memo<AssetThumbnailProps>(({ assetId, data, className }) => {
    const { url, isLoading } = useAssetUrl(assetId, data as string); // Type cast as hook handles blob internally or we need to align types

    return (
        <div className={cn('relative bg-muted flex items-center justify-center overflow-hidden', className)}>
            {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/50" />
            ) : url ? (
                <img src={url} alt="" className="w-full h-full object-cover" />
            ) : (
                <ImageIcon className="w-3 h-3 text-muted-foreground/30" />
            )}
        </div>
    );
});

AssetThumbnail.displayName = 'AssetThumbnail';
