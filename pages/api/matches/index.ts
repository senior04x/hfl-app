// HFL Admin API - Matches
import { NextApiRequest, NextApiResponse } from 'next';
import mongoService from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await mongoService.connect();

    switch (req.method) {
      case 'GET':
        const matches = await mongoService.getMatches();
        res.status(200).json({ success: true, data: matches });
        break;

      case 'POST':
        const newMatch = await mongoService.createMatch(req.body);
        res.status(201).json({ success: true, data: newMatch });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Matches API error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    await mongoService.disconnect();
  }
}
