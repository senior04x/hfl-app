import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// POST /api/team-application - Create a new team application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      teamName, 
      foundedDate, 
      teamColor, 
      description, 
      contactPerson, 
      contactPhone, 
      contactEmail,
      status = 'pending' 
    } = body;

    if (!teamName || !contactPerson || !contactPhone) {
      return NextResponse.json({ 
        error: 'Team name, contact person and contact phone are required' 
      }, { status: 400 });
    }

    const applicationData = {
      teamName: teamName.trim(),
      foundedDate: foundedDate || '',
      teamColor: teamColor || '#3B82F6',
      description: description?.trim() || '',
      contactPerson: contactPerson.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail?.trim() || '',
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'teamApplications'), applicationData);
    
    console.log('Team application created:', docRef.id);
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...applicationData 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating team application:', error);
    return NextResponse.json({ error: 'Failed to create team application' }, { status: 500 });
  }
}

// GET /api/team-application - Get all team applications
export async function GET() {
  try {
    const { getDocs } = await import('firebase/firestore');
    const applicationsSnapshot = await getDocs(collection(db, 'teamApplications'));
    
    const applications = applicationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));

    return NextResponse.json(applications);
  } catch (error) {
    console.error('Error fetching team applications:', error);
    return NextResponse.json({ error: 'Failed to fetch team applications' }, { status: 500 });
  }
}

// PUT /api/team-application - Update team application status
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
    await updateDoc(doc(db, 'teamApplications', id), {
      status,
      updatedAt: new Date(),
    });

    // If approved, add the team to the teams collection
    if (status === 'approved') {
      try {
        // Get the application data
        const applicationDoc = await getDoc(doc(db, 'teamApplications', id));
        if (applicationDoc.exists()) {
          const applicationData = applicationDoc.data();
          
          // Create team data
          const teamData = {
            name: applicationData.teamName,
            foundedDate: applicationData.foundedDate || '',
            logo: applicationData.logo || '',
            color: applicationData.teamColor || '#3B82F6',
            description: applicationData.description || '',
            players: [], // Empty players array initially
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Add to teams collection
          const teamDocRef = await addDoc(collection(db, 'teams'), teamData);
          console.log('Team added to teams collection:', teamDocRef.id);
          
          // Send SMS notification
          try {
            const { smsService } = await import('@/lib/smsService');
            await smsService.sendApplicationApprovalSMS(
              applicationData.contactPhone,
              applicationData.teamName,
              'team'
            );
            console.log('SMS notification sent for team approval');
          } catch (smsError) {
            console.error('SMS notification failed:', smsError);
          }
          
          return NextResponse.json({ 
            id, 
            status,
            teamId: teamDocRef.id,
            updatedAt: new Date().toISOString(),
            message: 'Team application approved and added to teams collection'
          }, { status: 200 });
        }
      } catch (teamError) {
        console.error('Error adding team to teams collection:', teamError);
        // Still return success for the application update, but log the team error
        return NextResponse.json({ 
          id, 
          status,
          updatedAt: new Date().toISOString(),
          warning: 'Application updated but failed to add team to teams collection'
        }, { status: 200 });
      }
    }

    return NextResponse.json({ 
      id, 
      status,
      updatedAt: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating team application:', error);
    return NextResponse.json({ error: 'Failed to update team application' }, { status: 500 });
  }
}
