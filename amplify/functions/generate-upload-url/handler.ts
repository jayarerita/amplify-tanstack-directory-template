import type { Handler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface GenerateUploadUrlEvent {
  fileName: string;
  fileType: string;
  folder: 'listings' | 'avatars' | 'ads';
  userId?: string;
}

export interface GenerateUploadUrlResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME;

export const handler: Handler<GenerateUploadUrlEvent, GenerateUploadUrlResult> = async (event) => {
  console.log('Generate upload URL event:', JSON.stringify(event, null, 2));

  try {
    const { fileName, fileType, folder, userId } = event;

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (!allowedTypes.includes(fileType)) {
      throw new Error(`File type ${fileType} is not allowed`);
    }

    // Generate unique file key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `${folder}/${userId || 'anonymous'}/${timestamp}-${randomString}-${sanitizedFileName}`;

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
      Metadata: {
        'uploaded-by': userId || 'anonymous',
        'upload-timestamp': timestamp.toString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

    // Generate public URL (will be accessible after upload)
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    return {
      uploadUrl,
      fileKey,
      publicUrl,
    };
  } catch (error) {
    console.error('Generate upload URL error:', error);
    throw error;
  }
};