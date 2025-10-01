// HFL Admin API - Applications
import { NextApiRequest, NextApiResponse } from 'next';
import mongoService from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await mongoService.connect();

    switch (req.method) {
      case 'GET':
        const applications = await mongoService.getApplications();
        res.status(200).json({ success: true, data: applications });
        break;

      case 'POST':
        const newApplication = await mongoService.createApplication(req.body);
        res.status(201).json({ success: true, data: newApplication });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Applications API error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    await mongoService.disconnect();
  }
}
