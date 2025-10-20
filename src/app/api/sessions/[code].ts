// src/pages/api/session/[code].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionByCode } from '../../../lib/sessions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing session code' });
  }

  const session = await getSessionByCode(code);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.status(200).json(session);
}

