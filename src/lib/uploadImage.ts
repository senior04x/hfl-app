import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { uploadImageToBase64 } from './cloudinary';

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
    throw new Error('Failed to upload image');
  }
};

// Backward compatibility
export const uploadImageToFirebase = uploadImageToBase64Service;
export const uploadImageToCloudinaryService = uploadImageToBase64Service;

export const pickImage = async (): Promise<string | null> => {
  try {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Permission to access media library was denied');
      return null;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, // Use full quality initially, we'll optimize later
    });

    if (!result.canceled && result.assets[0]) {
      // Optimize the picked image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [
          { resize: { width: 800 } }, // Resize to max width of 800px
        ],
        { 
          compress: 0.8, // Compress to 80% quality
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      
      return manipulatedImage.uri;
    }

    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
};

export const takePhoto = async (): Promise<string | null> => {
  try {
    // Request permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Permission to access camera was denied');
      return null;
    }

    // Take photo
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, // Use full quality initially, we'll optimize later
    });

    if (!result.canceled && result.assets[0]) {
      // Optimize the taken photo
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [
          { resize: { width: 800 } }, // Resize to max width of 800px
        ],
        { 
          compress: 0.8, // Compress to 80% quality
          format: ImageManipulator.SaveFormat.JPEG 
        }
      );
      
      return manipulatedImage.uri;
    }

    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
};
