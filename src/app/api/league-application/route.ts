import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// POST /api/league-application - Create a new league application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      phone, 
      password,
      email,
      photo, 
      teamId, 
      teamName,
      position,
      number,
      status = 'pending' 
    } = body;

    if (!firstName || !lastName || !phone || !password || !teamId) {
      return NextResponse.json({ 
        error: 'First name, last name, phone, password and team ID are required' 
      }, { status: 400 });
    }

    const applicationData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      password: password.trim(),
      email: email?.trim() || '',
      photo: photo || '',
      teamId,
      teamName: teamName || '',
      position: position || '',
      number: number || 0,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'leagueApplications'), applicationData);
    
    console.log('League application created:', docRef.id);
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...applicationData 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating league application:', error);
    return NextResponse.json({ error: 'Failed to create league application' }, { status: 500 });
  }
}

// GET /api/league-application - Get all league applications
export async function GET() {
  try {
    const { getDocs } = await import('firebase/firestore');
    const applicationsSnapshot = await getDocs(collection(db, 'leagueApplications'));
    
    const applications = applicationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));

    return NextResponse.json(applications);
  } catch (error) {
    console.error('Error fetching league applications:', error);
    return NextResponse.json({ error: 'Failed to fetch league applications' }, { status: 500 });
  }
}

// PUT /api/league-application - Update league application status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required fields: id, status' }, { status: 400 });
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be pending, approved, or rejected' }, { status: 400 });
    }

    // Update the application status
    await updateDoc(doc(db, 'leagueApplications', id), {
      status,
      updatedAt: new Date(),
    });

    // If approved, add the player to the players collection
    if (status === 'approved') {
      try {
        // Get the application data
        const applicationDoc = await getDoc(doc(db, 'leagueApplications', id));
        if (applicationDoc.exists()) {
          const applicationData = applicationDoc.data();
          console.log('Application data:', applicationData);
          
          // Create player data with all fields from application
          const playerData = {
            firstName: applicationData.firstName || '',
            lastName: applicationData.lastName || '',
            phone: applicationData.phone || '',
            password: applicationData.password || '',
            email: applicationData.email || '',
            photo: applicationData.photo || '',
            teamId: applicationData.teamId || '',
            teamName: applicationData.teamName || '',
            position: applicationData.position || '',
            number: applicationData.number || 0,
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
            matchesPlayed: 0,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          console.log('Player data to be saved:', playerData);

          // Add to players collection
          const playerDocRef = await addDoc(collection(db, 'players'), playerData);
          console.log('Player added to players collection:', playerDocRef.id);
          
          // Send SMS notification
          try {
            const { smsService } = await import('@/lib/smsService');
            await smsService.sendApplicationApprovalSMS(
              applicationData.phone,
              `${applicationData.firstName} ${applicationData.lastName}`,
              'player'
            );
            console.log('SMS notification sent for player approval');
          } catch (smsError) {
            console.error('SMS notification failed:', smsError);
          }
          
          return NextResponse.json({ 
            id, 
            status,
            playerId: playerDocRef.id,
            updatedAt: new Date().toISOString(),
            message: 'Player application approved and added to players collection'
          }, { status: 200 });
        }
      } catch (playerError) {
        console.error('Error adding player to players collection:', playerError);
        // Still return success for the application update, but log the player error
        return NextResponse.json({ 
          id, 
          status,
          updatedAt: new Date().toISOString(),
          warning: 'Application updated but failed to add player to players collection'
        }, { status: 200 });
      }
    }

    return NextResponse.json({ 
      id, 
      status,
      updatedAt: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating league application:', error);
    return NextResponse.json({ error: 'Failed to update league application' }, { status: 500 });
  }
}