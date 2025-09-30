import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();

// Trigger when a match is updated to recalculate player statistics
export const onMatchUpdate = functions.firestore
  .document('matches/{matchId}')
  .onWrite(async (change, context) => {
    const matchId = context.params.matchId;
    const before = change.before.data();
    const after = change.after.data();

    // Only process if match data actually changed
    if (before && after && JSON.stringify(before) === JSON.stringify(after)) {
      return null;
    }

    if (!after) {
      // Match was deleted, we might want to handle this case
      return null;
    }

    const { seasonId, events = [] } = after;

    try {
      // Get all players involved in this match
      const playersInMatch = new Set<string>();
      
      // Extract player IDs from events
      events.forEach((event: any) => {
        if (event.playerId) {
          playersInMatch.add(event.playerId);
        }
        if (event.substitutePlayerId) {
          playersInMatch.add(event.substitutePlayerId);
        }
      });

      // Recalculate statistics for each player
      for (const playerId of playersInMatch) {
        await recalculatePlayerStats(seasonId, playerId);
      }

      // Log the update
      await db.collection('adminLogs').add({
        action: 'match_updated',
        matchId,
        seasonId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: 'system',
        details: `Statistics recalculated for ${playersInMatch.size} players`
      });

    } catch (error) {
      console.error('Error recalculating stats for match:', matchId, error);
      throw error;
    }
  });

// Helper function to recalculate player statistics
async function recalculatePlayerStats(seasonId: string, playerId: string) {
  try {
    // Get all matches for this season
    const matchesSnapshot = await db
      .collection('matches')
      .where('seasonId', '==', seasonId)
      .get();

    let gamesPlayed = 0;
    let goals = 0;
    let assists = 0;
    let yellowCards = 0;
    let redCards = 0;
    let minutesPlayed = 0;

    // Process each match
    for (const matchDoc of matchesSnapshot.docs) {
      const match = matchDoc.data();
      const events = match.events || [];

      // Check if player was involved in this match
      const playerInMatch = events.some((event: any) => 
        event.playerId === playerId || event.substitutePlayerId === playerId
      );

      if (playerInMatch) {
        gamesPlayed++;

        // Process events for this player
        for (const event of events) {
          if (event.playerId === playerId) {
            switch (event.type) {
              case 'goal':
                goals++;
                break;
              case 'assist':
                assists++;
                break;
              case 'yellow_card':
                yellowCards++;
                break;
              case 'red_card':
                redCards++;
                break;
            }
          }
        }

        // Calculate minutes played (simplified - assumes 90 minutes if player was in match)
        minutesPlayed += 90;
      }
    }

    // Update or create statistics document
    const statsRef = db.collection('statistics').doc(`${seasonId}_${playerId}`);
    await statsRef.set({
      seasonId,
      playerId,
      gamesPlayed,
      goals,
      assists,
      yellowCards,
      redCards,
      minutesPlayed,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

  } catch (error) {
    console.error(`Error recalculating stats for player ${playerId}:`, error);
    throw error;
  }
}

// Function to send notifications
export const sendNotification = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { title, body, topic } = data;

  const message = {
    notification: {
      title,
      body,
    },
    topic: topic || 'all',
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending message:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send notification');
  }
});

