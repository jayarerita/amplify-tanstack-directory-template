import { useState, useCallback } from 'react';
import { generateUploadUrl } from '~/lib/server-functions';

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = useCallback(async (
    file: File, 
    folder: 'listings' | 'avatars' | 'ads'
  ): Promise<string | null> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not allowed. Please use JPG, PNG, WebP, or GIF.`);
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 10MB.');
      }

      // Step 1: Get presigned URL from our server function
      const uploadData = await generateUploadUrl({
        fileName: file.name,
        fileType: file.type,
        folder,
      });

      // Step 2: Upload file directly to S3 using presigned URL
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }

      return uploadData.publicUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      console.error('File upload error:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const uploadMultipleFiles = useCallback(async (
    files: FileList,
    folder: 'listings' | 'avatars' | 'ads'
  ): Promise<string[]> => {
    const uploadPromises = Array.from(files).map(file => uploadFile(file, folder));
    const results = await Promise.all(uploadPromises);
    return results.filter(url => url !== null) as string[];
  }, [uploadFile]);

  return {
    uploadFile,
    uploadMultipleFiles,
    isUploading,
    uploadError,
    clearError: () => setUploadError(null),
  };
};