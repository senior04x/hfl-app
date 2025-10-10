import * as ImageManipulator from 'expo-image-manipulator';
import { uploadImageToBase64 } from '../lib/cloudinary';

export const uploadImageToBase64Service = async (uri: string, folder?: string): Promise<string> => {
  try {
    console.log('Starting upload to Base64:', uri);
    
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
    const base64Image = await uploadImageToBase64(manipulatedImage.uri, folder);
    
    console.log('Image uploaded successfully to Base64');
    return base64Image;
  } catch (error) {
    console.error('Error uploading image to Base64:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

// Backward compatibility
export const uploadImageToFirebase = uploadImageToBase64Service;
export const uploadImageToCloudinaryService = uploadImageToBase64Service;
