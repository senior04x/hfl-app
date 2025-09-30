import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// POST /api/transfer-request - Create a new transfer request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      playerId, 
      currentTeamId, 
      currentTeamName, 
      newTeamId, 
      newTeamName,
      status = 'pending' 
    } = body;

    if (!playerId || !currentTeamId || !newTeamId) {
      return NextResponse.json({ 
        error: 'Player ID, current team ID and new team ID are required' 
      }, { status: 400 });
    }

    console.log('Creating transfer request:', body);

    const transferData = {
      playerId: playerId.trim(),
      currentTeamId: currentTeamId.trim(),
      currentTeamName: currentTeamName?.trim() || '',
      newTeamId: newTeamId.trim(),
      newTeamName: newTeamName?.trim() || '',
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'transferRequests'), transferData);
    
    console.log('Transfer request created:', docRef.id);
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...transferData 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating transfer request:', error);
    return NextResponse.json({ error: 'Failed to create transfer request' }, { status: 500 });
  }
}

// GET /api/transfer-request - Get all transfer requests
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching transfer requests...');

    const transferRequestsSnapshot = await getDocs(collection(db, 'transferRequests'));
    const transferRequests = transferRequestsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        playerId: data.playerId || '',
        currentTeamId: data.currentTeamId || '',
        currentTeamName: data.currentTeamName || '',
        newTeamId: data.newTeamId || '',
        newTeamName: data.newTeamName || '',
        status: data.status || 'pending',
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    });

    console.log('Transfer requests fetched:', transferRequests.length);
    return NextResponse.json(transferRequests);

  } catch (error) {
    console.error('Error fetching transfer requests:', error);
    return NextResponse.json({ error: 'Failed to fetch transfer requests' }, { status: 500 });
  }
}

// PUT /api/transfer-request - Update transfer request status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ 
        error: 'Transfer request ID and status are required' 
      }, { status: 400 });
    }

    console.log('Updating transfer request:', id, 'to status:', status);

    // Update transfer request status
    await updateDoc(doc(db, 'transferRequests', id), {
      status,
      updatedAt: new Date(),
    });

    // If approved, update player's team
    if (status === 'approved') {
      try {
        const transferDoc = await getDoc(doc(db, 'transferRequests', id));
        if (transferDoc.exists()) {
          const transferData = transferDoc.data();
          console.log('Transfer data:', transferData);
          
          // Update player's team in players collection
          await updateDoc(doc(db, 'players', transferData.playerId), {
            teamId: transferData.newTeamId,
            teamName: transferData.newTeamName,
            updatedAt: new Date(),
          });

          console.log('Player team updated successfully');
          
          return NextResponse.json({ 
            id, 
            status,
            updatedAt: new Date().toISOString(),
            message: 'Transfer request approved and player team updated'
          });
        }
      } catch (error) {
        console.error('Error updating player team:', error);
        return NextResponse.json({ error: 'Failed to update player team' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      id, 
      status,
      updatedAt: new Date().toISOString(),
      message: 'Transfer request status updated'
    });

  } catch (error) {
    console.error('Error updating transfer request:', error);
    return NextResponse.json({ error: 'Failed to update transfer request' }, { status: 500 });
  }
}
