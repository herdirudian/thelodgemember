import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import dayjs from 'dayjs';
import { signPayload } from '../utils/security';
import { generateQRDataURL } from '../utils/qr';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const router = Router();

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
    const member = await prisma.member.findUnique({ where: { userId } });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    const existing = await prisma.ticket.findFirst({ where: { memberId: member.id } });
    if (existing) return res.status(400).json({ message: 'Free ticket already redeemed' });

    const ticketName = 'Free Entry Ticket';
    const validDate = dayjs().add(30, 'day').toDate();

    // Generate deterministic payload using ticket UUID
    const ticketId = uuidv4();
    const payload = { type: 'ticket', ticketName, memberId: member.id, ticketId };
    const { data, hash } = signPayload(payload);
    const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
    const qrDataURL = await generateQRDataURL(qrUrl);

    const ticket = await prisma.ticket.create({ data: {
      id: ticketId,
      memberId: member.id,
      name: ticketName,
      validDate,
      qrPayloadHash: hash,
    }});

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
      const { data, hash } = signPayload({
        type: 'ticket',
        ticketName: t.name,
        memberId: t.memberId,
        ticketId: t.id,
      });
      // Prefer stored hash for consistency
      const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${t.qrPayloadHash || hash}`;
      const qr = await generateQRDataURL(qrUrl);
      return { ...t, qr };
    }));

    res.json({ tickets: enriched });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/announcements', async (_req, res) => {
  const list = await prisma.announcement.findMany({ orderBy: { postedAt: 'desc' } });
  res.json(list);
});

router.get('/events', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.uid as string;
    const member = await prisma.member.findUnique({ where: { userId } });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    const events = await prisma.event.findMany({ orderBy: { eventDate: 'asc' } });
    const enriched = await Promise.all(events.map(async (ev) => {
      const registeredCount = await prisma.eventRegistration.count({ where: { eventId: ev.id } });
      const myReg = await prisma.eventRegistration.findFirst({ where: { eventId: ev.id, memberId: member.id } });
      return { ...ev, seatsLeft: Math.max(ev.quota - registeredCount, 0), myRegistration: myReg };
    }));
    res.json({ events: enriched });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }); }
});

router.post('/events/:id/register', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.uid as string;
    const member = await prisma.member.findUnique({ where: { userId } });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    const eventId = req.params.id;
    const ev = await prisma.event.findUnique({ where: { id: eventId } });
    if (!ev) return res.status(404).json({ message: 'Event not found' });
    const registeredCount = await prisma.eventRegistration.count({ where: { eventId } });
    if (registeredCount >= ev.quota) return res.status(400).json({ message: 'Quota full' });
    const existing = await prisma.eventRegistration.findFirst({ where: { eventId, memberId: member.id } });
    if (existing) return res.status(409).json({ message: 'Already registered' });

    const registrationId = uuidv4();
    const { data, hash } = signPayload({ type: 'event', eventId, memberId: member.id, registrationId });
    const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
    const qr = await generateQRDataURL(qrUrl);

    const created = await prisma.eventRegistration.create({ data: {
      id: registrationId,
      eventId,
      memberId: member.id,
      qrPayloadHash: hash,
    }});
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
      const { data, hash } = signPayload({ type: 'points', memberId: pr.memberId, redemptionId: pr.id });
      const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${pr.qrPayloadHash || hash}`;
      const qr = await generateQRDataURL(qrUrl);
      return { ...pr, qr };
    }));
    res.json({ redemptions: enriched });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }); }
});

router.post('/points/redeem', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.uid as string;
    const member = await prisma.member.findUnique({ where: { userId } });
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
            memberId: member.id,
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
    const { data, hash } = signPayload({ type: 'points', memberId: member.id, redemptionId });
    const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
    const qr = await generateQRDataURL(qrUrl);

    const created = await prisma.pointRedemption.create({ data: {
      id: redemptionId,
      memberId: member.id,
      pointsUsed: points,
      rewardName,
      qrPayloadHash: hash,
      ...(promoIdToUse ? { promoId: promoIdToUse } : {}),
    }});
    await prisma.member.update({ where: { id: member.id }, data: { pointsBalance: member.pointsBalance - points } });

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

export default router;