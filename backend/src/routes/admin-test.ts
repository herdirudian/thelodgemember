import { Router } from 'express';

const router = Router();

// Simple test endpoint
router.get('/test', (req, res) => {
  console.log('🔍 Admin test endpoint hit!');
  res.json({ message: 'Admin test router is working!', timestamp: new Date().toISOString() });
});

// Benefits endpoint test
router.get('/benefits', (req, res) => {
  console.log('🔍 Admin benefits endpoint hit!');
  res.json({ message: 'Benefits endpoint working!', benefits: [] });
});

export default router;