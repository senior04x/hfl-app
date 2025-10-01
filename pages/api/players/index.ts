// HFL Admin API - Players
import { NextApiRequest, NextApiResponse } from 'next';
import mongoService from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await mongoService.connect();

    switch (req.method) {
      case 'GET':
        const players = await mongoService.getPlayers();
        res.status(200).json({ success: true, data: players });
        break;

      case 'POST':
        const newPlayer = await mongoService.createPlayer(req.body);
        res.status(201).json({ success: true, data: newPlayer });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Players API error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    await mongoService.disconnect();
  }
}
