import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import dayjs from 'dayjs';
import { signPayload, signPayloadWithFriendlyCode } from '../utils/security';
import { generateQRDataURL } from '../utils/qr';
import { v4 as uuidv4 } from 'uuid';
import { createMembershipCardPDF } from '../utils/pdf';
import { generateMembershipNumber } from '../utils/membershipNumber';
import path from 'path';
import QRCode from 'qrcode';

const prisma = new PrismaClient();
const router = Router();

console.log('Member router loaded successfully!');



function authMiddleware(req: any, res: any, next: any) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload: any = jwt.verify(token, config.jwtSecret);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

router.get('/me', authMiddleware, async (req: any, res) => {
  const userId = req.user.uid as string;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { member: true } });

  // Auto-provision member profile if missing for a logged-in MEMBER
  if (user && !user.member && user.role === 'MEMBER') {
    const fullName = (user.fullName && user.fullName.trim().length > 0) ? user.fullName : (user.email?.split('@')[0] || 'Member');
    const phone = '0000000000';
    const membershipNumber = await generateMembershipNumber();
    const payload = { type: 'member', memberId: user.id };
    const { data, hash } = signPayload(payload);
    const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
    const qrDataURL = await generateQRDataURL(qrUrl);
    const created = await prisma.member.create({ data: {
      userId: user.id,
      fullName,
      phone,
      membershipNumber,
      qrPayloadHash: hash,
    }});
    // Generate membership card PDF
    const cardsDir = path.join(process.cwd(), 'cards');
    const pdfPath = path.join(cardsDir, `${created.id}.pdf`);
    try { require('fs').mkdirSync(cardsDir, { recursive: true }); } catch {}
    createMembershipCardPDF({ fullName, email: user.email, phone, memberId: created.id, qrDataUrl: qrDataURL, outputPath: pdfPath, logoPath: path.join(process.cwd(), '..', 'frontend', 'public', 'The Lodge Maribaya Logo.svg') });
    await prisma.member.update({ where: { id: created.id }, data: { membershipCardUrl: `${config.appUrl}/files/cards/${created.id}.pdf` } });
    // Refresh user with member relation
    const refreshed = await prisma.user.findUnique({ where: { id: userId }, include: { member: true } });
    if (refreshed) {
      (user as any).member = refreshed.member;
    }
  }

  const member = user?.member ? {
    ...user.member,
    membershipCardUrl: (() => {
      const url = user.member.membershipCardUrl as string | null | undefined;
      if (!url) return url as any;
      if (url.startsWith('http')) return url;
      return `${config.appUrl}${url}`;
    })()
  } : user?.member;
  const safeUser: any = user ? { id: user.id, email: user.email, role: user.role, adminRole: user.adminRole, isActive: user.isActive, createdAt: user.createdAt, updatedAt: user.updatedAt } : null;
  res.json({ user: safeUser, member });
});

router.post('/tickets/redeem-free', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.uid as string;
    const member = await prisma.member.findUnique({ 
      where: { userId },
      include: { user: true }
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    const existing = await prisma.ticket.findFirst({ where: { memberId: member.id } });
    if (existing) return res.status(400).json({ message: 'Free ticket already redeemed' });

    const ticketName = 'Free Entry Ticket';
    const validDate = dayjs().add(30, 'day').toDate();

    // Generate deterministic payload using ticket UUID
    const ticketId = uuidv4();
    const payload = { type: 'ticket', ticketName, memberId: member.id, ticketId };
    const { data, hash, friendlyCode } = signPayloadWithFriendlyCode(payload);
    const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
    const qrDataURL = await generateQRDataURL(qrUrl);

    const ticket = await prisma.ticket.create({ data: {
      id: ticketId,
      memberId: member.id,
      name: ticketName,
      validDate,
      qrPayloadHash: hash,
      friendlyCode,
    }});

    // Send email notification with e-voucher
    try {
      const { sendEmail } = await import('../utils/email');
      const emailSubject = 'E-Voucher Tiket Gratis - The Lodge Family';
      
      // Create QR code attachment
      const qrBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64');
      const attachments = [{
        filename: 'qr-code.png',
        content: qrBuffer,
        cid: 'qrcode'
      }];
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #0F4D39; text-align: center; margin-bottom: 30px;">E-Voucher Tiket Gratis</h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #0F4D39; margin-top: 0;">Detail Tiket</h3>
              <p><strong>Nama Tiket:</strong> ${ticketName}</p>
              <p><strong>Nama Member:</strong> ${member.fullName}</p>
              <p><strong>Kode Voucher:</strong> ${friendlyCode}</p>
              <p><strong>Berlaku Hingga:</strong> ${validDate.toLocaleDateString('id-ID')}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <img src="cid:qrcode" alt="QR Code Tiket" style="max-width: 200px; border: 1px solid #ddd; padding: 10px; background: white;">
            </div>
            
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #0F4D39;">
              <h4 style="color: #0F4D39; margin-top: 0;">Cara Menggunakan:</h4>
              <ol style="margin: 0; padding-left: 20px;">
                <li>Tunjukkan QR code ini saat datang ke lokasi</li>
                <li>Atau berikan kode voucher: <strong>${friendlyCode}</strong></li>
                <li>Tiket berlaku hingga ${validDate.toLocaleDateString('id-ID')}</li>
              </ol>
            </div>
            
            <p style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
              Terima kasih telah menjadi member The Lodge Family!
            </p>
          </div>
        </div>
      `;
      
      await sendEmail(member.user.email, emailSubject, emailHtml, undefined, attachments);
    } catch (emailError) {
      console.error('Failed to send ticket email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ ticket: { ...ticket, qr: qrDataURL } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/tickets/my', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.uid as string;
    const member = await prisma.member.findUnique({ where: { userId } });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const tickets = await prisma.ticket.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
    });

    // Rebuild QR for each ticket using deterministic payload
    const enriched = await Promise.all(tickets.map(async (t) => {
      const { data, hash, friendlyCode } = signPayloadWithFriendlyCode({
        type: 'ticket',
        ticketName: t.name,
        memberId: t.memberId,
        ticketId: t.id,
      });
      // Prefer stored hash for consistency
      const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${t.qrPayloadHash || hash}`;
      const qr = await generateQRDataURL(qrUrl);
      return { ...t, qr, friendlyCode: t.friendlyCode || friendlyCode };
    }));

    res.json({ tickets: enriched });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/announcements', async (req, res) => {
  console.log('=== ANNOUNCEMENTS ENDPOINT HIT ===');
  console.log('Current timestamp:', new Date().toISOString());
  console.log('Query params:', req.query);
  
  try {
    // Check if this is a request for benefits
    if (req.query.type === 'benefits') {
      console.log('=== BENEFITS REQUEST DETECTED ===');
      
      // Get available promos/benefits for new members (active based on date range)
      const now = new Date();
      const benefits = await prisma.promo.findMany({
        where: {
          startDate: { lte: now },
          endDate: { gte: now },
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log('Found benefits:', benefits.length);
      
      return res.json({ 
        benefits: benefits,
        message: 'Benefits retrieved successfully',
        timestamp: new Date().toISOString(),
        count: benefits.length
      });
    }
    
    // Default announcements response
    return res.json([{
      id: 'b94ca9a5-b94c-4210-a96b-7a3b839bfb5f',
      title: 'Welcome to The Lodge Family',
      description: 'Your membership is now active. Redeem free tickets and explore exclusive events!',
      imageUrl: '',
      postedAt: '2025-10-16T16:33:11.422Z',
      createdBy: 'system'
    }]);
    
  } catch (error: any) {
    console.error('Announcements/Benefits error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});

// New test endpoint to check if new endpoints work
router.get('/debug-test', (req, res) => {
  console.log('=== DEBUG TEST ENDPOINT HIT ===');
  console.log('Timestamp:', new Date().toISOString());
  res.json({ 
    message: 'DEBUG TEST ENDPOINT WORKS!',
    timestamp: new Date().toISOString(),
    success: true
  });
});

// Benefits endpoint - using different name to bypass caching issues
router.get('/member-benefits', async (req, res) => {
  console.log('=== MEMBER BENEFITS ENDPOINT HIT ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // Get available promos/benefits for new members (active based on date range)
    const now = new Date();
    const benefits = await prisma.promo.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        // Add any other conditions for available benefits
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Found benefits:', benefits.length);
    
    res.json({ 
      benefits: benefits,
      message: 'Benefits retrieved successfully',
      timestamp: new Date().toISOString(),
      count: benefits.length
    });
  } catch (error: any) {
    console.error('Get benefits error:', error);
    res.status(500).json({ 
      message: error?.message || 'Server error',
      benefits: []
    });
  }
});

router.get('/events', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.uid as string;
    const member = await prisma.member.findUnique({ where: { userId } });
    const events = await prisma.event.findMany({ orderBy: { eventDate: 'asc' } });
    const enriched = await Promise.all(events.map(async (ev) => {
      const registeredCount = await prisma.eventRegistration.count({ where: { eventId: ev.id } });
      const myReg = member ? await prisma.eventRegistration.findFirst({ where: { eventId: ev.id, memberId: member.id } }) : null;
      return { ...ev, seatsLeft: Math.max(ev.quota - registeredCount, 0), myRegistration: myReg };
    }));
    res.json({ events: enriched });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }); }
});

router.post('/events/:id/register', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.uid as string;
    const member = await prisma.member.findUnique({ 
      where: { userId },
      include: { user: true }
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    const eventId = req.params.id;
    const ev = await prisma.event.findUnique({ where: { id: eventId } });
    if (!ev) return res.status(404).json({ message: 'Event not found' });
    const registeredCount = await prisma.eventRegistration.count({ where: { eventId } });
    if (registeredCount >= ev.quota) return res.status(400).json({ message: 'Quota full' });
    const existing = await prisma.eventRegistration.findFirst({ where: { eventId, memberId: member.id } });
    if (existing) return res.status(409).json({ message: 'Already registered' });

    const registrationId = uuidv4();
    const { data, hash, friendlyCode } = signPayloadWithFriendlyCode({ type: 'event', eventId, memberId: member.id, registrationId });
    const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
    const qr = await generateQRDataURL(qrUrl);

    const created = await prisma.eventRegistration.create({ data: {
      id: registrationId,
      eventId,
      memberId: member.id,
      qrPayloadHash: hash,
      friendlyCode,
    }});

    // Send email notification with e-voucher for event registration
    try {
      const { sendEmail } = await import('../utils/email');
      const emailSubject = `E-Voucher Event: ${ev.title} - The Lodge Family`;
      
      // Create QR code attachment
      const qrBuffer = Buffer.from(qr.split(',')[1], 'base64');
      const attachments = [{
        filename: 'qr-code.png',
        content: qrBuffer,
        cid: 'qrcode'
      }];
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #0F4D39; text-align: center; margin-bottom: 30px;">E-Voucher Pendaftaran Event</h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #0F4D39; margin-top: 0;">Detail Event</h3>
              <p><strong>Nama Event:</strong> ${ev.title}</p>
              <p><strong>Nama Member:</strong> ${member.fullName}</p>
              <p><strong>Kode Voucher:</strong> ${friendlyCode}</p>
              <p><strong>Tanggal Event:</strong> ${ev.eventDate ? new Date(ev.eventDate).toLocaleDateString('id-ID') : 'TBA'}</p>
              ${ev.location ? `<p><strong>Lokasi:</strong> ${ev.location}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <img src="cid:qrcode" alt="QR Code Event" style="max-width: 200px; border: 1px solid #ddd; padding: 10px; background: white;">
            </div>
            
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #0F4D39;">
              <h4 style="color: #0F4D39; margin-top: 0;">Cara Menggunakan:</h4>
              <ol style="margin: 0; padding-left: 20px;">
                <li>Tunjukkan QR code ini saat check-in event</li>
                <li>Atau berikan kode voucher: <strong>${friendlyCode}</strong></li>
                <li>Datang tepat waktu sesuai jadwal event</li>
              </ol>
            </div>
            
            ${ev.description ? `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #ffc107;">
              <h4 style="color: #856404; margin-top: 0;">Deskripsi Event:</h4>
              <p style="margin: 0; color: #856404;">${ev.description}</p>
            </div>
            ` : ''}
            
            <p style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
              Terima kasih telah mendaftar! Kami tunggu kehadiran Anda di event ini.
            </p>
          </div>
        </div>
      `;
      
      await sendEmail(member.user.email, emailSubject, emailHtml, undefined, attachments);
    } catch (emailError) {
      console.error('Failed to send event registration email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ registration: { ...created, qr } });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }); }
});

router.get('/points/my', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.uid as string;
    const member = await prisma.member.findUnique({ where: { userId } });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    const list = await prisma.pointRedemption.findMany({ where: { memberId: member.id }, orderBy: { createdAt: 'desc' } });
    const enriched = await Promise.all(list.map(async (pr) => {
      const { data, hash, friendlyCode } = signPayloadWithFriendlyCode({ type: 'points', memberId: pr.memberId, redemptionId: pr.id });
      const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${pr.qrPayloadHash || hash}`;
      const qr = await generateQRDataURL(qrUrl);
      return { ...pr, qr, friendlyCode: pr.friendlyCode || friendlyCode };
    }));
    res.json({ redemptions: enriched });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }); }
});

router.post('/points/redeem', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.uid as string;
    const member = await prisma.member.findUnique({ 
      where: { userId },
      include: { user: true }
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    const { rewardName, points, promoId } = req.body as { rewardName: string; points: number; promoId?: string };
    if (!rewardName || !points || points <= 0) return res.status(400).json({ message: 'Invalid payload' });

    let promoIdToUse: string | undefined = promoId;

    // Jika promoId disertakan, validasi terhadap promo dan maksimal klaim
    async function validatePromoAndLimit(id: string) {
      const promo = await prisma.promo.findUnique({ where: { id } });
      if (!promo) return { ok: false, message: 'Promo tidak ditemukan' } as const;
      const now = new Date();
      if (promo.startDate > now || promo.endDate < now) return { ok: false, message: 'Promo tidak aktif' } as const;
      const type = String(promo.type || '').toUpperCase();
      if (type !== 'REDEEM_POINTS') return { ok: false, message: 'Promo bukan untuk redeem poin' } as const;
      const required = promo.pointsRequired ?? 0;
      if (required <= 0 || required !== points) return { ok: false, message: 'Poin redeem tidak sesuai dengan promo' } as const;
      const maxRedeem = promo.maxRedeem ?? 0;
      if (maxRedeem > 0) {
        const usedCount = await prisma.pointRedemption.count({
          where: {
            memberId: member!.id,
            OR: [
              { promoId: id },
              { rewardName: promo.title, pointsUsed: required },
            ],
          },
        });
        if (usedCount >= maxRedeem) return { ok: false, message: 'Maksimal klaim untuk promo ini sudah tercapai' } as const;
      }
      return { ok: true } as const;
    }

    if (promoIdToUse) {
      const check = await validatePromoAndLimit(promoIdToUse);
      if (!check.ok) return res.status(400).json({ message: check.message });
    } else {
      // Jika promoId tidak diberikan, coba cocokkan promo aktif berdasarkan rewardName & points
      const now = new Date();
      const promo = await prisma.promo.findFirst({
        where: {
          type: 'REDEEM_POINTS',
          title: rewardName,
          pointsRequired: points,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        orderBy: { startDate: 'desc' },
      });
      if (promo) {
        promoIdToUse = promo.id;
        const check = await validatePromoAndLimit(promo.id);
        if (!check.ok) return res.status(400).json({ message: check.message });
      }
      // Jika tidak ditemukan promo yang cocok, lanjutkan sebagai redeem umum tanpa batas promo
    }

    if (member.pointsBalance < points) return res.status(400).json({ message: 'Not enough points' });

    const redemptionId = uuidv4();
    const { data, hash, friendlyCode } = signPayloadWithFriendlyCode({ type: 'points', memberId: member.id, redemptionId });
    const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
    const qr = await generateQRDataURL(qrUrl);

    const created = await prisma.pointRedemption.create({ data: {
      id: redemptionId,
      memberId: member.id,
      pointsUsed: points,
      rewardName,
      qrPayloadHash: hash,
      friendlyCode,
      ...(promoIdToUse ? { promoId: promoIdToUse } : {}),
    }});
    await prisma.member.update({ where: { id: member.id }, data: { pointsBalance: member.pointsBalance - points } });

    // Send email notification with e-voucher for point redemption
    try {
      const { sendEmail } = await import('../utils/email');
      const emailSubject = `E-Voucher Redeem Points: ${rewardName} - The Lodge Family`;
      
      // Create QR code attachment
      const qrBuffer = Buffer.from(qr.split(',')[1], 'base64');
      const attachments = [{
        filename: 'qr-code.png',
        content: qrBuffer,
        cid: 'qrcode'
      }];
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #0F4D39; text-align: center; margin-bottom: 30px;">E-Voucher Redeem Points</h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #0F4D39; margin-top: 0;">Detail Redemption</h3>
              <p><strong>Nama Member:</strong> ${member.fullName}</p>
              <p><strong>Reward:</strong> ${rewardName}</p>
              <p><strong>Points Digunakan:</strong> ${points} points</p>
              <p><strong>Kode Voucher:</strong> ${friendlyCode}</p>
              <p><strong>Tanggal Redeem:</strong> ${new Date().toLocaleDateString('id-ID')}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <img src="cid:qrcode" alt="QR Code Redemption" style="max-width: 200px; border: 1px solid #ddd; padding: 10px; background: white;">
            </div>
            
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #0F4D39;">
              <h4 style="color: #0F4D39; margin-top: 0;">Cara Menggunakan:</h4>
              <ol style="margin: 0; padding-left: 20px;">
                <li>Tunjukkan QR code ini saat mengklaim reward</li>
                <li>Atau berikan kode voucher: <strong>${friendlyCode}</strong></li>
                <li>Voucher berlaku sesuai syarat dan ketentuan yang berlaku</li>
              </ol>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #ffc107;">
              <h4 style="color: #856404; margin-top: 0;">Informasi Penting:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #856404;">
                <li>Simpan e-voucher ini dengan baik</li>
                <li>Voucher tidak dapat dikembalikan atau ditukar dengan uang tunai</li>
                <li>Hubungi customer service jika ada kendala</li>
              </ul>
            </div>
            
            <p style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
              Terima kasih telah menggunakan layanan redeem points kami!
            </p>
          </div>
        </div>
      `;
      
      await sendEmail(member.user.email, emailSubject, emailHtml, undefined, attachments);
    } catch (emailError) {
      console.error('Failed to send point redemption email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ redemption: { ...created, qr } });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }); }
});

router.get('/promos', async (req, res) => {
  try {
    const now = new Date();
    const activePromos = await prisma.promo.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now }
      },
      orderBy: { startDate: 'desc' }
    });

    // Normalisasi base URL untuk asset lokal yang disimpan di /files/uploads
    const targetBase = `${req.protocol}://${req.get('host')}`;
    const enriched = activePromos.map((p) => {
      let fixedImageUrl = p.imageUrl as string | undefined;
      try {
        if (fixedImageUrl && fixedImageUrl.includes('/files/uploads/')) {
          const u = new URL(fixedImageUrl);
          const currentBase = `${u.protocol}//${u.host}`;
          if (currentBase !== targetBase) {
            fixedImageUrl = fixedImageUrl.replace(currentBase, targetBase);
          }
        }
      } catch {}
      return { ...p, imageUrl: fixedImageUrl };
    });

    res.json(enriched);
  } catch (e: any) {
    console.error('Member promos error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.get('/slider-images', async (req, res) => {
  try {
    // Ambil data slider terbaru
    let list: any[] = [];
    try {
      list = await (prisma as any).sliderImage.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'desc' }] });
    } catch (e1) {
      try {
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS SliderImage (
          id CHAR(36) NOT NULL,
          imageUrl VARCHAR(255) NOT NULL,
          title VARCHAR(191) NULL,
          position INT NULL,
          createdAt DATETIME(3) NOT NULL,
          createdBy VARCHAR(191) NULL,
          PRIMARY KEY (id)
        )`);
      } catch {}
      try { await prisma.$executeRawUnsafe(`ALTER TABLE SliderImage ADD COLUMN position INT NULL`); } catch {}
      list = await prisma.$queryRawUnsafe(`SELECT id, imageUrl, title, position, createdAt, createdBy FROM SliderImage ORDER BY position ASC, createdAt DESC`);
    }

    const targetBase = `${req.protocol}://${req.get('host')}`;
    const enriched = list.map((p: any) => {
      let fixedImageUrl = p.imageUrl as string | undefined;
      try {
        if (fixedImageUrl && fixedImageUrl.includes('/files/uploads/')) {
          const u = new URL(fixedImageUrl);
          const currentBase = `${u.protocol}//${u.host}`;
          if (currentBase !== targetBase) {
            fixedImageUrl = fixedImageUrl.replace(currentBase, targetBase);
          }
        }
      } catch {}
      return { ...p, imageUrl: fixedImageUrl };
    });

    res.json(enriched);
  } catch (e: any) {
    console.error('Member slider images error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Public endpoint for tourism tickets
router.get('/tourism-tickets', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      isActive: true
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (category) {
      where.category = category;
    }

    const [tickets, total] = await Promise.all([
      prisma.tourismTicket.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.tourismTicket.count({ where })
    ]);

    const targetBase = `${req.protocol}://${req.get('host')}`;
    const enrichedTickets = tickets.map((ticket: any) => {
      let fixedImageUrl = ticket.imageUrl as string | undefined;
      try {
        if (fixedImageUrl && fixedImageUrl.includes('/files/uploads/')) {
          const u = new URL(fixedImageUrl);
          const currentBase = `${u.protocol}//${u.host}`;
          if (currentBase !== targetBase) {
            fixedImageUrl = fixedImageUrl.replace(currentBase, targetBase);
          }
        }
      } catch {}
      return { ...ticket, imageUrl: fixedImageUrl };
    });

    res.json({
      tickets: enrichedTickets,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Get tourism tickets error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});

// Public endpoint for individual tourism ticket
router.get('/tourism-tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.tourismTicket.findUnique({
      where: { 
        id,
        isActive: true 
      }
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Tiket tidak ditemukan' });
    }

    const targetBase = `${req.protocol}://${req.get('host')}`;
    let fixedImageUrl = ticket.imageUrl as string | undefined;
    try {
      if (fixedImageUrl && fixedImageUrl.includes('/files/uploads/')) {
        const u = new URL(fixedImageUrl);
        const currentBase = `${u.protocol}//${u.host}`;
        if (currentBase !== targetBase) {
          fixedImageUrl = fixedImageUrl.replace(currentBase, targetBase);
        }
      }
    } catch {}

    res.json({
      ticket: { ...ticket, imageUrl: fixedImageUrl }
    });
  } catch (error: any) {
    console.error('Get tourism ticket error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});

// Public endpoint for accommodations
router.get('/accommodations', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', type = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      isActive: true
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (type) {
      where.type = type;
    }

    const [accommodations, total] = await Promise.all([
      prisma.accommodation.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.accommodation.count({ where })
    ]);

    const targetBase = `${req.protocol}://${req.get('host')}`;
    const enrichedAccommodations = accommodations.map((accommodation: any) => {
      let fixedImageUrl = accommodation.imageUrl as string | undefined;
      try {
        if (fixedImageUrl && fixedImageUrl.includes('/files/uploads/')) {
          const u = new URL(fixedImageUrl);
          const currentBase = `${u.protocol}//${u.host}`;
          if (currentBase !== targetBase) {
            fixedImageUrl = fixedImageUrl.replace(currentBase, targetBase);
          }
        }
      } catch {}
      return { ...accommodation, imageUrl: fixedImageUrl };
    });

    res.json({
      accommodations: enrichedAccommodations,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Get accommodations error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});

// Public endpoint for individual accommodation
router.get('/accommodations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const accommodation = await prisma.accommodation.findUnique({
      where: { 
        id,
        isActive: true 
      }
    });

    if (!accommodation) {
      return res.status(404).json({ message: 'Akomodasi tidak ditemukan' });
    }

    const targetBase = `${req.protocol}://${req.get('host')}`;
    let fixedImageUrl = accommodation.imageUrl as string | undefined;
    try {
      if (fixedImageUrl && fixedImageUrl.includes('/files/uploads/')) {
        const u = new URL(fixedImageUrl);
        const currentBase = `${u.protocol}//${u.host}`;
        if (currentBase !== targetBase) {
          fixedImageUrl = fixedImageUrl.replace(currentBase, targetBase);
        }
      }
    } catch {}

    res.json({
      accommodation: { ...accommodation, imageUrl: fixedImageUrl }
    });
  } catch (error: any) {
    console.error('Get accommodation error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});

// Get available benefits for new members (without auth for testing)
router.get('/benefits/available', async (req: any, res) => {
  try {
    // For testing, return sample data without authentication
    res.json({ 
      benefits: [],
      message: 'Benefits endpoint is working - authentication disabled for testing'
    });
  } catch (error: any) {
    console.error('Get available benefits error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});


// New benefits endpoint to avoid caching issues
router.get('/member-benefits-new', async (req: any, res) => {
  try {
    console.log('=== NEW BENEFITS ENDPOINT HIT ===');
    
    // Get available promos/benefits for new members (active based on date range)
    const now = new Date();
    const benefits = await prisma.promo.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Found benefits:', benefits.length);
    
    res.json({ 
      benefits: benefits,
      message: 'Benefits retrieved successfully',
      timestamp: new Date().toISOString(),
      count: benefits.length
    });
  } catch (error: any) {
    console.error('Get benefits error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});

// Claim a benefit
router.post('/benefits/:id/claim', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.uid as string;
    const benefitId = req.params.id;

    const member = await prisma.member.findUnique({ 
      where: { userId },
      include: { user: true }
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Get the benefit
    const benefit = await prisma.promo.findUnique({
      where: { 
        id: benefitId,
        type: 'FREE_BENEFIT_NEW_REG'
      }
    });

    if (!benefit) {
      return res.status(404).json({ message: 'Benefit not found' });
    }

    // Check if benefit is still active
    const now = new Date();
    if (benefit.startDate > now || benefit.endDate < now) {
      return res.status(400).json({ message: 'Benefit is not active' });
    }

    // Check if member has already claimed this benefit
    const existingClaim = await prisma.ticket.findFirst({
      where: {
        memberId: member.id,
        promoId: benefit.id
      }
    });

    if (existingClaim) {
      return res.status(400).json({ message: 'Benefit already claimed' });
    }

    // Check member claim limit
    if (benefit.maxRedeem) {
      const memberClaimCount = await prisma.ticket.count({
        where: {
          memberId: member.id,
          promoId: benefit.id
        }
      });

      if (memberClaimCount >= benefit.maxRedeem) {
        return res.status(400).json({ message: 'Maximum claims reached for this member' });
      }
    }

    // Check total quota
    if (benefit.quota) {
      const totalClaims = await prisma.ticket.count({
        where: { promoId: benefit.id }
      });

      if (totalClaims >= benefit.quota) {
        return res.status(400).json({ message: 'Benefit quota exhausted' });
      }
    }

    // Create the benefit ticket
    const ticketId = uuidv4();
    const validDate = benefit.endDate;

    // Generate QR code and friendly code
    const payload = { 
      type: 'benefit', 
      benefitName: benefit.title, 
      memberId: member.id, 
      ticketId,
      promoId: benefit.id
    };
    const { data, hash, friendlyCode } = signPayloadWithFriendlyCode(payload);
    const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
    const qrDataURL = await generateQRDataURL(qrUrl);

    const ticket = await prisma.ticket.create({
      data: {
        id: ticketId,
        memberId: member.id,
        name: benefit.title,
        validDate,
        qrPayloadHash: hash,
        friendlyCode,
        promoId: benefit.id
      }
    });

    // Send email notification
    try {
      const { sendEmail } = await import('../utils/email');
      const emailSubject = `E-Voucher Benefit Member Baru - ${benefit.title}`;
      
      // Create QR code attachment
      const qrBuffer = Buffer.from(qrDataURL.split(',')[1], 'base64');
      const attachments = [{
        filename: 'qr-code.png',
        content: qrBuffer,
        cid: 'qrcode'
      }];
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #0F4D39; text-align: center; margin-bottom: 30px;">E-Voucher Benefit Member Baru</h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #0F4D39; margin-top: 0;">Detail Benefit</h3>
              <p><strong>Nama Benefit:</strong> ${benefit.title}</p>
              <p><strong>Deskripsi:</strong> ${benefit.description}</p>
              <p><strong>Nama Member:</strong> ${member.fullName}</p>
              <p><strong>Kode Voucher:</strong> ${friendlyCode}</p>
              <p><strong>Berlaku Hingga:</strong> ${validDate.toLocaleDateString('id-ID')}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <img src="cid:qrcode" alt="QR Code Benefit" style="max-width: 200px; border: 1px solid #ddd; padding: 10px; background: white;">
            </div>
            
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #0F4D39;">
              <h4 style="color: #0F4D39; margin-top: 0;">Cara Menggunakan:</h4>
              <ol style="margin: 0; padding-left: 20px;">
                <li>Tunjukkan QR code ini saat datang ke lokasi</li>
                <li>Atau berikan kode voucher: <strong>${friendlyCode}</strong></li>
                <li>Benefit berlaku hingga ${validDate.toLocaleDateString('id-ID')}</li>
              </ol>
            </div>
            
            <p style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
              Selamat menikmati benefit member baru The Lodge Family!
            </p>
          </div>
        </div>
      `;
      
      await sendEmail(member.user.email, emailSubject, emailHtml, undefined, attachments);
    } catch (emailError) {
      console.error('Failed to send benefit email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ 
      ticket: { ...ticket, qr: qrDataURL },
      message: 'Benefit berhasil diklaim! E-voucher telah dikirim ke email Anda.'
    });
  } catch (error: any) {
    console.error('Claim benefit error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});

// Test endpoint to verify routing works
router.get('/test-endpoint', (req, res) => {
  console.log('Test endpoint hit!');
  res.json({ message: 'Test endpoint works!' });
});

// Simple test for new endpoints
router.get('/simple-test', (req, res) => {
  console.log('Simple test endpoint hit!');
  res.json({ message: 'Simple test works!', timestamp: new Date().toISOString() });
});

// Get active benefits for members
router.get('/benefits', async (req, res) => {
  try {
    const now = new Date();
    
    const benefits = await prisma.benefit.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        OR: [
          { validUntil: null },
          { validUntil: { gte: now } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        validFrom: true,
        validUntil: true,
        createdAt: true
      }
    });

    res.json(benefits);
  } catch (error: any) {
    console.error('Get benefits error:', error);
    res.status(500).json({ message: error?.message || 'Failed to fetch benefits' });
  }
});

// Redeem benefit endpoint
router.post('/benefits/:id/redeem', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.uid as string;
    const benefitId = req.params.id;

    const member = await prisma.member.findUnique({ 
      where: { userId },
      include: { user: true }
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // Get the benefit
    const benefit = await prisma.benefit.findUnique({
      where: { 
        id: benefitId,
        isActive: true
      }
    });

    if (!benefit) {
      return res.status(404).json({ message: 'Benefit not found or inactive' });
    }

    // Check if benefit is still valid
    const now = new Date();
    if (benefit.validFrom > now || (benefit.validUntil && benefit.validUntil < now)) {
      return res.status(400).json({ message: 'Benefit is not valid at this time' });
    }

    // Check if member has already redeemed this benefit
    const existingRedemption = await prisma.benefitRedemption.findFirst({
      where: {
        memberId: member.id,
        benefitId: benefit.id
      }
    });

    if (existingRedemption) {
      return res.status(400).json({ message: 'Benefit already redeemed' });
    }

    // Generate voucher code (format: TLG-BENEFIT-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const voucherCode = `TLG-BENEFIT-${dateStr}-${randomStr}`;

    // Create QR code data
    const qrData = {
      type: 'benefit_voucher',
      voucherCode,
      benefitId: benefit.id,
      memberId: member.id,
      memberName: member.fullName,
      benefitTitle: benefit.title,
      issuedAt: now.toISOString()
    };
    const qrDataString = JSON.stringify(qrData);
    
    // Generate QR code as base64 image
    const qrCodeBuffer = await QRCode.toBuffer(qrDataString, {
      type: 'png',
      width: 256,
      margin: 2,
      color: {
        dark: '#0F4D39',
        light: '#FFFFFF'
      }
    });
    const qrCodeBase64 = qrCodeBuffer.toString('base64');

    // Create redemption record
    const redemption = await prisma.benefitRedemption.create({
      data: {
        memberId: member.id,
        benefitId: benefit.id,
        voucherCode,
        qrCode: qrCodeBase64
      },
      include: {
        benefit: {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true
          }
        }
      }
    });

    // TODO: Send email with e-voucher (will be implemented in next step)
    // For now, we'll mark email as sent
    await prisma.benefitRedemption.update({
      where: { id: redemption.id },
      data: {
        emailSent: true,
        emailSentAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Benefit redeemed successfully',
      redemption: {
        id: redemption.id,
        voucherCode: redemption.voucherCode,
        qrCode: redemption.qrCode,
        benefit: redemption.benefit,
        createdAt: redemption.createdAt
      }
    });

  } catch (error: any) {
    console.error('Benefit redemption error:', error);
    res.status(500).json({ message: error?.message || 'Failed to redeem benefit' });
  }
});

// Get member's benefit redemptions
router.get('/benefits/my-redemptions', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.uid as string;

    const member = await prisma.member.findUnique({ 
      where: { userId }
    });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const redemptions = await prisma.benefitRedemption.findMany({
      where: { memberId: member.id },
      select: {
        id: true,
        benefitId: true,
        voucherCode: true,
        qrCode: true,
        isUsed: true,
        usedAt: true,
        emailSent: true,
        emailSentAt: true,
        createdAt: true,
        updatedAt: true,
        benefit: {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(redemptions);
  } catch (error: any) {
    console.error('Get redemptions error:', error);
    res.status(500).json({ message: error?.message || 'Failed to fetch redemptions' });
  }
});

export default router;