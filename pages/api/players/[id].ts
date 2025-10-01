// HFL Admin API - Player by ID
import { NextApiRequest, NextApiResponse } from 'next';
import mongoService from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await mongoService.connect();
    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        const player = await mongoService.getPlayerById(id as string);
        if (!player) {
          return res.status(404).json({ success: false, error: 'Player not found' });
        }
        res.status(200).json({ success: true, data: player });
        break;

      case 'PUT':
        const updatedPlayer = await mongoService.updatePlayer(id as string, req.body);
        res.status(200).json({ success: true, data: updatedPlayer });
        break;

      case 'DELETE':
        await mongoService.deletePlayer(id as string);
        res.status(200).json({ success: true, message: 'Player deleted' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Player API error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    await mongoService.disconnect();
  }
}
