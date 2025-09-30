import { NextRequest, NextResponse } from 'next/server';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// POST /api/user/register - Register a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, displayName, isAdmin = false } = body;

    if (!email || !displayName) {
      return NextResponse.json({ 
        error: 'Email and displayName are required' 
      }, { status: 400 });
    }

    const userData = {
      email,
      displayName,
      isAdmin,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'users'), userData);
    
    return NextResponse.json({ 
      success: true,
      message: 'User registered successfully',
      userId: docRef.id,
      user: {
        id: docRef.id,
        ...userData
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}
