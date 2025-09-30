import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// GET /api/user/profile - Get user profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    // Search for user by ID
    const usersSnapshot = await getDocs(
      query(collection(db, 'users'), where('id', '==', userId))
    );

    if (usersSnapshot.empty) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    const user = usersSnapshot.docs[0].data();
    const userDoc = usersSnapshot.docs[0];

    return NextResponse.json({
      id: userDoc.id,
      ...user,
      createdAt: user.createdAt?.toDate() || new Date(),
      updatedAt: user.updatedAt?.toDate() || new Date(),
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}
