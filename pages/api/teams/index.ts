// HFL Admin API - Teams
import { NextApiRequest, NextApiResponse } from 'next';
import mongoService from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await mongoService.connect();

    switch (req.method) {
      case 'GET':
        const teams = await mongoService.getTeams();
        res.status(200).json({ success: true, data: teams });
        break;

      case 'POST':
        const newTeam = await mongoService.createTeam(req.body);
        res.status(201).json({ success: true, data: newTeam });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Teams API error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    await mongoService.disconnect();
  }
}
