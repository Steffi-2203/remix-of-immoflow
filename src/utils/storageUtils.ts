import { supabase } from '@/integrations/supabase/client';

/**
 * Generates a signed URL for a document stored in Supabase Storage.
 * Signed URLs expire after 1 hour for security.
 * 
 * @param bucket - The storage bucket name
 * @param filePath - The path to the file within the bucket
 * @returns The signed URL or null if generation fails
 */
export async function getSignedDocumentUrl(
  bucket: string,
  filePath: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getSignedDocumentUrl:', error);
    return null;
  }
}

/**
 * Extracts the file path from a Supabase storage URL for a given prefix.
 * 
 * @param fileUrl - The full URL of the file
 * @param prefix - The prefix to look for (e.g., 'property-docs/', 'unit-docs/')
 * @returns The file path including the prefix, or null if not found
 */
export function extractFilePath(fileUrl: string, prefix: string): string | null {
  const parts = fileUrl.split(`/${prefix}`);
  if (parts.length > 1) {
    return `${prefix}${parts[1]}`;
  }
  return null;
}
