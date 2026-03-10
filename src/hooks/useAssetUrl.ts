import { useState, useEffect } from 'react';
import { AssetManager } from '@/core/storage/AssetManager';
import { isTauriApp, convertPathToSrc, getAbsolutePath } from '@/core/storage/NativeStorage';

/**
 * Hook to resolve an assetId or data path to a usable URL.
 * Automatically handles Object URL revocation on unmount.
 */
export function useAssetUrl(assetId?: string, data?: string) {
    const [url, setUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(!!(assetId || data));

    useEffect(() => {
        let isMounted = true;

        const resolve = async () => {
            if (!assetId && !data) {
                if (isMounted) { setUrl(''); setIsLoading(false); }
                return;
            }
            setIsLoading(true);
            try {
                // 1. Try IDB via assetId
                if (assetId) {
                    const resolved = await AssetManager.getAssetUrl(assetId);
                    if (resolved) {
                        if (isMounted) setUrl(resolved);
                        return; // Done — no need to fall through
                    }
                }

                // 2. Fall back to data field
                if (data) {
                    if (data.startsWith('data:') || data.startsWith('blob:')) {
                        if (isMounted) setUrl(data);
                    } else if (isTauriApp()) {
                        // Native path — must convert to absolute before tauriConvertFileSrc
                        const fullPath = await getAbsolutePath(data);
                        const src = convertPathToSrc(fullPath);
                        if (isMounted) setUrl(src);
                    } else {
                        if (isMounted) setUrl(data);
                    }
                } else {
                    // assetId was given but not found in IDB, and no data fallback
                    if (isMounted) setUrl('');
                }
            } catch (error) {
                console.error('Failed to resolve asset URL:', error);
                if (isMounted) setUrl('');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        resolve();

        return () => {
            isMounted = false;
        };
    }, [assetId, data]);

    return { url, isLoading };
}

