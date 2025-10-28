import express from 'express';
import { getXenditService } from '../utils/xenditService';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Xendit webhook endpoint for payment notifications
 */
router.post('/xendit', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-callback-token'] as string;
    const payload = req.body;

    if (!signature) {
      return res.status(400).json({ error: 'Missing webhook signature' });
    }

    // Verify webhook signature
    const xenditService = await getXenditService();
    const isValid = await xenditService.verifyWebhookSignature(payload, signature, process.env.XENDIT_WEBHOOK_TOKEN || '');

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook payload
    const webhookData = JSON.parse(payload.toString());
    console.log('Xendit webhook received:', webhookData);

    // Process webhook
    const result = await xenditService.processWebhook(webhookData);

    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      console.error('Webhook processing failed:', result.error);
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Test webhook endpoint (for development)
 */
router.post('/xendit/test', async (req, res) => {
  try {
    const { invoiceId, status, externalId } = req.body;

    if (!invoiceId || !status || !externalId) {
      return res.status(400).json({ 
        error: 'Missing required fields: invoiceId, status, externalId' 
      });
    }

    // Simulate webhook payload
    const webhookData = {
      id: invoiceId,
      external_id: externalId,
      status: status.toUpperCase(),
      paid_at: status.toLowerCase() === 'paid' ? new Date().toISOString() : null,
      payment_method: 'BANK_TRANSFER',
      payment_channel: 'BCA',
      payment_destination: '1234567890',
      amount: 100000,
      currency: 'IDR',
    };

    const xenditService = await getXenditService();
    const result = await xenditService.processWebhook(webhookData);

    if (result.success) {
      res.status(200).json({ 
        success: true, 
        message: 'Test webhook processed successfully',
        payment: result.payment 
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    console.error('Test webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;