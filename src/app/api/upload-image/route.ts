import { NextRequest, NextResponse } from 'next/server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    console.log('Upload image API called');
    
    const body = await request.json();
    const { image, path } = body;

    console.log('Image base64 length:', image?.length, 'Path:', path);

    if (!image || !path) {
      console.log('Missing image or path');
      return NextResponse.json({ error: 'Image and path are required' }, { status: 400 });
    }

    // Convert base64 to buffer
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Create a reference to the file in Firebase Storage
    const storageRef = ref(storage, path);
    console.log('Storage ref created:', storageRef.fullPath);
    
    // Upload the buffer
    console.log('Starting upload...');
    const snapshot = await uploadBytes(storageRef, buffer);
    console.log('Upload completed:', snapshot.ref.fullPath);
    
    // Get the download URL
    console.log('Getting download URL...');
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Download URL:', downloadURL);
    
    return NextResponse.json({ 
      success: true, 
      downloadURL,
      path: snapshot.ref.fullPath 
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ 
      error: 'Failed to upload image',
      details: error.message 
    }, { status: 500 });
  }
}
