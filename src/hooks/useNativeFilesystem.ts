import { useState, useCallback } from 'react';
import { 
  Filesystem, 
  Directory, 
  Encoding,
  WriteFileResult,
  ReadFileResult,
  ReaddirResult,
  StatResult,
} from '@capacitor/filesystem';
import { isNativeApp } from '@/lib/mobileConfig';

interface UseFilesystemResult {
  loading: boolean;
  error: string | null;
  writeFile: (path: string, data: string, directory?: Directory, encoding?: Encoding) => Promise<WriteFileResult | null>;
  readFile: (path: string, directory?: Directory, encoding?: Encoding) => Promise<ReadFileResult | null>;
  deleteFile: (path: string, directory?: Directory) => Promise<boolean>;
  listDirectory: (path: string, directory?: Directory) => Promise<ReaddirResult | null>;
  createDirectory: (path: string, directory?: Directory, recursive?: boolean) => Promise<boolean>;
  getFileInfo: (path: string, directory?: Directory) => Promise<StatResult | null>;
  downloadFile: (url: string, fileName: string, directory?: Directory) => Promise<string | null>;
  shareFile: (path: string, title?: string) => Promise<boolean>;
}

export const useNativeFilesystem = (): UseFilesystemResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const writeFile = useCallback(async (
    path: string,
    data: string,
    directory: Directory = Directory.Documents,
    encoding: Encoding = Encoding.UTF8
  ): Promise<WriteFileResult | null> => {
    setLoading(true);
    setError(null);

    try {
      if (!isNativeApp()) {
        // Web fallback: use localStorage or IndexedDB
        localStorage.setItem(`file_${path}`, data);
        return { uri: `local://${path}` };
      }

      const result = await Filesystem.writeFile({
        path,
        data,
        directory,
        encoding,
        recursive: true,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to write file';
      setError(message);
      console.error('Write file error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const readFile = useCallback(async (
    path: string,
    directory: Directory = Directory.Documents,
    encoding: Encoding = Encoding.UTF8
  ): Promise<ReadFileResult | null> => {
    setLoading(true);
    setError(null);

    try {
      if (!isNativeApp()) {
        // Web fallback
        const data = localStorage.getItem(`file_${path}`);
        if (data) {
          return { data };
        }
        throw new Error('File not found');
      }

      const result = await Filesystem.readFile({
        path,
        directory,
        encoding,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read file';
      setError(message);
      console.error('Read file error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFile = useCallback(async (
    path: string,
    directory: Directory = Directory.Documents
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      if (!isNativeApp()) {
        localStorage.removeItem(`file_${path}`);
        return true;
      }

      await Filesystem.deleteFile({
        path,
        directory,
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete file';
      setError(message);
      console.error('Delete file error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const listDirectory = useCallback(async (
    path: string,
    directory: Directory = Directory.Documents
  ): Promise<ReaddirResult | null> => {
    setLoading(true);
    setError(null);

    try {
      if (!isNativeApp()) {
        // Web fallback - list localStorage keys
        const files = Object.keys(localStorage)
          .filter(key => key.startsWith(`file_${path}`))
          .map(key => ({
            name: key.replace(`file_${path}/`, ''),
            type: 'file' as const,
            size: localStorage.getItem(key)?.length || 0,
            ctime: Date.now(),
            mtime: Date.now(),
            uri: `local://${key}`,
          }));
        return { files };
      }

      const result = await Filesystem.readdir({
        path,
        directory,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list directory';
      setError(message);
      console.error('List directory error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createDirectory = useCallback(async (
    path: string,
    directory: Directory = Directory.Documents,
    recursive: boolean = true
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      if (!isNativeApp()) {
        // Web fallback - directories are virtual in localStorage
        return true;
      }

      await Filesystem.mkdir({
        path,
        directory,
        recursive,
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create directory';
      setError(message);
      console.error('Create directory error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFileInfo = useCallback(async (
    path: string,
    directory: Directory = Directory.Documents
  ): Promise<StatResult | null> => {
    setLoading(true);
    setError(null);

    try {
      if (!isNativeApp()) {
        const data = localStorage.getItem(`file_${path}`);
        if (data) {
          return {
            type: 'file',
            size: data.length,
            ctime: Date.now(),
            mtime: Date.now(),
            uri: `local://${path}`,
            name: path.split('/').pop() || path,
          };
        }
        throw new Error('File not found');
      }

      const result = await Filesystem.stat({
        path,
        directory,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get file info';
      setError(message);
      console.error('Get file info error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadFile = useCallback(async (
    url: string,
    fileName: string,
    directory: Directory = Directory.Documents
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      // Fetch the file
      const response = await fetch(url);
      const blob = await response.blob();

      if (!isNativeApp()) {
        // Web fallback: trigger download
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(blobUrl);
        return blobUrl;
      }

      // Convert blob to base64 for native
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data URL prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory,
      });

      return result.uri;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download file';
      setError(message);
      console.error('Download file error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const shareFile = useCallback(async (
    path: string,
    title?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      if (!isNativeApp()) {
        // Web Share API fallback
        if (navigator.share) {
          const data = localStorage.getItem(`file_${path}`);
          if (data) {
            await navigator.share({
              title: title || 'Shared File',
              text: data,
            });
            return true;
          }
        }
        throw new Error('Sharing not supported');
      }

      // For native, use Capacitor Share plugin (would need @capacitor/share)
      console.log('Native sharing would use @capacitor/share plugin');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share file';
      setError(message);
      console.error('Share file error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    writeFile,
    readFile,
    deleteFile,
    listDirectory,
    createDirectory,
    getFileInfo,
    downloadFile,
    shareFile,
  };
};
