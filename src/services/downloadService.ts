import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Downloads and saves/shares a PDF blob.
 * On Web, it uses the standard HTML5 a-tag download.
 * On Native (Android/iOS), it saves the file to the Cache directory and uses the Share API.
 */
export const downloadPdf = async (blob: Blob, filename: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Convert Blob to Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          } else {
            reject(new Error('Failed to convert blob to base64'));
          }
        };
        reader.readAsDataURL(blob);
      });

      // Write the file to the cache directory
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      // Open the share dialog for the user to save or share it
      await Share.share({
        title: filename,
        url: result.uri,
        dialogTitle: 'Save or Share Bill'
      });
    } catch (error) {
      console.error('Error saving or sharing PDF natively:', error);
      throw error;
    }
  } else {
    // Web implementation
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
};
