import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export class ImageUploadService {
  /**
   * Upload an image to Firebase Storage
   * @param file - The image file to upload
   * @param path - The storage path (e.g., 'teams/logos', 'players/photos')
   * @param fileName - The file name (optional, will generate if not provided)
   * @returns Promise<string> - The download URL of the uploaded image
   */
  static async uploadImage(
    file: File | Blob,
    path: string,
    fileName?: string
  ): Promise<string> {
    try {
      // Generate unique filename if not provided
      const finalFileName = fileName || `${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const fullPath = `${path}/${finalFileName}`;
      
      // Create storage reference
      const storageRef = ref(storage, fullPath);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('Image uploaded successfully:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Upload a team logo
   * @param file - The image file
   * @param teamId - The team ID for unique naming
   * @returns Promise<string> - The download URL
   */
  static async uploadTeamLogo(file: File | Blob, teamId: string): Promise<string> {
    const fileName = `team_${teamId}_logo`;
    return this.uploadImage(file, 'teams/logos', fileName);
  }

  /**
   * Upload a player photo
   * @param file - The image file
   * @param playerId - The player ID for unique naming
   * @returns Promise<string> - The download URL
   */
  static async uploadPlayerPhoto(file: File | Blob, playerId: string): Promise<string> {
    const fileName = `player_${playerId}_photo`;
    return this.uploadImage(file, 'players/photos', fileName);
  }

  /**
   * Delete an image from Firebase Storage
   * @param imageUrl - The download URL of the image to delete
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract the path from the download URL
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      
      if (!pathMatch) {
        throw new Error('Invalid image URL format');
      }
      
      const imagePath = decodeURIComponent(pathMatch[1]);
      const imageRef = ref(storage, imagePath);
      
      await deleteObject(imageRef);
      console.log('Image deleted successfully:', imageUrl);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Validate image file
   * @param file - The file to validate
   * @param maxSizeInMB - Maximum file size in MB (default: 5MB)
   * @returns boolean - Whether the file is valid
   */
  static validateImageFile(file: File, maxSizeInMB: number = 5): boolean {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
    }

    // Check file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      throw new Error(`File size too large. Maximum size is ${maxSizeInMB}MB.`);
    }

    return true;
  }
}
