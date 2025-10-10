import { Router } from 'express';
import { verifyPayload } from '../utils/security';

const router = Router();

router.get('/verify', async (req, res) => {
  const { data, hash } = req.query as { data?: string; hash?: string };
  if (!data || !hash) return res.status(400).json({ message: 'Missing data' });
  const payload = verifyPayload(data, hash);
  if (!payload) return res.status(400).json({ message: 'Invalid QR' });
  res.json({ valid: true, payload });
});

export default router;