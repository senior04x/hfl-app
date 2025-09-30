import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// DELETE /api/cleanup - Clean up test data
export async function DELETE(request: NextRequest) {
  try {
    console.log('Starting cleanup of test data...');

    // Clean up test players
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const playerPromises = playersSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'players', docSnapshot.id))
    );
    await Promise.all(playerPromises);
    console.log('Test players cleaned up');

    // Clean up test teams
    const teamsSnapshot = await getDocs(collection(db, 'teams'));
    const teamPromises = teamsSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'teams', docSnapshot.id))
    );
    await Promise.all(teamPromises);
    console.log('Test teams cleaned up');

    // Clean up test applications
    const applicationsSnapshot = await getDocs(collection(db, 'leagueApplications'));
    const applicationPromises = applicationsSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'leagueApplications', docSnapshot.id))
    );
    await Promise.all(applicationPromises);
    console.log('Test applications cleaned up');

    // Clean up test team applications
    const teamApplicationsSnapshot = await getDocs(collection(db, 'teamApplications'));
    const teamApplicationPromises = teamApplicationsSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'teamApplications', docSnapshot.id))
    );
    await Promise.all(teamApplicationPromises);
    console.log('Test team applications cleaned up');

    // Clean up test transfer requests
    const transferRequestsSnapshot = await getDocs(collection(db, 'transferRequests'));
    const transferRequestPromises = transferRequestsSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'transferRequests', docSnapshot.id))
    );
    await Promise.all(transferRequestPromises);
    console.log('Test transfer requests cleaned up');

    console.log('All test data cleaned up successfully');
    
    return NextResponse.json({ 
      message: 'All test data cleaned up successfully',
      cleaned: {
        players: playersSnapshot.size,
        teams: teamsSnapshot.size,
        applications: applicationsSnapshot.size,
        teamApplications: teamApplicationsSnapshot.size,
        transferRequests: transferRequestsSnapshot.size
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error cleaning up test data:', error);
    return NextResponse.json({ 
      error: 'Failed to clean up test data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
