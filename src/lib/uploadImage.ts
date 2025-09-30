export const uploadImageToFirebase = async (file: File, path: string): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }

    const data = await response.json();
    return data.downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
};
