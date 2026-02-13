import { useCallback } from 'react';

export function useImageProcessing(addPage: (data: string | Blob, isPDF?: boolean) => Promise<void>) {
  const processImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) {
          reject(new Error('Failed to read file'));
          return;
        }
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);
          const normalizedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve(normalizedDataUrl);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const processedData = await processImage(file);
        await addPage(processedData, false); // false for regular images
      } catch (error) {
        console.error('Failed to process image:', error);
        const reader = new FileReader();
        reader.onload = async (event) => {
          const data = event.target?.result as string;
          if (data) await addPage(data, false); // false for regular images
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  }, [addPage, processImage]);

  return { processImage, handleFileChange };
}
