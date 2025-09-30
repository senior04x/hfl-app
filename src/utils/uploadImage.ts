export const uploadImageToFirebase = async (uri: string, path: string): Promise<string> => {
  try {
    console.log('Starting upload:', uri, 'to path:', path);
    
    // For now, just return the original URI
    // This is a temporary solution to avoid Firebase Storage issues
    console.log('Using original URI as download URL:', uri);
    
    return uri;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};
