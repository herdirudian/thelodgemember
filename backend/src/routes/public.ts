import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { signPayloadWithFriendlyCode } from '../utils/security';
import { generateQRDataURL } from '../utils/qr';
import { config } from '../config';
import { sendEmail } from '../utils/email';

const router = express.Router();
const prisma = new PrismaClient();

// Default Event config (fallback)
const DEFAULT_EVENT_NAME = 'Climate Coustic 2.0';
const DEFAULT_QUOTA = Number(process.env.CLIMATE_COUSTIC_QUOTA ?? 100); // default 100

// Helper: ambil judul & kuota acara dari Settings (jika ada)
async function getIntimateEventSettings() {
  try {
    const rows: any = await prisma.$queryRawUnsafe(`SELECT intimateEventTitle, intimateEventQuota FROM Settings ORDER BY updatedAt DESC LIMIT 1`);
    if (Array.isArray(rows) && rows.length) {
      const row = rows[0] || {};
      const title = row.intimateEventTitle || DEFAULT_EVENT_NAME;
      const quotaRaw = row.intimateEventQuota;
      const quotaNum = typeof quotaRaw === 'number' ? quotaRaw : Number(quotaRaw);
      const quota = Number.isFinite(quotaNum) ? quotaNum : DEFAULT_QUOTA;
      return { title, quota };
    }
  } catch {}
  return { title: DEFAULT_EVENT_NAME, quota: DEFAULT_QUOTA };
}

// Basic rate limit to prevent spam
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(limiter);

const RegistrationSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  quantity: z.number().int().min(1).max(1).optional(),
  notes: z.string().optional(),
});

router.get('/intimate/register/availability', async (_req, res) => {
  try {
    const { title, quota } = await getIntimateEventSettings();
    const count = await prisma.publicRegistration.count({ where: { eventName: title } });
    const remaining = Math.max(quota - count, 0);
    return res.json({ event: title, quota, registered: count, remaining });
  } catch (err) {
    console.error('Availability error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/intimate/register', async (req, res) => {
  if (req.headers['content-type'] !== 'application/json') {
    return res.status(400).json({ message: 'Invalid JSON' });
  }
  try {
    const parsed = RegistrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Data tidak valid', errors: parsed.error.flatten() });
    }
    const data = parsed.data;

    // Settings untuk event
    const { title: EVENT_NAME, quota: QUOTA } = await getIntimateEventSettings();

    // Quantity is fixed to 1 per person
    const quantity = 1;

    // Check quota
    const currentCount = await prisma.publicRegistration.count({ where: { eventName: EVENT_NAME } });
    if (currentCount >= QUOTA) {
      return res.status(409).json({ message: 'Maaf, kuota pendaftaran sudah penuh.' });
    }

    // Ensure unique by email and phone for this event
    const existing = await prisma.publicRegistration.findFirst({
      where: {
        eventName: EVENT_NAME,
        OR: [
          { email: data.email },
          { phone: data.phone },
        ],
      },
    });
    if (existing) {
      return res.status(409).json({ message: 'Email atau nomor HP sudah terdaftar untuk acara ini.' });
    }

    const created = await prisma.publicRegistration.create({
      data: {
        eventName: EVENT_NAME,
        name: data.name,
        email: data.email,
        phone: data.phone,
      },
    });

    // Generate E-Voucher (QR + Friendly Code)
    const payload = {
      type: 'public_registration',
      registrationId: created.id,
      eventName: EVENT_NAME,
      name: created.name,
      email: created.email,
      phone: created.phone,
    };
    const { data: qrData, hash, friendlyCode } = signPayloadWithFriendlyCode(payload);
    const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(qrData)}&hash=${hash}`;
    const qrDataURL = await generateQRDataURL(qrUrl);

    // Persist friendly code and QR payload hash for code-based redeem compatibility
    try {
      await prisma.publicRegistration.update({
        where: { id: created.id },
        data: { friendlyCode, qrPayloadHash: hash },
      });
    } catch (persistError) {
      console.error('Persist friendlyCode for public registration failed:', persistError);
      // Lanjutkan pengiriman email meskipun persist gagal
    }

    // Send e-voucher email
    try {
      const subject = `E-Voucher Pra-Registrasi: ${EVENT_NAME}`;
      const qrBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64');
      const attachments = [{ filename: 'qr-code.png', content: qrBuffer, cid: 'qrcode' }];
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #0F4D39;">Terima Kasih Telah Melakukan Pra-Registrasi</h2>
          <p>Halo ${created.name},</p>
          <p>Pendaftaran Anda untuk <strong>${EVENT_NAME}</strong> telah kami terima.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #0F4D39;">
            <p style="margin: 0;">Simpan e-voucher ini dan tunjukkan saat proses verifikasi.</p>
            <p style="margin: 0;">Kode Voucher: <strong>${friendlyCode}</strong></p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <img src="cid:qrcode" alt="QR Code" style="max-width: 220px; border: 1px solid #ddd; padding: 10px; background: white;">
          </div>
          <h4 style="color: #0F4D39; margin-top: 0;">Cara Menggunakan:</h4>
          <ol style="margin: 0; padding-left: 20px;">
            <li>Tunjukkan QR code ini di menu Admin "Redeem Voucher" (oleh petugas).</li>
            <li>Atau berikan kode voucher: <strong>${friendlyCode}</strong> untuk verifikasi manual.</li>
          </ol>
          <p style="text-align: center; margin-top: 20px; color: #666; font-size: 14px;">E-voucher ini digenerate otomatis oleh sistem The Lodge Family.</p>
        </div>
      `;
      // Pastikan attachments dikirim pada argumen kelima (text?, attachments?)
      await sendEmail(created.email, subject, emailHtml, undefined, attachments);
    } catch (emailErr) {
      console.error('Send public preregistration voucher email error:', emailErr);
      // Do not fail the registration if email fails
    }

    console.log('Public intimate concert preregistration:', created);
    return res.status(200).json({ message: 'Pre-registrasi diterima. E-voucher telah dikirim ke email Anda.', registrationId: created.id, event: EVENT_NAME, quantity, friendlyCode });
  } catch (err) {
    console.error('Public register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
