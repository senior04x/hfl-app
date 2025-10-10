import * as ImageManipulator from 'expo-image-manipulator';
import { uploadImageToBase64, deleteImageFromBase64 } from '../lib/cloudinary';

// React Native compatible image upload service
// This service handles image uploads for React Native apps using Base64

export class ImageUploadService {
  /**
   * Upload an image to Base64 (for React Native)
   * @param uri - The image URI from React Native
   * @param folder - The folder path (optional, for backward compatibility)
   * @param publicId - The public ID (optional, for backward compatibility)
   * @returns Promise<string> - The base64 string of the uploaded image
   */
  static async uploadImage(
    uri: string,
    folder?: string,
    publicId?: string
  ): Promise<string> {
    try {
      console.log('Image upload requested to Base64:', { uri, folder, publicId });
      
      // Optimize image with expo-image-manipulator
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 800 } }, // Resize to max width of 800px
        ],
        { 
          compress: 0.8, // Compress to 80% quality
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );

      // Convert to Base64
      const base64Image = await uploadImageToBase64(manipulatedImage.uri, folder, publicId);
      
      console.log('Image uploaded successfully to Base64');
      return base64Image;
    } catch (error) {
      console.error('Error uploading image to Base64:', error);
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Upload a team logo
   * @param uri - The image URI
   * @param teamId - The team ID
   * @returns Promise<string> - The base64 string
   */
  static async uploadTeamLogo(uri: string, teamId: string): Promise<string> {
    return this.uploadImage(uri, 'teams/logos');
  }

  /**
   * Upload a player photo
   * @param uri - The image URI
   * @param playerId - The player ID
   * @returns Promise<string> - The base64 string
   */
  static async uploadPlayerPhoto(uri: string, playerId: string): Promise<string> {
    return this.uploadImage(uri, 'players/photos');
  }

  /**
   * Delete an image from Base64 storage
   * @param imageUrl - The image URL to delete (base64 string)
   * @returns Promise<void>
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      console.log('Image deletion requested from Base64 storage:', imageUrl);
      
      // Base64 rasmlar MongoDB'da saqlanadi, shuning uchun alohida o'chirish kerak emas
      // MongoDB'dan o'chirilganda rasm ham o'chiriladi
      await deleteImageFromBase64(imageUrl);
      console.log('Image deleted successfully from Base64 storage');
    } catch (error) {
      console.error('Error deleting image from Base64 storage:', error);
      throw new Error('Failed to delete image');
    }
  }

  /**
   * Validate image file (React Native version)
   * @param uri - The image URI
   * @param maxSizeInMB - Maximum size in MB
   * @returns boolean - Whether the file is valid
   */
  static validateImageFile(uri: string, maxSizeInMB: number = 5): boolean {
    try {
      // Basic validation for React Native
      if (!uri || typeof uri !== 'string') {
        return false;
      }

      // Check if it's a valid URI
      if (!uri.startsWith('file://') && !uri.startsWith('content://') && !uri.startsWith('http')) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating image file:', error);
      return false;
    }
  }
}