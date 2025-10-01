import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();

// Export OTP functions
export { requestOTP, verifyOTP, cleanupExpiredOTPs } from './otp';

// Health check endpoint
export const health = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Trigger when a match is updated
export const onMatchUpdate = functions.firestore
  .document('matches/{matchId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const matchId = context.params.matchId;

    console.log(`Match ${matchId} updated`);

    // Check if score changed
    const scoreChanged = 
      before.score.home !== after.score.home || 
      before.score.away !== after.score.away;

    // Check if status changed to live
    const statusChangedToLive = 
      before.status !== 'live' && after.status === 'live';

    // Check if status changed to finished
    const statusChangedToFinished = 
      before.status !== 'finished' && after.status === 'finished';

    // Recalculate standings if match is finished
    if (statusChangedToFinished) {
      await recalculateStandings();
    }

    // Send FCM notification if score changed or match went live
    if (scoreChanged || statusChangedToLive) {
      await sendMatchNotification(matchId, after, scoreChanged, statusChangedToLive);
    }

    return null;
  });

// Recalculate standings for all teams
async function recalculateStandings() {
  console.log('Recalculating standings...');

  try {
    // Get all teams
    const teamsSnapshot = await db.collection('teams').get();
    const teams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get all finished matches
    const matchesSnapshot = await db.collection('matches')
      .where('status', '==', 'finished')
      .get();
    
    const finishedMatches = matchesSnapshot.docs.map(doc => doc.data());

    // Calculate standings for each team
    const standings = teams.map(team => {
      const teamMatches = finishedMatches.filter(match => 
        match.homeTeamId === team.id || match.awayTeamId === team.id
      );

      let matchesPlayed = teamMatches.length;
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;

      teamMatches.forEach(match => {
        const isHome = match.homeTeamId === team.id;
        const teamScore = isHome ? match.score.home : match.score.away;
        const opponentScore = isHome ? match.score.away : match.score.home;

        goalsFor += teamScore;
        goalsAgainst += opponentScore;

        if (teamScore > opponentScore) {
          wins++;
        } else if (teamScore === opponentScore) {
          draws++;
        } else {
          losses++;
        }
      });

      const goalDifference = goalsFor - goalsAgainst;
      const points = (wins * 3) + (draws * 1);

      return {
        teamId: team.id,
        team,
        matchesPlayed,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        goalDifference,
        points,
      };
    });

    // Sort by points, then goal difference, then goals for
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    // Update standings in Firestore
    await db.collection('standings').doc('current').set({
      standings,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Standings recalculated successfully');
  } catch (error) {
    console.error('Error recalculating standings:', error);
  }
}

// Send FCM notification for match updates
async function sendMatchNotification(
  matchId: string, 
  match: any, 
  scoreChanged: boolean, 
  statusChangedToLive: boolean
) {
  try {
    // Get all users who have enabled notifications
    const usersSnapshot = await db.collection('users')
      .where('notificationsEnabled', '==', true)
      .get();

    const tokens: string[] = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.fcmToken) {
        tokens.push(userData.fcmToken);
      }
    });

    if (tokens.length === 0) {
      console.log('No FCM tokens found');
      return;
    }

    let title = '';
    let body = '';

    if (statusChangedToLive) {
      title = 'Match Started!';
      body = `${match.homeTeam.name} vs ${match.awayTeam.name} is now live!`;
    } else if (scoreChanged) {
      title = 'Score Update!';
      body = `${match.homeTeam.name} ${match.score.home} - ${match.score.away} ${match.awayTeam.name}`;
    }

    if (title && body) {
      const message = {
        notification: {
          title,
          body,
        },
        data: {
          matchId,
          type: statusChangedToLive ? 'match_started' : 'score_update',
        },
        tokens,
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`Sent notification to ${response.successCount} devices`);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// HTTP function to manually recalculate standings
export const recalculateStandingsHttp = functions.https.onRequest(async (req, res) => {
  try {
    await recalculateStandings();
    res.json({ success: true, message: 'Standings recalculated' });
  } catch (error: any) {
    console.error('Error in recalculateStandingsHttp:', error);
    res.status(500).json({ success: false, error: error?.message || 'Internal server error' });
  }
});

// HTTP function to send test notification
export const sendTestNotification = functions.https.onRequest(async (req, res) => {
  try {
    const { title, body } = req.body;
    
    if (!title || !body) {
      res.status(400).json({ success: false, error: 'Title and body are required' });
      return;
    }

    // Get all users with FCM tokens
    const usersSnapshot = await db.collection('users')
      .where('fcmToken', '!=', null)
      .get();

    const tokens: string[] = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.fcmToken) {
        tokens.push(userData.fcmToken);
      }
    });

    if (tokens.length === 0) {
      res.json({ success: false, message: 'No FCM tokens found' });
      return;
    }

    const message = {
      notification: { title, body },
      tokens,
    };

    const response = await admin.messaging().sendMulticast(message);
    res.json({ 
      success: true, 
      message: `Sent to ${response.successCount} devices`,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error: any) {
    console.error('Error in sendTestNotification:', error);
    res.status(500).json({ success: false, error: error?.message || 'Internal server error' });
  }
});
