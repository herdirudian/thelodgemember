import { Router } from 'express';
import { PrismaClient, RedemptionStatus, RegistrationStatus, TicketStatus, PromoType } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { verifyPayload, verifyFriendlyVoucherCode } from '../utils/security';
import multer from 'multer';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { VoucherType } from '@prisma/client'
import { generateQRDataURL } from '../utils/qr'
import { createRedeemProofPDF } from '../utils/pdf'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const prisma = new PrismaClient();
const router = Router();
dayjs.extend(isoWeek);

console.log('🚀 Admin router initialized!');

// Root endpoint for debugging
router.get('/', (req, res) => {
  console.log('🔥 Admin root endpoint hit!');
  res.json({ message: 'Admin router root is working!' });
});

// Simple test endpoint
router.get('/test', (req, res) => {
  console.log('🔥 Test endpoint hit!');
  res.json({ message: 'Admin router is working!' });
});

// In-memory cache for Settings with TTL
const SETTINGS_CACHE_TTL_MS = 60_000; // 60 seconds
let settingsCache: { value: any | null; expireAt: number; setAt: number } = { value: null, expireAt: 0, setAt: 0 };

// Helper: deep clone to avoid mutation affecting cached reference
function safeClone<T>(obj: T): T {
  return obj == null ? (obj as any) : JSON.parse(JSON.stringify(obj));
}

function pathIncludes(pathname: string, keyword: string) {
  try { return pathname.includes(keyword); } catch { return false; }
}

function safeToJSON(obj: any) { try { return JSON.stringify(obj); } catch { return ''; } }
function truncate(str: string, max = 2000) { if (!str) return str; return str.length > max ? str.slice(0, max) : str; }
async function recordAdminActivity(info: { adminId: string; adminName?: string | null; adminRole?: string | null; method: string; path: string; status: number; ip?: string; ua?: string; body?: any; query?: any }) {
  const payload: any = {
    adminId: info.adminId,
    adminName: info.adminName || null,
    adminRole: info.adminRole || null,
    method: info.method,
    path: info.path,
    status: info.status,
    ip: info.ip || null,
    userAgent: info.ua || null,
    requestBody: truncate(safeToJSON(info.body)),
    query: truncate(safeToJSON(info.query)),
    createdAt: new Date(),
  };
  try {
    // Prefer prisma client
    await (prisma as any).adminActivity.create({ data: payload });
  } catch (e: any) {
    console.error('Failed to record admin activity:', e);
  }
}

// Redeem voucher by code endpoint
router.post('/redeem-by-code', adminAuth, async (req, res) => {
  const { voucherCode } = req.body as { voucherCode: string };
  
  if (!voucherCode || !voucherCode.trim()) {
    return res.status(400).json({ message: 'Kode voucher diperlukan' });
  }

  try {
    // Ambil info admin untuk pencatatan
    const adminUser = await prisma.user.findUnique({ where: { id: req.user?.uid } });
    const adminId = adminUser?.id || req.user?.uid || 'unknown';
    const adminName = adminUser?.email || 'admin';

    const code = voucherCode.trim().toUpperCase();
    let voucherFound = false;
    let result: any = null;

    // Siapkan variabel umum untuk RedeemHistory
    let memberId = '';
    let memberName = '';
    let voucherType: VoucherType = 'TICKET' as any;
    let voucherId = '';
    let voucherLabel: string | undefined = undefined;
    const redeemedAt = new Date();

    // Cek apakah ini kode tiket
    const ticket = await prisma.ticket.findFirst({ 
      where: { 
        OR: [
          { friendlyCode: code },
          { id: code }
        ]
      },
      include: { member: true }
    });

    if (ticket) {
      if (ticket.status === TicketStatus.REDEEMED) {
        return res.status(400).json({ message: 'Tiket sudah pernah di-redeem' });
      }

      const updated = await prisma.ticket.update({ 
        where: { id: ticket.id }, 
        data: { status: TicketStatus.REDEEMED, redeemedAt } 
      });

      memberId = ticket.memberId;
      memberName = ticket.member?.fullName || '';
      voucherType = 'TICKET' as any;
      voucherId = ticket.id;
      voucherLabel = ticket.name;

      // Generate proof
      const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
      const qrCode = `REDEEM-${ticket.id}`;
      const qrDataURL = await generateQRDataURL(qrCode);
      
      const uploadsDir = path.join(process.cwd(), 'uploads', 'redeem-proofs');
      try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
      const filename = `redeem_${voucherId}_${Date.now()}.pdf`;
      const outputPath = path.join(uploadsDir, filename);
      
      await createRedeemProofPDF({ 
        outputPath, 
        memberName, 
        voucherType: 'Tiket Gratis Member', 
        voucherLabel, 
        redeemedAt, 
        qrDataUrl: qrDataURL, 
        adminName, 
        companyName: 'The Lodge Family' 
      });
      
      const proofUrl = `${baseUrl}/files/uploads/redeem-proofs/${filename}`;
      
      await prisma.redeemHistory.create({ 
        data: { 
          memberId, 
          memberName, 
          voucherType, 
          voucherId, 
          voucherLabel, 
          redeemedAt, 
          adminId, 
          adminName, 
          proofUrl 
        } 
      });

      result = {
        success: true,
        memberName,
        memberId,
        voucherName: voucherLabel,
        voucherType: 'Tiket',
        qrCode,
        proofUrl,
        details: updated
      };
      voucherFound = true;
    }

    // Jika belum ditemukan, cek point redemption
    if (!voucherFound) {
      const pointRedemption = await prisma.pointRedemption.findFirst({ 
        where: { 
          OR: [
            { friendlyCode: code },
            { id: code }
          ]
        },
        include: { member: true }
      });

      if (pointRedemption) {
        if (pointRedemption.status === RedemptionStatus.REDEEMED) {
          return res.status(400).json({ message: 'Redeem poin sudah pernah di-redeem' });
        }

        const updated = await prisma.pointRedemption.update({ 
          where: { id: pointRedemption.id }, 
          data: { status: RedemptionStatus.REDEEMED, redeemedAt } 
        });

        memberId = pointRedemption.memberId;
        memberName = pointRedemption.member?.fullName || '';
        voucherType = 'POINTS' as any;
        voucherId = pointRedemption.id;
        voucherLabel = pointRedemption.rewardName;

        // Generate proof
        const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
        const qrCode = `REDEEM-${pointRedemption.id}`;
        const qrDataURL = await generateQRDataURL(qrCode);
        
        const uploadsDir = path.join(process.cwd(), 'uploads', 'redeem-proofs');
        try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
        const filename = `redeem_${voucherId}_${Date.now()}.pdf`;
        const outputPath = path.join(uploadsDir, filename);
        
        await createRedeemProofPDF({ 
          outputPath, 
          memberName, 
          voucherType: 'Redeem Poin', 
          voucherLabel, 
          redeemedAt, 
          qrDataUrl: qrDataURL, 
          adminName, 
          companyName: 'The Lodge Family' 
        });
        
        const proofUrl = `${baseUrl}/files/uploads/redeem-proofs/${filename}`;
        
        await prisma.redeemHistory.create({ 
          data: { 
            memberId, 
            memberName, 
            voucherType, 
            voucherId, 
            voucherLabel, 
            redeemedAt, 
            adminId, 
            adminName, 
            proofUrl 
          } 
        });

        result = {
          success: true,
          memberName,
          memberId,
          voucherName: voucherLabel,
          voucherType: 'Poin',
          qrCode,
          proofUrl,
          details: updated
        };
        voucherFound = true;
      }
    }

    // Jika belum ditemukan, cek event registration
    if (!voucherFound) {
      const eventReg = await prisma.eventRegistration.findFirst({ 
        where: { 
          OR: [
            { friendlyCode: code },
            { id: code }
          ]
        },
        include: { 
          member: true,
          event: true
        }
      });

      if (eventReg) {
        if (eventReg.status === RegistrationStatus.REDEEMED) {
          return res.status(400).json({ message: 'Registrasi event sudah pernah di-redeem' });
        }

        const updated = await prisma.eventRegistration.update({ 
          where: { id: eventReg.id }, 
          data: { status: RegistrationStatus.REDEEMED, redeemedAt } 
        });

        memberId = eventReg.memberId;
        memberName = eventReg.member?.fullName || '';
        voucherType = 'EVENT' as any;
        voucherId = eventReg.id;
        voucherLabel = eventReg.event?.title;

        // Generate proof
        const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
        const qrCode = `REDEEM-${eventReg.id}`;
        const qrDataURL = await generateQRDataURL(qrCode);
        
        const uploadsDir = path.join(process.cwd(), 'uploads', 'redeem-proofs');
        try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
        const filename = `redeem_${voucherId}_${Date.now()}.pdf`;
        const outputPath = path.join(uploadsDir, filename);
        
        await createRedeemProofPDF({ 
          outputPath, 
          memberName, 
          voucherType: 'Event Eksklusif Member', 
          voucherLabel, 
          redeemedAt, 
          qrDataUrl: qrDataURL, 
          adminName, 
          companyName: 'The Lodge Family' 
        });
        
        const proofUrl = `${baseUrl}/files/uploads/redeem-proofs/${filename}`;
        
        await prisma.redeemHistory.create({ 
          data: { 
            memberId, 
            memberName, 
            voucherType, 
            voucherId, 
            voucherLabel, 
            redeemedAt, 
            adminId, 
            adminName, 
            proofUrl 
          } 
        });

        result = {
          success: true,
          memberName,
          memberId,
          voucherName: voucherLabel,
          voucherType: 'Event',
          qrCode,
          proofUrl,
          details: updated
        };
        voucherFound = true;
      }
    }

    // Jika belum ditemukan, cek tourism ticket booking
    if (!voucherFound) {
      const tourismBooking = await prisma.tourismTicketBooking.findFirst({ 
        where: { 
          OR: [
            { friendlyCode: code },
            { id: code }
          ]
        },
        include: { 
          member: true,
          ticket: true
        }
      });

      if (tourismBooking) {
        if (tourismBooking.redeemedAt) {
          return res.status(400).json({ message: 'Tiket wisata sudah pernah di-redeem' });
        }

        if (tourismBooking.status !== 'PAID') {
          return res.status(400).json({ message: 'Tiket wisata belum dibayar' });
        }

        const updated = await prisma.tourismTicketBooking.update({ 
          where: { id: tourismBooking.id }, 
          data: { redeemedAt } 
        });

        memberId = tourismBooking.memberId || '';
        memberName = tourismBooking.member?.fullName || tourismBooking.customerName;
        voucherType = 'TOURISM_TICKET' as any;
        voucherId = tourismBooking.id;
        voucherLabel = tourismBooking.ticket?.name;

        // Generate proof
        const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
        const qrCode = `REDEEM-${tourismBooking.id}`;
        const qrDataURL = await generateQRDataURL(qrCode);
        
        const uploadsDir = path.join(process.cwd(), 'uploads', 'redeem-proofs');
        try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
        const filename = `redeem_${voucherId}_${Date.now()}.pdf`;
        const outputPath = path.join(uploadsDir, filename);
        
        await createRedeemProofPDF({ 
          outputPath, 
          memberName, 
          voucherType: 'Tiket Wisata', 
          voucherLabel, 
          redeemedAt, 
          qrDataUrl: qrDataURL, 
          adminName, 
          companyName: 'The Lodge Family' 
        });
        
        const proofUrl = `${baseUrl}/files/uploads/redeem-proofs/${filename}`;
        
        await prisma.redeemHistory.create({ 
          data: { 
            memberId, 
            memberName, 
            voucherType, 
            voucherId, 
            voucherLabel, 
            redeemedAt, 
            adminId, 
            adminName, 
            proofUrl 
          } 
        });

        result = {
          success: true,
          memberName,
          memberId,
          voucherName: voucherLabel,
          voucherType: 'Tiket Wisata',
          qrCode,
          proofUrl,
          details: updated
        };
        voucherFound = true;
      }
    }

    // Jika belum ditemukan, cek benefit redemption
    if (!voucherFound) {
      const benefitRedemption = await prisma.benefitRedemption.findFirst({ 
        where: { 
          voucherCode: code
        },
        include: { 
          member: true,
          benefit: true
        }
      });

      if (benefitRedemption) {
        if (benefitRedemption.isUsed) {
          return res.status(400).json({ message: 'Voucher benefit sudah pernah di-redeem' });
        }

        const updated = await prisma.benefitRedemption.update({ 
          where: { id: benefitRedemption.id }, 
          data: { isUsed: true, usedAt: redeemedAt } 
        });

        memberId = benefitRedemption.memberId;
        memberName = benefitRedemption.member?.fullName || '';
        voucherType = 'BENEFIT' as any;
        voucherId = benefitRedemption.id;
        voucherLabel = benefitRedemption.benefit?.title;

        // Generate proof
        const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
        const qrCode = `REDEEM-${benefitRedemption.id}`;
        const qrDataURL = await generateQRDataURL(qrCode);
        
        const uploadsDir = path.join(process.cwd(), 'uploads', 'redeem-proofs');
        try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
        const filename = `redeem_${voucherId}_${Date.now()}.pdf`;
        const outputPath = path.join(uploadsDir, filename);
        
        await createRedeemProofPDF({ 
          outputPath, 
          memberName, 
          voucherType: 'Benefit Voucher', 
          voucherLabel, 
          redeemedAt, 
          qrDataUrl: qrDataURL, 
          adminName, 
          companyName: 'The Lodge Family' 
        });
        
        const proofUrl = `${baseUrl}/files/uploads/redeem-proofs/${filename}`;
        
        await prisma.redeemHistory.create({ 
          data: { 
            memberId, 
            memberName, 
            voucherType, 
            voucherId, 
            voucherLabel, 
            redeemedAt, 
            adminId, 
            adminName, 
            proofUrl 
          } 
        });

        result = {
          success: true,
          memberName,
          memberId,
          voucherName: voucherLabel,
          voucherType: 'Benefit Voucher',
          qrCode,
          proofUrl,
          details: updated
        };
        voucherFound = true;
      }
    }

    if (!voucherFound) {
      return res.status(404).json({ message: 'Kode voucher tidak ditemukan atau tidak valid' });
    }

    return res.json(result);

  } catch (e: any) {
    console.error('Redeem by code error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

async function adminAuth(req: any, res: any, next: any) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  const method = String(req.method || '').toUpperCase();
  const pathname = String(req.originalUrl || req.path || '');
  const ip = (req.headers['x-forwarded-for'] as any) || req.ip || '';
  const ua = (req.headers['user-agent'] as any) || '';
  
  console.log('🔍 Authorization header:', hdr);
  console.log('🔍 Extracted token:', token ? 'Token present' : 'No token');
  console.log('🔍 Request path:', pathname);
  
  if (!token) {
    console.log('❌ No token provided');
    try {
      await recordAdminActivity({ adminId: 'unknown', method, path: pathname, status: 401, ip, ua, body: req.body, query: req.query });
    } catch {}
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const payload: any = jwt.verify(token, config.jwtSecret);
    console.log('🔍 JWT Payload:', JSON.stringify(payload, null, 2));
    console.log('🔍 Payload role:', payload.role);
    console.log('🔍 Role check result:', payload.role !== 'ADMIN');
    
    if (payload.role !== 'ADMIN') {
      console.log('❌ Role check failed - not ADMIN');
      try {
        await recordAdminActivity({ adminId: payload?.uid || 'unknown', method, path: pathname, status: 403, ip, ua, body: req.body, query: req.query });
      } catch {}
      return res.status(403).json({ message: 'Forbidden' });
    }
    const user = await prisma.user.findUnique({ where: { id: payload.uid } });
    if (!user) {
      try { await recordAdminActivity({ adminId: payload?.uid || 'unknown', method, path: pathname, status: 401, ip, ua, body: req.body, query: req.query }); } catch {}
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (user.isActive === false) {
      try { await recordAdminActivity({ adminId: user.id, adminName: user.fullName, adminRole: user.adminRole as any, method, path: pathname, status: 403, ip, ua, body: req.body, query: req.query }); } catch {}
      return res.status(403).json({ message: 'Account is deactivated' });
    }
    const adminRole: string | null = (user.adminRole ?? null) as any;
    req.user = { uid: payload.uid, role: payload.role, adminRole };

    // Granular permission checks
    let allowed = true;
    if (adminRole) {
      const role = String(adminRole).toUpperCase();
      if (role === 'SUPER_ADMIN' || role === 'OWNER') {
        allowed = true;
      } else if (role === 'CASHIER') {
        allowed = pathIncludes(pathname, '/redeem') || pathIncludes(pathname, '/redeem-history') || pathIncludes(pathname, '/overview');
        if (allowed && pathIncludes(pathname, '/overview') && method !== 'GET') allowed = false;
        if (allowed && pathIncludes(pathname, '/redeem-history') && method !== 'GET') allowed = false;
      } else if (role === 'MODERATOR') {
        allowed = pathIncludes(pathname, '/promos') || pathIncludes(pathname, '/overview');
        if (allowed && pathIncludes(pathname, '/overview') && method !== 'GET') allowed = false;
      }
    }

    if (!allowed) {
      try { await recordAdminActivity({ adminId: user.id, adminName: user.fullName, adminRole: user.adminRole as any, method, path: pathname, status: 403, ip, ua, body: req.body, query: req.query }); } catch {}
      return res.status(403).json({ message: 'Access denied for your role' });
    }

    // Record successful/allowed access after response finished
    try {
      res.on('finish', async () => {
        try {
          await recordAdminActivity({
            adminId: user.id,
            adminName: user.fullName,
            adminRole: user.adminRole as any,
            method,
            path: pathname,
            status: res.statusCode,
            ip,
            ua,
            body: req.body,
            query: req.query,
          });
        } catch {}
      });
    } catch {}
    next();
  } catch {
    try { await recordAdminActivity({ adminId: 'unknown', method, path: pathname, status: 401, ip, ua, body: req.body, query: req.query }); } catch {}
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// Optional Cloudinary config
if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}
const upload = multer({ storage: multer.memoryStorage() });

// Overview metrics
router.get('/overview', adminAuth, async (_req, res) => {
  try {
    const [members, events, redeemedPoints, activeTickets, activePointVouchers, activeEventRegs] = await Promise.all([
      prisma.member.count(),
      prisma.event.count(),
      prisma.pointRedemption.aggregate({ _sum: { pointsUsed: true }, where: { status: 'REDEEMED' } }),
      prisma.ticket.count({ where: { status: 'ACTIVE' } }),
      prisma.pointRedemption.count({ where: { status: 'ACTIVE' } }),
      prisma.eventRegistration.count({ where: { status: 'REGISTERED' } }),
    ]);
    res.json({
      totalMembers: members,
      totalEvents: events,
      totalRedeemedPoints: redeemedPoints._sum.pointsUsed || 0,
      activeVouchers: activeTickets + activePointVouchers + activeEventRegs,
    });
  } catch (error) {
    console.error('Overview endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch overview data' });
  }
});

// ==== Analytics Helpers ====
function buildBuckets(period: 'daily'|'weekly'|'monthly', count: number) {
  const now = dayjs();
  const labels: string[] = [];
  const edges: { start: Date; end: Date }[] = [];
  if (period === 'daily') {
    for (let i = count - 1; i >= 0; i--) {
      const d = now.subtract(i, 'day');
      const start = d.startOf('day');
      const end = d.endOf('day');
      labels.push(start.format('YYYY-MM-DD'));
      edges.push({ start: start.toDate(), end: end.toDate() });
    }
  } else if (period === 'weekly') {
    for (let i = count - 1; i >= 0; i--) {
      const w = now.subtract(i, 'week');
      const start = w.startOf('isoWeek');
      const end = w.endOf('isoWeek');
      // Tambahkan index untuk memastikan uniqueness
      labels.push(`${start.format('YYYY-[W]WW')}-${i}`);
      edges.push({ start: start.toDate(), end: end.toDate() });
    }
  } else {
    for (let i = count - 1; i >= 0; i--) {
      const m = now.subtract(i, 'month');
      const start = m.startOf('month');
      const end = m.endOf('month');
      labels.push(start.format('YYYY-MM'));
      edges.push({ start: start.toDate(), end: end.toDate() });
    }
  }
  return { labels, edges };
}

// ==== Analytics: Summary (points, vouchers, redeem) ====
router.get('/analytics/summary', adminAuth, async (req, res) => {
  try {
    const periodParam = String((req.query.period || req.query.range || 'monthly')).toLowerCase();
    const period: 'daily'|'weekly'|'monthly' = ['daily','weekly','monthly'].includes(periodParam) ? (periodParam as any) : 'monthly';
    const bucketCountDefault = period === 'daily' ? 30 : period === 'weekly' ? 12 : 12;
    const bucketCount = Math.max(1, Math.min(180, parseInt(String(req.query.count || bucketCountDefault)) || bucketCountDefault));
    const { labels, edges } = buildBuckets(period, bucketCount);

    const globalStart = edges[0].start;
    const globalEnd = edges[edges.length - 1].end;

    const [tickets, prAll, redeemHistory] = await Promise.all([
      prisma.ticket.findMany({ where: { createdAt: { gte: globalStart, lte: globalEnd } }, select: { createdAt: true, redeemedAt: true } }),
      prisma.pointRedemption.findMany({ where: { OR: [ { createdAt: { gte: globalStart, lte: globalEnd } }, { redeemedAt: { gte: globalStart, lte: globalEnd } } ] }, select: { createdAt: true, redeemedAt: true, pointsUsed: true } }),
      prisma.redeemHistory.findMany({ where: { redeemedAt: { gte: globalStart, lte: globalEnd } }, select: { redeemedAt: true } }),
    ]);

    const pointsUsedSeries = labels.map((_, idx) => {
      const edge = edges[idx];
      return prAll.filter(pr => pr.createdAt >= edge.start && pr.createdAt <= edge.end)
        .reduce((sum, pr) => sum + (pr.pointsUsed || 0), 0);
    });
    const pointsRedeemedSeries = labels.map((_, idx) => {
      const edge = edges[idx];
      return prAll.filter(pr => pr.redeemedAt && pr.redeemedAt >= edge.start && pr.redeemedAt <= edge.end).length;
    });
    const vouchersIssuedSeries = labels.map((_, idx) => {
      const edge = edges[idx];
      return tickets.filter(t => t.createdAt >= edge.start && t.createdAt <= edge.end).length;
    });
    const vouchersRedeemedSeries = labels.map((_, idx) => {
      const edge = edges[idx];
      return tickets.filter(t => t.redeemedAt && t.redeemedAt >= edge.start && t.redeemedAt <= edge.end).length;
    });
    const redeemTotalSeries = labels.map((_, idx) => {
      const edge = edges[idx];
      return redeemHistory.filter(r => r.redeemedAt >= edge.start && r.redeemedAt <= edge.end).length;
    });

    return res.json({ period, labels, points: { pointsUsedSeries, pointsRedeemedSeries }, vouchers: { vouchersIssuedSeries, vouchersRedeemedSeries }, redeem: { redeemTotalSeries } });
  } catch (e: any) {
    console.error('Analytics summary error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// ==== Analytics: Members (new join, active, event participation) ====
router.get('/analytics/members', adminAuth, async (req, res) => {
  try {
    const periodParam = String((req.query.period || req.query.range || 'monthly')).toLowerCase();
    const period: 'daily'|'weekly'|'monthly' = ['daily','weekly','monthly'].includes(periodParam) ? (periodParam as any) : 'monthly';
    const bucketCountDefault = period === 'daily' ? 30 : period === 'weekly' ? 12 : 12;
    const bucketCount = Math.max(1, Math.min(180, parseInt(String(req.query.count || bucketCountDefault)) || bucketCountDefault));
    const { labels, edges } = buildBuckets(period, bucketCount);

    const globalStart = edges[0].start;
    const globalEnd = edges[edges.length - 1].end;
    const [members, tickets, redemptions, regs] = await Promise.all([
      prisma.member.findMany({ where: { registrationDate: { gte: globalStart, lte: globalEnd } }, select: { registrationDate: true, id: true } }),
      prisma.ticket.findMany({ where: { createdAt: { gte: globalStart, lte: globalEnd } }, select: { createdAt: true, memberId: true } }),
      prisma.pointRedemption.findMany({ where: { createdAt: { gte: globalStart, lte: globalEnd } }, select: { createdAt: true, memberId: true } }),
      prisma.eventRegistration.findMany({ where: { createdAt: { gte: globalStart, lte: globalEnd } }, select: { createdAt: true, memberId: true, status: true } }),
    ]);

    const newJoinSeries = labels.map((_, idx) => {
      const edge = edges[idx];
      return members.filter(m => m.registrationDate >= edge.start && m.registrationDate <= edge.end).length;
    });
    const eventParticipationSeries = labels.map((_, idx) => {
      const edge = edges[idx];
      return regs.filter(r => r.createdAt >= edge.start && r.createdAt <= edge.end).length;
    });
    const activeMembersSeries = labels.map((_, idx) => {
      const edge = edges[idx];
      const set = new Set<string>();
      tickets.forEach(t => { if (t.createdAt >= edge.start && t.createdAt <= edge.end) set.add(t.memberId); });
      redemptions.forEach(r => { if (r.createdAt >= edge.start && r.createdAt <= edge.end) set.add(r.memberId); });
      regs.forEach(r => { if (r.createdAt >= edge.start && r.createdAt <= edge.end) set.add(r.memberId); });
      return set.size;
    });

    return res.json({ period, labels, members: { newJoinSeries, activeMembersSeries, eventParticipationSeries } });
  } catch (e: any) {
    console.error('Analytics members error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// ==== Analytics: Promos (used by PointRedemption.promoId, views placeholder) ====
router.get('/analytics/promos', adminAuth, async (req, res) => {
  try {
    const periodParam = String((req.query.period || req.query.range || 'monthly')).toLowerCase();
    const period: 'daily'|'weekly'|'monthly' = ['daily','weekly','monthly'].includes(periodParam) ? (periodParam as any) : 'monthly';
    const bucketCountDefault = period === 'daily' ? 30 : period === 'weekly' ? 12 : 12;
    const bucketCount = Math.max(1, Math.min(180, parseInt(String(req.query.count || bucketCountDefault)) || bucketCountDefault));
    const { labels, edges } = buildBuckets(period, bucketCount);

    const globalStart = edges[0].start;
    const globalEnd = edges[edges.length - 1].end;
    const [promos, redemptions] = await Promise.all([
      prisma.promo.findMany({ select: { id: true, title: true, type: true } }),
      prisma.pointRedemption.findMany({ where: { createdAt: { gte: globalStart, lte: globalEnd }, promoId: { not: null } }, select: { createdAt: true, promoId: true } }),
    ]);

    const usedSeries = labels.map((_, idx) => {
      const edge = edges[idx];
      return redemptions.filter(r => r.createdAt >= edge.start && r.createdAt <= edge.end).length;
    });
    const byPromo = promos.map(p => ({ promoId: p.id, title: p.title, type: p.type, usedCount: redemptions.filter(r => r.promoId === p.id).length }));
    const viewsSeries = labels.map(() => 0);

    return res.json({ period, labels, usedSeries, viewsSeries, byPromo });
  } catch (e: any) {
    console.error('Analytics promos error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// ==== Analytics: Ticket Purchases (Tourism and Accommodation) ====
router.get('/analytics/tickets', adminAuth, async (req, res) => {
  try {
    const periodParam = String((req.query.period || req.query.range || 'monthly')).toLowerCase();
    const period: 'daily'|'weekly'|'monthly' = ['daily','weekly','monthly'].includes(periodParam) ? (periodParam as any) : 'monthly';
    const bucketCountDefault = period === 'daily' ? 30 : period === 'weekly' ? 12 : 12;
    const bucketCount = Math.max(1, Math.min(180, parseInt(String(req.query.count || bucketCountDefault)) || bucketCountDefault));
    const { labels, edges } = buildBuckets(period, bucketCount);

    const globalStart = edges[0].start;
    const globalEnd = edges[edges.length - 1].end;

    // Fetch successful bookings (CONFIRMED status)
    const [tourismBookings, accommodationBookings] = await Promise.all([
      prisma.tourismTicketBooking.findMany({
        where: {
          createdAt: { gte: globalStart, lte: globalEnd },
          status: 'CONFIRMED'
        },
        select: {
          createdAt: true,
          totalAmount: true,
          quantity: true,
          ticket: {
            select: {
              name: true,
              price: true
            }
          }
        }
      }),
      prisma.accommodationBooking.findMany({
        where: {
          createdAt: { gte: globalStart, lte: globalEnd },
          status: 'CONFIRMED'
        },
        select: {
          createdAt: true,
          totalAmount: true,
          rooms: true,
          guests: true,
          accommodation: {
            select: {
              name: true,
              pricePerNight: true
            }
          }
        }
      })
    ]);

    // Calculate series data for each time bucket
    const tourismSalesSeries = labels.map((_, idx) => {
      const edge = edges[idx];
      return tourismBookings
        .filter(booking => booking.createdAt >= edge.start && booking.createdAt <= edge.end)
        .length;
    });

    const tourismRevenueSeries = labels.map((_, idx) => {
      const edge = edges[idx];
      return tourismBookings
        .filter(booking => booking.createdAt >= edge.start && booking.createdAt <= edge.end)
        .reduce((sum, booking) => sum + booking.totalAmount, 0);
    });

    const accommodationSalesSeries = labels.map((_, idx) => {
      const edge = edges[idx];
      return accommodationBookings
        .filter(booking => booking.createdAt >= edge.start && booking.createdAt <= edge.end)
        .length;
    });

    const accommodationRevenueSeries = labels.map((_, idx) => {
      const edge = edges[idx];
      return accommodationBookings
        .filter(booking => booking.createdAt >= edge.start && booking.createdAt <= edge.end)
        .reduce((sum, booking) => sum + booking.totalAmount, 0);
    });

    // Calculate totals
    const totalTourismSales = tourismBookings.length;
    const totalTourismRevenue = tourismBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);
    const totalAccommodationSales = accommodationBookings.length;
    const totalAccommodationRevenue = accommodationBookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

    // Get top selling tourism tickets
    const tourismTicketStats = tourismBookings.reduce((acc: any, booking) => {
      const ticketName = booking.ticket.name;
      if (!acc[ticketName]) {
        acc[ticketName] = {
          name: ticketName,
          sales: 0,
          revenue: 0,
          quantity: 0
        };
      }
      acc[ticketName].sales += 1;
      acc[ticketName].revenue += booking.totalAmount;
      acc[ticketName].quantity += booking.quantity;
      return acc;
    }, {});

    const topTourismTickets = Object.values(tourismTicketStats)
      .sort((a: any, b: any) => b.sales - a.sales)
      .slice(0, 5);

    // Get top selling accommodations
    const accommodationStats = accommodationBookings.reduce((acc: any, booking) => {
      const accommodationName = booking.accommodation.name;
      if (!acc[accommodationName]) {
        acc[accommodationName] = {
          name: accommodationName,
          sales: 0,
          revenue: 0,
          rooms: 0,
          guests: 0
        };
      }
      acc[accommodationName].sales += 1;
      acc[accommodationName].revenue += booking.totalAmount;
      acc[accommodationName].rooms += booking.rooms;
      acc[accommodationName].guests += booking.guests;
      return acc;
    }, {});

    const topAccommodations = Object.values(accommodationStats)
      .sort((a: any, b: any) => b.sales - a.sales)
      .slice(0, 5);

    return res.json({
      period,
      labels,
      tourism: {
        salesSeries: tourismSalesSeries,
        revenueSeries: tourismRevenueSeries,
        totalSales: totalTourismSales,
        totalRevenue: totalTourismRevenue,
        topTickets: topTourismTickets
      },
      accommodation: {
        salesSeries: accommodationSalesSeries,
        revenueSeries: accommodationRevenueSeries,
        totalSales: totalAccommodationSales,
        totalRevenue: totalAccommodationRevenue,
        topAccommodations: topAccommodations
      },
      combined: {
        totalSales: totalTourismSales + totalAccommodationSales,
        totalRevenue: totalTourismRevenue + totalAccommodationRevenue,
        salesSeries: labels.map((_, idx) => tourismSalesSeries[idx] + accommodationSalesSeries[idx]),
        revenueSeries: labels.map((_, idx) => tourismRevenueSeries[idx] + accommodationRevenueSeries[idx])
      }
    });
  } catch (e: any) {
    console.error('Analytics tickets error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Members listing
router.get('/members', adminAuth, async (req, res) => {
  try {
    const { page, limit, search } = req.query as { page?: string; limit?: string; search?: string };
    const hasPagination = Boolean(page) || Boolean(limit);
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(500, parseInt(limit, 10) || 100)) : 100;

    const findOpts: any = {
      include: { user: true },
      orderBy: { registrationDate: 'desc' },
      take: limitNum,
    };
    
    // Add search functionality
    if (search && search.trim()) {
      const searchTerm = search.trim();
      findOpts.where = {
        OR: [
          {
            fullName: {
              contains: searchTerm
            }
          },
          {
            phone: {
              contains: searchTerm
            }
          },
          {
            user: {
              email: {
                contains: searchTerm
              }
            }
          }
        ]
      };
    }
    
    if (hasPagination) {
      findOpts.skip = (pageNum - 1) * limitNum;
    }

    const list = await prisma.member.findMany(findOpts);

    if (hasPagination) {
      try {
        const countWhere = search && search.trim() ? findOpts.where : {};
        const total = await prisma.member.count({ where: countWhere });
        res.setHeader('X-Total-Count', String(total));
        res.setHeader('X-Page', String(pageNum));
        res.setHeader('X-Limit', String(limitNum));
      } catch {}
    }
    
    // Return in the format expected by frontend
    res.json({ members: list });
  } catch (e: any) {
    console.error('Admin members error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Add points to member
router.post('/members/:id/points/add', adminAuth, async (req, res) => {
  try {
    const memberId = req.params.id;
    const { points, reason } = req.body as { points: number; reason?: string };
    if (!points || points <= 0) return res.status(400).json({ message: 'Invalid points' });
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    const adminUser = await prisma.user.findUnique({ where: { id: req.user?.uid } });
    const adminId = adminUser?.id || req.user?.uid || 'unknown';
    const adminName = adminUser?.email || 'admin';
    const updated = await prisma.member.update({ where: { id: memberId }, data: { pointsBalance: member.pointsBalance + points } });
    try {
      await prisma.pointAdjustment.create({ data: { memberId, adminId, adminName, type: 'ADD' as any, points, reason, previousBalance: member.pointsBalance, newBalance: updated.pointsBalance } });
    } catch (err) {
      console.error('Failed to record point adjustment (add):', err);
      try {
        const id = uuidv4();
        await prisma.$executeRaw`INSERT INTO PointAdjustment (id, memberId, adminId, adminName, type, points, reason, previousBalance, newBalance, createdAt) VALUES (${id}, ${memberId}, ${adminId}, ${adminName}, ${'ADD'}, ${points}, ${reason ?? null}, ${member.pointsBalance ?? null}, ${updated.pointsBalance ?? null}, ${new Date()})`;
      } catch (e2) {
        console.error('Fallback insert adjustment (add) failed:', e2);
      }
    }
    return res.json(updated);
  } catch (e: any) {
    console.error('Admin add points error:', e);
    return res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Subtract points from member
router.post('/members/:id/points/subtract', adminAuth, async (req, res) => {
  try {
    const memberId = req.params.id;
    const { points, reason } = req.body as { points: number; reason?: string };
    if (!points || points <= 0) return res.status(400).json({ message: 'Invalid points' });
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if ((member.pointsBalance ?? 0) < points) return res.status(400).json({ message: 'Not enough points' });
    const adminUser = await prisma.user.findUnique({ where: { id: req.user?.uid } });
    const adminId = adminUser?.id || req.user?.uid || 'unknown';
    const adminName = adminUser?.email || 'admin';
    const updated = await prisma.member.update({ where: { id: memberId }, data: { pointsBalance: (member.pointsBalance ?? 0) - points } });
    try {
      await prisma.pointAdjustment.create({ data: { memberId, adminId, adminName, type: 'SUBTRACT' as any, points, reason, previousBalance: member.pointsBalance, newBalance: updated.pointsBalance } });
    } catch (err) {
      console.error('Failed to record point adjustment (subtract):', err);
      try {
        const id = uuidv4();
        await prisma.$executeRaw`INSERT INTO PointAdjustment (id, memberId, adminId, adminName, type, points, reason, previousBalance, newBalance, createdAt) VALUES (${id}, ${memberId}, ${adminId}, ${adminName}, ${'SUBTRACT'}, ${points}, ${reason ?? null}, ${member.pointsBalance ?? null}, ${updated.pointsBalance ?? null}, ${new Date()})`;
      } catch (e2) {
        console.error('Fallback insert adjustment (subtract) failed:', e2);
      }
    }
    return res.json(updated);
  } catch (e: any) {
    console.error('Admin subtract points error:', e);
    return res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Member point redemptions (history) for admin view
router.get('/members/:id/points/redemptions', adminAuth, async (req, res) => {
  try {
    const memberId = req.params.id;
    const list = await prisma.pointRedemption.findMany({ where: { memberId }, orderBy: { createdAt: 'desc' } });
    return res.json({ redemptions: list });
  } catch (e: any) {
    console.error('Admin list point redemptions error:', e);
    return res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Registration codes
router.get('/registration-codes', adminAuth, async (req, res) => {
  try {
    const codes = await prisma.registrationCode.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(codes);
  } catch (e: any) {
    console.error('Get registration codes error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.post('/registration-codes', adminAuth, async (req, res) => {
  try {
    const { code, expiresAt, isActive, quota } = req.body as { 
      code?: string; 
      expiresAt?: string; 
      isActive?: boolean; 
      quota?: number;
    };
    const payload = {
      code: code || `CODE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      isActive: isActive ?? true,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      quota: quota || null,
      usedCount: 0,
      createdBy: 'admin',
    };
    const created = await prisma.registrationCode.create({ data: payload });
    res.json(created);
  } catch (e: any) {
    console.error('Create registration code error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.put('/registration-codes/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, expiresAt, isActive, quota } = req.body as { 
      code?: string; 
      expiresAt?: string; 
      isActive?: boolean; 
      quota?: number;
    };
    
    const updateData: any = {};
    if (typeof code !== 'undefined') updateData.code = code;
    if (typeof expiresAt !== 'undefined') updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (typeof isActive !== 'undefined') updateData.isActive = isActive;
    if (typeof quota !== 'undefined') updateData.quota = quota;

    const updated = await prisma.registrationCode.update({
      where: { id },
      data: updateData
    });
    res.json(updated);
  } catch (e: any) {
    console.error('Update registration code error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.delete('/registration-codes/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.registrationCode.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    console.error('Delete registration code error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Announcements
router.post('/announcements', adminAuth, async (req, res) => {
  const { title, description, imageUrl } = req.body as { title: string; description: string; imageUrl?: string };
  if (!title || !description) return res.status(400).json({ message: 'Missing fields' });
  const created = await prisma.announcement.create({ data: { title, description, imageUrl, createdBy: 'admin', postedAt: new Date() } });
  res.json(created);
});

// Events CRUD
router.post('/events', adminAuth, upload.single('image'), async (req: any, res) => {
  try {
    const { title, description, eventDate, quota, location, terms, promoType, promoStartDate, promoEndDate } = req.body as { title: string; description: string; eventDate: string; quota: string; location?: string; terms?: string; promoType?: string; promoStartDate?: string; promoEndDate?: string };
    if (!title || !description || !eventDate || !quota) return res.status(400).json({ message: 'Missing fields' });
    let imageUrl: string | undefined = undefined;
    if (req.file) {
      if (cloudinary.config().cloud_name) {
        // Since upload_stream needs stream piping, fallback to data upload when using memoryStorage
        const temp = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, { folder: 'thelodge/events' });
        imageUrl = temp.secure_url;
      } else {
        // Fallback: simpan file ke /uploads dan bangun URL berdasarkan host/port aktif
        const uploadsDir = path.join(process.cwd(), 'uploads');
        try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
        const filename = `event_${Date.now()}_${Math.random().toString(36).slice(2)}.${(req.file.originalname.split('.').pop() || 'jpg')}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, req.file.buffer);
        const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
        imageUrl = `${baseUrl}/files/uploads/${filename}`;
      }
    }
    const created = await prisma.event.create({ data: {
      title,
      description,
      eventDate: dayjs(eventDate).toDate(),
      quota: parseInt(quota, 10),
      imageUrl,
      location: location || undefined,
      terms: terms || undefined,
    } });
    // Optional: auto-create linked promo based on provided category and date range
    const typeUpper = (promoType || '').toUpperCase();
    if (typeUpper === 'EVENT' || typeUpper === 'EXCLUSIVE_MEMBER') {
      if (promoStartDate && promoEndDate) {
        try {
          await prisma.promo.create({ data: {
            title,
            description,
            startDate: dayjs(promoStartDate).toDate(),
            endDate: dayjs(promoEndDate).toDate(),
            imageUrl,
            type: typeUpper as any,
            quota: parseInt(quota, 10),
            eventId: created.id,
            showMoreButton: true,
            showJoinButton: true,
          } });
        } catch (e) {
          console.error('Create promo for event failed:', e);
        }
      }
    }
    res.json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});





// Tambahkan API CRUD Admins
router.get('/admins', adminAuth, async (_req, res) => {
  try {
    const list = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, fullName: true, email: true, adminRole: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(list);
  } catch (e: any) {
    console.error('List admins error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.post('/admins', adminAuth, async (req, res) => {
  try {
    const { fullName, email, password, adminRole } = req.body as { fullName?: string; email?: string; password?: string; adminRole?: 'CASHIER' | 'MODERATOR' | 'OWNER' | 'SUPER_ADMIN' };
    if (!fullName || !email || !password || !adminRole) return res.status(400).json({ message: 'Missing fields' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({ data: { email, password: hashed, role: 'ADMIN' as any, fullName, isActive: true, adminRole } });
    res.json({ id: created.id, fullName: created.fullName, email: created.email, adminRole: created.adminRole, isActive: created.isActive });
  } catch (e: any) {
    console.error('Create admin error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.put('/admins/:id', adminAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { fullName, email, password, adminRole, isActive } = req.body as { fullName?: string; email?: string; password?: string; adminRole?: 'CASHIER' | 'MODERATOR' | 'OWNER' | 'SUPER_ADMIN'; isActive?: boolean };
    const data: any = {};
    if (typeof fullName !== 'undefined') data.fullName = fullName;
    if (typeof email !== 'undefined') data.email = email;
    if (typeof adminRole !== 'undefined') data.adminRole = adminRole;
    if (typeof isActive !== 'undefined') data.isActive = !!isActive;
    if (password && password.trim()) {
      data.password = await bcrypt.hash(password, 10);
    }
    const updated = await prisma.user.update({ where: { id }, data });
    res.json({ id: updated.id, fullName: updated.fullName, email: updated.email, adminRole: updated.adminRole, isActive: updated.isActive });
  } catch (e: any) {
    console.error('Update admin error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.delete('/admins/:id', adminAuth, async (req, res) => {
  try {
    const id = req.params.id;
    // Cegah menghapus diri sendiri
    if (req.user?.uid === id) return res.status(400).json({ message: 'Cannot delete your own account' });
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    console.error('Delete admin error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Member point adjustments (history) for admin view with optional date filter
router.get('/members/:id/points/adjustments', adminAuth, async (req, res) => {
  try {
    const memberId = req.params.id;
    const { start, end } = req.query as { start?: string; end?: string };
    const where: any = { memberId };
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = new Date(start);
      if (end) where.createdAt.lte = new Date(end);
    }
    try {
      const list = await prisma.pointAdjustment.findMany({ where, orderBy: { createdAt: 'desc' } });
      return res.json({ adjustments: list });
    } catch (e) {
      // Fallback raw query jika client belum ter-generate
      // Gunakan $queryRaw dengan parameter agar aman dan kompatibel
      let list: any[] = [];
      if (start && end) {
        list = await prisma.$queryRaw`SELECT * FROM PointAdjustment WHERE memberId = ${memberId} AND createdAt >= ${new Date(start)} AND createdAt <= ${new Date(end)} ORDER BY createdAt DESC`;
      } else if (start) {
        list = await prisma.$queryRaw`SELECT * FROM PointAdjustment WHERE memberId = ${memberId} AND createdAt >= ${new Date(start)} ORDER BY createdAt DESC`;
      } else if (end) {
        list = await prisma.$queryRaw`SELECT * FROM PointAdjustment WHERE memberId = ${memberId} AND createdAt <= ${new Date(end)} ORDER BY createdAt DESC`;
      } else {
        list = await prisma.$queryRaw`SELECT * FROM PointAdjustment WHERE memberId = ${memberId} ORDER BY createdAt DESC`;
      }
      return res.json({ adjustments: Array.isArray(list) ? list : [] });
    }
  } catch (e: any) {
    console.error('Admin list point adjustments error:', e);
    return res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.get('/activities', adminAuth, async (req, res) => {
  try {
    const { start, end, adminId, method, page, limit } = req.query as { start?: string; end?: string; adminId?: string; method?: string; page?: string; limit?: string };
    const where: any = {};
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = new Date(start);
      if (end) where.createdAt.lte = new Date(end);
    }
    if (adminId) where.adminId = String(adminId);
    if (method) where.method = String(method).toUpperCase();

    const hasPagination = Boolean(page) || Boolean(limit);
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(1000, parseInt(limit, 10) || 500)) : 500;

    try {
      const list = await (prisma as any).adminActivity.findMany({ where, orderBy: { createdAt: 'desc' }, take: limitNum, skip: hasPagination ? (pageNum - 1) * limitNum : undefined });
      if (hasPagination) {
        try {
          const total = await (prisma as any).adminActivity.count({ where });
          res.setHeader('X-Total-Count', String(total));
          res.setHeader('X-Page', String(pageNum));
          res.setHeader('X-Limit', String(limitNum));
        } catch {}
      }
      return res.json({ activities: list });
    } catch {
      // Fallback raw query dengan pagination
      const clauses: string[] = [];
      const params: any[] = [];
      if (start) { clauses.push(`createdAt >= ?`); params.push(new Date(start)); }
      if (end) { clauses.push(`createdAt <= ?`); params.push(new Date(end)); }
      if (adminId) { clauses.push(`adminId = ?`); params.push(String(adminId)); }
      if (method) { clauses.push(`method = ?`); params.push(String(method).toUpperCase()); }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const lim = limitNum;
      const off = hasPagination ? (pageNum - 1) * limitNum : 0;
      const rows: any = await prisma.$queryRawUnsafe(`SELECT * FROM AdminActivity ${whereSql} ORDER BY createdAt DESC LIMIT ? OFFSET ?`, ...params, lim, off);
      if (hasPagination) {
        try {
          const countRows: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM AdminActivity ${whereSql}`, ...params);
          const total = Array.isArray(countRows) && countRows.length ? Number(countRows[0].cnt || 0) : 0;
          res.setHeader('X-Total-Count', String(total));
          res.setHeader('X-Page', String(pageNum));
          res.setHeader('X-Limit', String(limitNum));
        } catch {}
      }
      return res.json({ activities: rows });
    }
  } catch (e: any) {
    console.error('Admin activities error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Slider Images management
router.post('/slider-images', adminAuth, async (req: any, res) => {
  try {
    console.log('Slider creation request body:', req.body);
    
    const { title, description, imageUrl, linkUrl, order, isActive, position } = req.body as { 
      title?: string; 
      description?: string; 
      imageUrl?: string; 
      linkUrl?: string; 
      order?: string | number; 
      isActive?: boolean; 
      position?: string; 
    };
    
    console.log('Parsed fields:', { title, description, imageUrl, linkUrl, order, isActive, position });
    
    if (!imageUrl || !imageUrl.trim()) {
      console.log('Error: Image URL is missing or empty');
      return res.status(400).json({ message: 'Image URL is required' });
    }
    
    if (!title || !title.trim()) {
      console.log('Error: Title is missing or empty');
      return res.status(400).json({ message: 'Title is required' });
    }

    const adminUser = await prisma.user.findUnique({ where: { id: req.user?.uid } });
    const createdBy = adminUser?.email || adminUser?.id || 'admin';

    // Determine next position if not provided
    let posNum: number | undefined = undefined;
    try {
      const list = await (prisma as any).sliderImage.findMany({ select: { position: true } });
      const max = list.reduce((m: number, it: any) => Math.max(m, Number(it?.position || 0)), 0);
      posNum = position ? Number(position) : order ? Number(order) : (max + 1);
    } catch {
      try { await prisma.$executeRawUnsafe(`ALTER TABLE SliderImage ADD COLUMN position INT NULL`); } catch {}
      const rows: any = await prisma.$queryRawUnsafe(`SELECT MAX(position) as mx FROM SliderImage`);
      const max = Array.isArray(rows) && rows.length ? Number(rows[0].mx || 0) : 0;
      posNum = position ? Number(position) : order ? Number(order) : (max + 1);
    }

    // Try prisma model first; fallback to raw SQL if needed
    try {
      const sliderData = { 
        imageUrl, 
        title, 
        description: description || null,
        linkUrl: linkUrl || null,
        isActive: isActive !== undefined ? isActive : true,
        createdBy, 
        position: posNum 
      };
      const created = await (prisma as any).sliderImage.create({ data: sliderData });
      return res.json(created);
    } catch (e1) {
      try {
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS SliderImage (
          id CHAR(36) NOT NULL,
          imageUrl VARCHAR(255) NOT NULL,
          title VARCHAR(191) NULL,
          description TEXT NULL,
          linkUrl VARCHAR(255) NULL,
          isActive BOOLEAN DEFAULT TRUE,
          position INT NULL,
          createdAt DATETIME(3) NOT NULL,
          createdBy VARCHAR(191) NULL,
          PRIMARY KEY (id)
        )`);
      } catch {}
      const id = uuidv4();
      await prisma.$executeRaw`INSERT INTO SliderImage (id, imageUrl, title, description, linkUrl, isActive, position, createdAt, createdBy) VALUES (${id}, ${imageUrl}, ${title ?? null}, ${description ?? null}, ${linkUrl ?? null}, ${isActive !== undefined ? isActive : true}, ${posNum ?? null}, ${new Date()}, ${createdBy ?? null})`;
      const row: any = { 
        id, 
        imageUrl, 
        title: title ?? null, 
        description: description ?? null,
        linkUrl: linkUrl ?? null,
        isActive: isActive !== undefined ? isActive : true,
        position: posNum ?? null, 
        createdAt: new Date(), 
        createdBy: createdBy ?? null 
      };
      return res.json(row);
    }
  } catch (e: any) {
    console.error('Admin slider upload error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.get('/slider-images', adminAuth, async (req: any, res) => {
  try {
    try {
      const list = await (prisma as any).sliderImage.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'desc' }] });
      return res.json(list);
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
      const list: any = await prisma.$queryRawUnsafe(`SELECT id, imageUrl, title, position, createdAt, createdBy FROM SliderImage ORDER BY position ASC, createdAt DESC`);
      return res.json(list);
    }
  } catch (e: any) {
    console.error('Admin slider list error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Update slider image (title/position)
router.put('/slider-images/:id', adminAuth, async (req: any, res) => {
  try {
    const id = req.params.id;
    const { title, position } = req.body as { title?: string; position?: number | string };
    const posNum = typeof position !== 'undefined' ? Number(position) : undefined;
    try {
      const updated = await (prisma as any).sliderImage.update({ where: { id }, data: { title: (typeof title !== 'undefined' ? title : undefined), position: (typeof posNum !== 'undefined' ? posNum : undefined) } });
      return res.json(updated);
    } catch (e1) {
      try { await prisma.$executeRawUnsafe(`ALTER TABLE SliderImage ADD COLUMN position INT NULL`); } catch {}
      const rows: any = await prisma.$executeRaw`UPDATE SliderImage SET title = ${typeof title !== 'undefined' ? title : undefined}, position = ${typeof posNum !== 'undefined' ? posNum : undefined} WHERE id = ${id}`;
      return res.json({ success: true });
    }
  } catch (e: any) {
    console.error('Admin slider update error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});
router.delete('/slider-images/:id', adminAuth, async (req: any, res) => {
  try {
    const id = req.params.id;
    try {
      await (prisma as any).sliderImage.delete({ where: { id } });
      return res.json({ success: true });
    } catch (e1) {
      await prisma.$executeRaw`DELETE FROM SliderImage WHERE id = ${id}`;
      return res.json({ success: true });
    }
  } catch (e: any) {
    console.error('Admin slider delete error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.get('/events', adminAuth, async (_req, res) => {
  const list = await prisma.event.findMany({ orderBy: { eventDate: 'asc' } });
  res.json(list);
});

router.get('/events/:id', adminAuth, async (req, res) => {
  const ev = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!ev) return res.status(404).json({ message: 'Event not found' });
  res.json(ev);
});

// Tambahan: daftar peserta event + status hadir
router.get('/events/:id/participants', adminAuth, async (req, res) => {
  const eventId = req.params.id;
  const ev = await prisma.event.findUnique({ where: { id: eventId } });
  if (!ev) return res.status(404).json({ message: 'Event not found' });
  const regs = await prisma.eventRegistration.findMany({
    where: { eventId },
    include: { member: { include: { user: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const participants = regs.map((r) => ({
    registrationId: r.id,
    memberId: r.memberId,
    fullName: r.member.fullName,
    email: r.member.user.email,
    phone: r.member.phone,
    status: r.status,
    redeemedAt: r.redeemedAt,
    createdAt: r.createdAt,
  }));
  res.json({ event: { id: ev.id, title: ev.title, eventDate: ev.eventDate, quota: ev.quota }, participants });
});

router.put('/events/:id', adminAuth, upload.single('image'), async (req: any, res) => {
  const { title, description, eventDate, quota, location, terms, promoType, promoStartDate, promoEndDate } = req.body as { title?: string; description?: string; eventDate?: string; quota?: string; location?: string; terms?: string; promoType?: string; promoStartDate?: string; promoEndDate?: string };
  let imageUrl: string | undefined = undefined;
  if (req.file && cloudinary.config().cloud_name) {
    const temp = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, { folder: 'thelodge/events' });
    imageUrl = temp.secure_url;
  }
  const data: any = {};
  if (title) data.title = title;
  if (description) data.description = description;
  if (eventDate) data.eventDate = dayjs(eventDate).toDate();
  if (quota) data.quota = parseInt(quota, 10);
  if (imageUrl) data.imageUrl = imageUrl;
  if (typeof location !== 'undefined') data.location = location || null;
  if (typeof terms !== 'undefined') data.terms = terms || null;
  const updated = await prisma.event.update({ where: { id: req.params.id }, data });

  // Optional: upsert linked promo when request contains promo fields
  const typeUpper = (promoType || '').toUpperCase();
  if (typeUpper === 'EVENT' || typeUpper === 'EXCLUSIVE_MEMBER') {
    const promoData: any = {};
    if (title) promoData.title = title;
    if (description) promoData.description = description;
    if (promoStartDate) promoData.startDate = dayjs(promoStartDate).toDate();
    if (promoEndDate) promoData.endDate = dayjs(promoEndDate).toDate();
    if (imageUrl) promoData.imageUrl = imageUrl;
    promoData.type = typeUpper;
    if (quota) promoData.quota = parseInt(quota, 10);
    promoData.eventId = updated.id;

    // Find existing promo linked to this event with same category
    const existing = await prisma.promo.findFirst({ where: { eventId: updated.id, type: typeUpper as any } });
    if (existing) {
      try {
        await prisma.promo.update({ where: { id: existing.id }, data: promoData });
      } catch (e) {
        console.error('Update promo for event failed:', e);
      }
    } else {
      try {
        await prisma.promo.create({ data: { title: updated.title, description: updated.description, startDate: promoData.startDate || dayjs().toDate(), endDate: promoData.endDate || dayjs().toDate(), imageUrl: promoData.imageUrl || undefined, type: typeUpper as any, quota: (typeof updated.quota === 'number' ? updated.quota : undefined), eventId: updated.id, showMoreButton: true, showJoinButton: true } });
      } catch (e) {
        console.error('Create promo for event failed:', e);
      }
    }
  }

  res.json(updated);
});

router.delete('/events/:id', adminAuth, async (req, res) => {
  await prisma.event.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// QR Redeem Center
router.post('/redeem', adminAuth, async (req, res) => {
  const { data, hash, friendlyCode } = req.body as { data?: string; hash?: string; friendlyCode?: string };
  
  // Support both traditional QR code and friendly voucher code
  let payload: any = null;
  
  if (friendlyCode) {
    // Try to verify using friendly voucher code
    // First, we need to find the voucher with this friendly code
    const ticket = await prisma.ticket.findFirst({ where: { friendlyCode } });
    if (ticket) {
      const ticketPayload = { type: 'ticket', ticketName: ticket.name, memberId: ticket.memberId, ticketId: ticket.id };
      if (verifyFriendlyVoucherCode(friendlyCode, ticketPayload)) {
        payload = ticketPayload;
      }
    }
    
    if (!payload) {
      const pointRedemption = await prisma.pointRedemption.findFirst({ where: { friendlyCode } });
      if (pointRedemption) {
        const pointPayload = { type: 'points', memberId: pointRedemption.memberId, redemptionId: pointRedemption.id };
        if (verifyFriendlyVoucherCode(friendlyCode, pointPayload)) {
          payload = pointPayload;
        }
      }
    }
    
    if (!payload) {
      const eventReg = await prisma.eventRegistration.findFirst({ where: { friendlyCode } });
      if (eventReg) {
        const eventPayload = { type: 'event', eventId: eventReg.eventId, memberId: eventReg.memberId, registrationId: eventReg.id };
        if (verifyFriendlyVoucherCode(friendlyCode, eventPayload)) {
          payload = eventPayload;
        }
      }
    }
    
    if (!payload) {
      return res.status(400).json({ message: 'Invalid voucher code' });
    }
  } else {
    // Traditional QR code verification
    if (!data || !hash) return res.status(400).json({ message: 'Missing data' });
    payload = verifyPayload(data, hash);
    if (!payload) return res.status(400).json({ message: 'Invalid QR' });
  }

  try {
    // Ambil info admin untuk pencatatan
    const adminUser = await prisma.user.findUnique({ where: { id: req.user?.uid } });
    const adminId = adminUser?.id || req.user?.uid || 'unknown';
    const adminName = adminUser?.email || 'admin';

    // Siapkan variabel umum untuk RedeemHistory
    let memberId = payload.memberId as string;
    let memberName = '';
    let voucherType: VoucherType = 'TICKET' as any;
    let voucherId = '';
    let voucherLabel: string | undefined = undefined;
    const redeemedAt = new Date();

    if (payload.type === 'ticket') {
      const ticket = await prisma.ticket.findUnique({ where: { id: payload.ticketId } });
      if (!ticket || ticket.memberId !== payload.memberId) return res.status(404).json({ message: 'Ticket not found' });
      if (ticket.status === TicketStatus.REDEEMED) return res.status(400).json({ message: 'Ticket already redeemed' });
      const updated = await prisma.ticket.update({ where: { id: ticket.id }, data: { status: TicketStatus.REDEEMED, redeemedAt } });
      const member = await prisma.member.findUnique({ where: { id: ticket.memberId } });
      memberName = member?.fullName || '';
      voucherType = 'TICKET' as any;
      voucherId = ticket.id;
      voucherLabel = ticket.name;
      // Generate proof
      const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
      const qrUrl = data && hash ? `${baseUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}` : `${baseUrl}/api/verify?friendlyCode=${ticket.friendlyCode}`;
      const qrDataURL = await generateQRDataURL(qrUrl);
      const uploadsDir = path.join(process.cwd(), 'uploads', 'redeem-proofs');
      try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
      const filename = `redeem_${voucherId}_${Date.now()}.pdf`;
      const outputPath = path.join(uploadsDir, filename);
      await createRedeemProofPDF({ outputPath, memberName, voucherType: 'Tiket Gratis Member', voucherLabel, redeemedAt, qrDataUrl: qrDataURL, adminName, companyName: 'The Lodge Family' });
      const proofUrl = `${baseUrl}/files/uploads/redeem-proofs/${filename}`;
      await prisma.redeemHistory.create({ data: { memberId, memberName, voucherType, voucherId, voucherLabel, redeemedAt, adminId, adminName, proofUrl } });
      return res.json({ success: true, ticket: updated, proofUrl });
    }
    if (payload.type === 'points') {
      const pr = await prisma.pointRedemption.findUnique({ where: { id: payload.redemptionId } });
      if (!pr || pr.memberId !== payload.memberId) return res.status(404).json({ message: 'Redemption not found' });
      if (pr.status === RedemptionStatus.REDEEMED) return res.status(400).json({ message: 'Already redeemed' });
      const updated = await prisma.pointRedemption.update({ where: { id: pr.id }, data: { status: RedemptionStatus.REDEEMED, redeemedAt } });
      const member = await prisma.member.findUnique({ where: { id: pr.memberId } });
      memberName = member?.fullName || '';
      voucherType = 'POINTS' as any;
      voucherId = pr.id;
      voucherLabel = pr.rewardName;
      const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
      const qrUrl = data && hash ? `${baseUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}` : `${baseUrl}/api/verify?friendlyCode=${pr.friendlyCode}`;
      const qrDataURL = await generateQRDataURL(qrUrl);
      const uploadsDir = path.join(process.cwd(), 'uploads', 'redeem-proofs');
      try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
      const filename = `redeem_${voucherId}_${Date.now()}.pdf`;
      const outputPath = path.join(uploadsDir, filename);
      await createRedeemProofPDF({ outputPath, memberName, voucherType: 'Redeem Poin', voucherLabel, redeemedAt, qrDataUrl: qrDataURL, adminName, companyName: 'The Lodge Family' });
      const proofUrl = `${baseUrl}/files/uploads/redeem-proofs/${filename}`;
      await prisma.redeemHistory.create({ data: { memberId, memberName, voucherType, voucherId, voucherLabel, redeemedAt, adminId, adminName, proofUrl } });
      return res.json({ success: true, redemption: updated, proofUrl });
    }
    if (payload.type === 'event') {
      const er = await prisma.eventRegistration.findUnique({ where: { id: payload.registrationId } });
      if (!er || er.memberId !== payload.memberId || er.eventId !== payload.eventId) return res.status(404).json({ message: 'Registration not found' });
      if (er.status === RegistrationStatus.REDEEMED) return res.status(400).json({ message: 'Already redeemed' });
      const updated = await prisma.eventRegistration.update({ where: { id: er.id }, data: { status: RegistrationStatus.REDEEMED, redeemedAt } });
      const member = await prisma.member.findUnique({ where: { id: er.memberId } });
      const ev = await prisma.event.findUnique({ where: { id: er.eventId } });
      memberName = member?.fullName || '';
      voucherType = 'EVENT' as any;
      voucherId = er.id;
      voucherLabel = ev?.title;
      const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
      const qrUrl = data && hash ? `${baseUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}` : `${baseUrl}/api/verify?friendlyCode=${er.friendlyCode}`;
      const qrDataURL = await generateQRDataURL(qrUrl);
      const uploadsDir = path.join(process.cwd(), 'uploads', 'redeem-proofs');
      try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
      const filename = `redeem_${voucherId}_${Date.now()}.pdf`;
      const outputPath = path.join(uploadsDir, filename);
      await createRedeemProofPDF({ outputPath, memberName, voucherType: 'Event Eksklusif Member', voucherLabel, redeemedAt, qrDataUrl: qrDataURL, adminName, companyName: 'The Lodge Family' });
      const proofUrl = `${baseUrl}/files/uploads/redeem-proofs/${filename}`;
      await prisma.redeemHistory.create({ data: { memberId, memberName, voucherType, voucherId, voucherLabel, redeemedAt, adminId, adminName, proofUrl } });
      return res.json({ success: true, registration: updated, proofUrl });
    }
    return res.status(400).json({ message: 'Unknown payload type' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Daftar riwayat redeem dengan filter
router.get('/redeem-history', adminAuth, async (req, res) => {
  try {
    const { type, from, to, member } = req.query as { type?: string; from?: string; to?: string; member?: string };
    const where: any = {};
    if (type && ['TICKET', 'POINTS', 'EVENT', 'TOURISM_TICKET', 'BENEFIT'].includes(type)) where.voucherType = type;
    if (from || to) {
      where.redeemedAt = {};
      if (from) where.redeemedAt.gte = new Date(from);
      if (to) where.redeemedAt.lte = new Date(to);
    }
    if (member && member.trim()) {
      where.memberName = { contains: member.trim() };
    }
    const list = await prisma.redeemHistory.findMany({ where, orderBy: { redeemedAt: 'desc' }, take: 200 });
    res.json(list);
  } catch (e: any) {
    console.error('List redeem history error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Promos CRUD
router.get('/promos', adminAuth, async (_req, res) => {
  try {
    const list = await prisma.promo.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(list);
  } catch (e: any) {
    console.error('Admin promos list error:', e);
    return res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.post('/promos', adminAuth, upload.single('image'), async (req: any, res) => {
  try {
    const { title, description, startDate, endDate, type, pointsRequired, maxRedeem, quota, eventId, showMoreButton, showJoinButton } = req.body as { title: string; description: string; startDate: string; endDate: string; type: PromoType; pointsRequired?: string; maxRedeem?: string; quota?: string; eventId?: string; showMoreButton?: string; showJoinButton?: string };

    let imageUrl: string | undefined = undefined;
    if (req.file) {
      if (cloudinary.config().cloud_name) {
        const temp = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, { folder: 'thelodge/promos' });
        imageUrl = temp.secure_url;
      } else {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
        const filename = `promo_${Date.now()}_${Math.random().toString(36).slice(2)}.${(req.file.originalname.split('.').pop() || 'jpg')}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, req.file.buffer);
        const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
        imageUrl = `${baseUrl}/files/uploads/${filename}`;
      }
    }

    const data: any = {
      title,
      description,
      startDate: dayjs(startDate).toDate(),
      endDate: dayjs(endDate).toDate(),
      type,
    };
    if (imageUrl) data.imageUrl = imageUrl;
    if (type === 'REDEEM_POINTS') {
      if (pointsRequired) data.pointsRequired = parseInt(pointsRequired, 10);
      if (maxRedeem) data.maxRedeem = parseInt(maxRedeem, 10);
    }
    if (type === 'EVENT' || type === 'EXCLUSIVE_MEMBER') {
      if (quota) data.quota = parseInt(quota, 10);
      if (eventId) data.eventId = String(eventId);
    }
    if (type === 'FREE_BENEFIT_NEW_REG') {
      if (quota) data.quota = parseInt(quota, 10);
      if (maxRedeem) data.maxRedeem = parseInt(maxRedeem, 10);
    }
    // Parse show buttons (string->boolean), Prisma default covers undefined
    if (typeof showMoreButton !== 'undefined') {
      const val = String(showMoreButton).toLowerCase();
      data.showMoreButton = (val === 'true' || val === '1' || val === 'on');
    }
    if (typeof showJoinButton !== 'undefined') {
      const val = String(showJoinButton).toLowerCase();
      data.showJoinButton = (val === 'true' || val === '1' || val === 'on');
    }

    const created = await prisma.promo.create({ data });
    return res.json(created);
  } catch (e: any) {
    console.error('Admin promo create error:', e);
    return res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.put('/promos/:id', adminAuth, upload.single('image'), async (req: any, res) => {
  try {
    const id = req.params.id;
    const { title, description, startDate, endDate, type, pointsRequired, maxRedeem, quota, eventId, showMoreButton, showJoinButton } = req.body as { title?: string; description?: string; startDate?: string; endDate?: string; type?: PromoType; pointsRequired?: string; maxRedeem?: string; quota?: string; eventId?: string; showMoreButton?: string; showJoinButton?: string };

    const data: any = {};
    if (title) data.title = title;
    if (description) data.description = description;
    if (startDate) data.startDate = dayjs(startDate).toDate();
    if (endDate) data.endDate = dayjs(endDate).toDate();
    if (type) data.type = type;
    if (type === 'REDEEM_POINTS') {
      if (pointsRequired) data.pointsRequired = parseInt(pointsRequired, 10);
      if (maxRedeem) data.maxRedeem = parseInt(maxRedeem, 10);
    }
    if (type === 'EVENT' || type === 'EXCLUSIVE_MEMBER') {
      if (quota) data.quota = parseInt(quota, 10);
    }
    if (type === 'FREE_BENEFIT_NEW_REG') {
      if (quota) data.quota = parseInt(quota, 10);
      if (maxRedeem) data.maxRedeem = parseInt(maxRedeem, 10);
    }
    if (typeof eventId !== 'undefined') {
      data.eventId = eventId === '' ? null : String(eventId);
    }
    // Parse show buttons (string->boolean)
    if (typeof showMoreButton !== 'undefined') {
      const val = String(showMoreButton).toLowerCase();
      data.showMoreButton = (val === 'true' || val === '1' || val === 'on');
    }
    if (typeof showJoinButton !== 'undefined') {
      const val = String(showJoinButton).toLowerCase();
      data.showJoinButton = (val === 'true' || val === '1' || val === 'on');
    }

    if (req.file) {
      if (cloudinary.config().cloud_name) {
        const temp = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, { folder: 'thelodge/promos' });
        data.imageUrl = temp.secure_url;
      } else {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
        const filename = `promo_${Date.now()}_${Math.random().toString(36).slice(2)}.${(req.file.originalname.split('.').pop() || 'jpg')}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, req.file.buffer);
        const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
        data.imageUrl = `${baseUrl}/files/uploads/${filename}`;
      }
    }

    const updated = await prisma.promo.update({ where: { id }, data });
    return res.json(updated);
  } catch (e: any) {
    console.error('Admin promo update error:', e);
    return res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.delete('/promos/:id', adminAuth, async (req, res) => {
  try {
    await prisma.promo.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (e: any) {
    console.error('Admin promo delete error:', e);
    return res.status(500).json({ message: e?.message || 'Server error' });
  }
});

/* duplicate admins block removed */
// Member point adjustments (history) for admin view with optional date filter
router.get('/members/:id/points/adjustments', adminAuth, async (req, res) => {
  try {
    const memberId = req.params.id;
    const { start, end } = req.query as { start?: string; end?: string };
    const where: any = { memberId };
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = new Date(start);
      if (end) where.createdAt.lte = new Date(end);
    }
    try {
      const list = await prisma.pointAdjustment.findMany({ where, orderBy: { createdAt: 'desc' } });
      return res.json({ adjustments: list });
    } catch (e) {
      // Fallback raw query jika client belum ter-generate
      // Gunakan $queryRaw dengan parameter agar aman dan kompatibel
      let list: any[] = [];
      if (start && end) {
        list = await prisma.$queryRaw`SELECT * FROM PointAdjustment WHERE memberId = ${memberId} AND createdAt >= ${new Date(start)} AND createdAt <= ${new Date(end)} ORDER BY createdAt DESC`;
      } else if (start) {
        list = await prisma.$queryRaw`SELECT * FROM PointAdjustment WHERE memberId = ${memberId} AND createdAt >= ${new Date(start)} ORDER BY createdAt DESC`;
      } else if (end) {
        list = await prisma.$queryRaw`SELECT * FROM PointAdjustment WHERE memberId = ${memberId} AND createdAt <= ${new Date(end)} ORDER BY createdAt DESC`;
      } else {
        list = await prisma.$queryRaw`SELECT * FROM PointAdjustment WHERE memberId = ${memberId} ORDER BY createdAt DESC`;
      }
      return res.json({ adjustments: Array.isArray(list) ? list : [] });
    }
  } catch (e: any) {
    console.error('Admin list point adjustments error:', e);
    return res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.get('/activities', adminAuth, async (req, res) => {
  try {
    const { start, end, adminId, method, page, limit } = req.query as { start?: string; end?: string; adminId?: string; method?: string; page?: string; limit?: string };
    const where: any = {};
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = new Date(start);
      if (end) where.createdAt.lte = new Date(end);
    }
    if (adminId) where.adminId = String(adminId);
    if (method) where.method = String(method).toUpperCase();

    const hasPagination = Boolean(page) || Boolean(limit);
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, Math.min(1000, parseInt(limit, 10) || 500)) : 500;

    try {
      const list = await (prisma as any).adminActivity.findMany({ where, orderBy: { createdAt: 'desc' }, take: limitNum, skip: hasPagination ? (pageNum - 1) * limitNum : undefined });
      if (hasPagination) {
        try {
          const total = await (prisma as any).adminActivity.count({ where });
          res.setHeader('X-Total-Count', String(total));
          res.setHeader('X-Page', String(pageNum));
          res.setHeader('X-Limit', String(limitNum));
        } catch {}
      }
      return res.json({ activities: list });
    } catch {
      const clauses: string[] = [];
      const params: any[] = [];
      if (start) { clauses.push(`createdAt >= ?`); params.push(new Date(start)); }
      if (end) { clauses.push(`createdAt <= ?`); params.push(new Date(end)); }
      if (adminId) { clauses.push(`adminId = ?`); params.push(String(adminId)); }
      if (method) { clauses.push(`method = ?`); params.push(String(method).toUpperCase()); }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const lim = limitNum;
      const off = hasPagination ? (pageNum - 1) * limitNum : 0;
      const rows: any = await prisma.$queryRawUnsafe(`SELECT * FROM AdminActivity ${whereSql} ORDER BY createdAt DESC LIMIT ? OFFSET ?`, ...params, lim, off);
      if (hasPagination) {
        try {
          const countRows: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM AdminActivity ${whereSql}`, ...params);
          const total = Array.isArray(countRows) && countRows.length ? Number(countRows[0].cnt || 0) : 0;
          res.setHeader('X-Total-Count', String(total));
          res.setHeader('X-Page', String(pageNum));
          res.setHeader('X-Limit', String(limitNum));
        } catch {}
      }
      return res.json({ activities: rows });
    }
  } catch (e: any) {
    console.error('Admin activities error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Slider Images management
router.post('/slider-images', adminAuth, upload.single('image'), async (req: any, res) => {
  try {
    const { title } = req.body as { title?: string };
    let imageUrl: string | undefined = undefined;
    if (!req.file) return res.status(400).json({ message: 'Image is required' });
    if (cloudinary.config().cloud_name) {
      const temp = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, { folder: 'thelodge/slider' });
      imageUrl = temp.secure_url;
    } else {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
      const filename = `slider_${Date.now()}_${Math.random().toString(36).slice(2)}.${(req.file.originalname.split('.').pop() || 'jpg')}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, req.file.buffer);
      const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
      imageUrl = `${baseUrl}/files/uploads/${filename}`;
    }

    const adminUser = await prisma.user.findUnique({ where: { id: req.user?.uid } });
    const createdBy = adminUser?.email || adminUser?.id || 'admin';

    // Try prisma model first; fallback to raw SQL if needed
    try {
      const created = await (prisma as any).sliderImage.create({ data: { imageUrl, title, createdBy } });
      return res.json(created);
    } catch (e1) {
      try {
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS SliderImage (
          id CHAR(36) NOT NULL,
          imageUrl VARCHAR(255) NOT NULL,
          title VARCHAR(191) NULL,
          createdAt DATETIME(3) NOT NULL,
          createdBy VARCHAR(191) NULL,
          PRIMARY KEY (id)
        )`);
      } catch {}
      const id = uuidv4();
      await prisma.$executeRaw`INSERT INTO SliderImage (id, imageUrl, title, createdAt, createdBy) VALUES (${id}, ${imageUrl}, ${title ?? null}, ${new Date()}, ${createdBy ?? null})`;
      const row: any = { id, imageUrl, title: title ?? null, createdAt: new Date(), createdBy: createdBy ?? null };
      return res.json(row);
    }
  } catch (e: any) {
    console.error('Admin slider upload error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.get('/slider-images', adminAuth, async (req: any, res) => {
  try {
    try {
      const list = await (prisma as any).sliderImage.findMany({ orderBy: { createdAt: 'desc' } });
      return res.json(list);
    } catch (e1) {
      try {
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS SliderImage (
          id CHAR(36) NOT NULL,
          imageUrl VARCHAR(255) NOT NULL,
          title VARCHAR(191) NULL,
          createdAt DATETIME(3) NOT NULL,
          createdBy VARCHAR(191) NULL,
          PRIMARY KEY (id)
        )`);
      } catch {}
      const list: any = await prisma.$queryRawUnsafe(`SELECT id, imageUrl, title, createdAt, createdBy FROM SliderImage ORDER BY createdAt DESC`);
      return res.json(list);
    }
  } catch (e: any) {
    console.error('Admin slider list error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.delete('/slider-images/:id', adminAuth, async (req: any, res) => {
  try {
    const id = req.params.id;
    try {
      await (prisma as any).sliderImage.delete({ where: { id } });
      return res.json({ success: true });
    } catch (e1) {
      await prisma.$executeRaw`DELETE FROM SliderImage WHERE id = ${id}`;
      return res.json({ success: true });
    }
  } catch (e: any) {
    console.error('Admin slider delete error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.get('/events', adminAuth, async (_req, res) => {
  const list = await prisma.event.findMany({ orderBy: { eventDate: 'asc' } });
  res.json(list);
});

router.get('/events/:id', adminAuth, async (req, res) => {
  const ev = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!ev) return res.status(404).json({ message: 'Event not found' });
  res.json(ev);
});

// Tambahan: daftar peserta event + status hadir
router.get('/events/:id/participants', adminAuth, async (req, res) => {
  const eventId = req.params.id;
  const ev = await prisma.event.findUnique({ where: { id: eventId } });
  if (!ev) return res.status(404).json({ message: 'Event not found' });
  const regs = await prisma.eventRegistration.findMany({
    where: { eventId },
    include: { member: { include: { user: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const participants = regs.map((r) => ({
    registrationId: r.id,
    memberId: r.memberId,
    fullName: r.member.fullName,
    email: r.member.user.email,
    phone: r.member.phone,
    status: r.status,
    redeemedAt: r.redeemedAt,
    createdAt: r.createdAt,
  }));
  res.json({ event: { id: ev.id, title: ev.title, eventDate: ev.eventDate, quota: ev.quota }, participants });
});

router.put('/events/:id', adminAuth, upload.single('image'), async (req: any, res) => {
  const { title, description, eventDate, quota } = req.body as { title?: string; description?: string; eventDate?: string; quota?: string };
  let imageUrl: string | undefined = undefined;
  if (req.file && cloudinary.config().cloud_name) {
    const temp = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, { folder: 'thelodge/events' });
    imageUrl = temp.secure_url;
  }
  const data: any = {};
  if (title) data.title = title;
  if (description) data.description = description;
  if (eventDate) data.eventDate = dayjs(eventDate).toDate();
  if (quota) data.quota = parseInt(quota, 10);
  if (imageUrl) data.imageUrl = imageUrl;
  const updated = await prisma.event.update({ where: { id: req.params.id }, data });
  res.json(updated);
});

router.delete('/events/:id', adminAuth, async (req, res) => {
  await prisma.event.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// QR Redeem Center
router.post('/redeem', adminAuth, async (req, res) => {
  const { data, hash } = req.body as { data?: string; hash?: string };
  if (!data || !hash) return res.status(400).json({ message: 'Missing data' });
  const payload = verifyPayload(data, hash);
  if (!payload) return res.status(400).json({ message: 'Invalid QR' });

  try {
    // Ambil info admin untuk pencatatan
    const adminUser = await prisma.user.findUnique({ where: { id: req.user?.uid } });
    const adminId = adminUser?.id || req.user?.uid || 'unknown';
    const adminName = adminUser?.email || 'admin';

    // Siapkan variabel umum untuk RedeemHistory
    let memberId = payload.memberId as string;
    let memberName = '';
    let voucherType: VoucherType = 'TICKET' as any;
    let voucherId = '';
    let voucherLabel: string | undefined = undefined;
    const redeemedAt = new Date();

    if (payload.type === 'ticket') {
      const ticket = await prisma.ticket.findUnique({ where: { id: payload.ticketId } });
      if (!ticket || ticket.memberId !== payload.memberId) return res.status(404).json({ message: 'Ticket not found' });
      if (ticket.status === TicketStatus.REDEEMED) return res.status(400).json({ message: 'Ticket already redeemed' });
      const updated = await prisma.ticket.update({ where: { id: ticket.id }, data: { status: TicketStatus.REDEEMED, redeemedAt } });
      const member = await prisma.member.findUnique({ where: { id: ticket.memberId } });
      memberName = member?.fullName || '';
      voucherType = 'TICKET' as any;
      voucherId = ticket.id;
      voucherLabel = ticket.name;
      // Generate proof
      const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
      const qrUrl = `${baseUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
      const qrDataURL = await generateQRDataURL(qrUrl);
      const uploadsDir = path.join(process.cwd(), 'uploads', 'redeem-proofs');
      try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
      const filename = `redeem_${voucherId}_${Date.now()}.pdf`;
      const outputPath = path.join(uploadsDir, filename);
      await createRedeemProofPDF({ outputPath, memberName, voucherType: 'Tiket Gratis Member', voucherLabel, redeemedAt, qrDataUrl: qrDataURL, adminName, companyName: 'The Lodge Family' });
      const proofUrl = `${baseUrl}/files/uploads/redeem-proofs/${filename}`;
      await prisma.redeemHistory.create({ data: { memberId, memberName, voucherType, voucherId, voucherLabel, redeemedAt, adminId, adminName, proofUrl } });
      return res.json({ success: true, ticket: updated, proofUrl });
    }
    if (payload.type === 'points') {
      const pr = await prisma.pointRedemption.findUnique({ where: { id: payload.redemptionId } });
      if (!pr || pr.memberId !== payload.memberId) return res.status(404).json({ message: 'Redemption not found' });
      if (pr.status === RedemptionStatus.REDEEMED) return res.status(400).json({ message: 'Already redeemed' });
      const updated = await prisma.pointRedemption.update({ where: { id: pr.id }, data: { status: RedemptionStatus.REDEEMED, redeemedAt } });
      const member = await prisma.member.findUnique({ where: { id: pr.memberId } });
      memberName = member?.fullName || '';
      voucherType = 'POINTS' as any;
      voucherId = pr.id;
      voucherLabel = pr.rewardName;
      const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
      const qrUrl = `${baseUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
      const qrDataURL = await generateQRDataURL(qrUrl);
      const uploadsDir = path.join(process.cwd(), 'uploads', 'redeem-proofs');
      try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
      const filename = `redeem_${voucherId}_${Date.now()}.pdf`;
      const outputPath = path.join(uploadsDir, filename);
      await createRedeemProofPDF({ outputPath, memberName, voucherType: 'Redeem Poin', voucherLabel, redeemedAt, qrDataUrl: qrDataURL, adminName, companyName: 'The Lodge Family' });
      const proofUrl = `${baseUrl}/files/uploads/redeem-proofs/${filename}`;
      await prisma.redeemHistory.create({ data: { memberId, memberName, voucherType, voucherId, voucherLabel, redeemedAt, adminId, adminName, proofUrl } });
      return res.json({ success: true, redemption: updated, proofUrl });
    }
    if (payload.type === 'event') {
      const er = await prisma.eventRegistration.findUnique({ where: { id: payload.registrationId } });
      if (!er || er.memberId !== payload.memberId || er.eventId !== payload.eventId) return res.status(404).json({ message: 'Registration not found' });
      if (er.status === RegistrationStatus.REDEEMED) return res.status(400).json({ message: 'Already redeemed' });
      const updated = await prisma.eventRegistration.update({ where: { id: er.id }, data: { status: RegistrationStatus.REDEEMED, redeemedAt } });
      const member = await prisma.member.findUnique({ where: { id: er.memberId } });
      const ev = await prisma.event.findUnique({ where: { id: er.eventId } });
      memberName = member?.fullName || '';
      voucherType = 'EVENT' as any;
      voucherId = er.id;
      voucherLabel = ev?.title;
      const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
      const qrUrl = `${baseUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
      const qrDataURL = await generateQRDataURL(qrUrl);
      const uploadsDir = path.join(process.cwd(), 'uploads', 'redeem-proofs');
      try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
      const filename = `redeem_${voucherId}_${Date.now()}.pdf`;
      const outputPath = path.join(uploadsDir, filename);
      await createRedeemProofPDF({ outputPath, memberName, voucherType: 'Event Eksklusif Member', voucherLabel, redeemedAt, qrDataUrl: qrDataURL, adminName, companyName: 'The Lodge Family' });
      const proofUrl = `${baseUrl}/files/uploads/redeem-proofs/${filename}`;
      await prisma.redeemHistory.create({ data: { memberId, memberName, voucherType, voucherId, voucherLabel, redeemedAt, adminId, adminName, proofUrl } });
      return res.json({ success: true, registration: updated, proofUrl });
    }
    return res.status(400).json({ message: 'Unknown payload type' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Daftar riwayat redeem dengan filter
router.get('/redeem-history', adminAuth, async (req, res) => {
  try {
    const { type, from, to, member } = req.query as { type?: string; from?: string; to?: string; member?: string };
    const where: any = {};
    if (type && ['TICKET', 'POINTS', 'EVENT', 'TOURISM_TICKET', 'BENEFIT'].includes(type)) where.voucherType = type;
    if (from || to) {
      where.redeemedAt = {};
      if (from) where.redeemedAt.gte = new Date(from);
      if (to) where.redeemedAt.lte = new Date(to);
    }
    if (member && member.trim()) {
      where.memberName = { contains: member.trim(), mode: 'insensitive' };
    }
    const list = await prisma.redeemHistory.findMany({ where, orderBy: { redeemedAt: 'desc' }, take: 200 });
    res.json(list);
  } catch (e: any) {
    console.error('List redeem history error:', e);
    res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// Settings endpoints (OWNER / SUPER_ADMIN only)

export const settingsPatchSchema = z.object({
  appName: z.string().min(1).max(191).optional(),
  defaultLocale: z.string().min(2).max(32).optional(),
  timeZone: z.string().min(1).max(64).optional(),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'primaryColor harus format hex seperti #RRGGBB').optional(),
  darkMode: z.boolean().optional(),
  logoUrl: z.string().url().max(255).nullable().optional(),
  require2FA: z.boolean().optional(),
  sessionTimeout: z.number().int().min(5).max(24 * 60).optional(),
  allowDirectLogin: z.boolean().optional(),
  fromName: z.string().max(191).nullable().optional(),
  fromEmail: z.string().email().max(191).nullable().optional(),
  emailProvider: z.enum(['smtp']).optional(),
  cloudinaryEnabled: z.boolean().optional(),
  cloudinaryFolder: z.string().max(191).nullable().optional(),
  webhookUrl: z.string().url().max(255).nullable().optional(),
  // Xendit Payment Gateway
  xenditSecretKey: z.string().max(255).nullable().optional(),
  xenditPublicKey: z.string().max(255).nullable().optional(),
  xenditWebhookToken: z.string().max(255).nullable().optional(),
  xenditEnvironment: z.enum(['test', 'live']).optional(),
  maintenanceMode: z.boolean().optional(),
  announcement: z.string().max(5000).nullable().optional(),
}).strict();

router.get('/settings', adminAuth, async (req, res) => {
  const role = String(req.user?.adminRole || '').toUpperCase();
  if (role !== 'OWNER' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Access denied: settings require OWNER or SUPER_ADMIN' });
  }
  try {
    // Cache hit
    const nowTs = Date.now();
    if (settingsCache.value) {
      if (nowTs < settingsCache.setAt) {
        settingsCache = { value: null, expireAt: 0, setAt: 0 };
      } else if (settingsCache.expireAt > nowTs) {
        return res.json(safeClone(settingsCache.value));
      }
    }
    // Try Prisma Client first
    try {
      const rec = await (prisma as any).settings.findFirst({ orderBy: { updatedAt: 'desc' } });
      if (rec) { const clone = safeClone(rec); const now = Date.now(); settingsCache = { value: clone, expireAt: now + SETTINGS_CACHE_TTL_MS, setAt: now }; return res.json(clone); }
    } catch (e1) {
      // Fallback: ensure table exists and fetch first row
      try {
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS Settings (
          id CHAR(36) NOT NULL,
          appName VARCHAR(191) NOT NULL DEFAULT 'The Lodge Family',
          defaultLocale VARCHAR(32) NOT NULL DEFAULT 'id-ID',
          timeZone VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
          primaryColor VARCHAR(16) NOT NULL DEFAULT '#0F4D39',
          darkMode BOOLEAN NOT NULL DEFAULT true,
          logoUrl VARCHAR(255) NULL,
          require2FA BOOLEAN NOT NULL DEFAULT false,
          sessionTimeout INT NOT NULL DEFAULT 60,
          allowDirectLogin BOOLEAN NOT NULL DEFAULT true,
          fromName VARCHAR(191) NULL,
          fromEmail VARCHAR(191) NULL,
          emailProvider VARCHAR(64) NOT NULL DEFAULT 'smtp',
          cloudinaryEnabled BOOLEAN NOT NULL DEFAULT false,
          cloudinaryFolder VARCHAR(191) NULL,
          webhookUrl VARCHAR(255) NULL,
          xenditSecretKey VARCHAR(255) NULL,
          xenditPublicKey VARCHAR(255) NULL,
          xenditWebhookToken VARCHAR(255) NULL,
          xenditEnvironment VARCHAR(16) NOT NULL DEFAULT 'test',
          maintenanceMode BOOLEAN NOT NULL DEFAULT false,
          announcement TEXT NULL,
          createdAt DATETIME(3) NOT NULL,
          updatedAt DATETIME(3) NOT NULL,
          PRIMARY KEY (id)
        )`);
      } catch {}
      const rows: any = await prisma.$queryRawUnsafe(`SELECT * FROM Settings ORDER BY updatedAt DESC LIMIT 1`);
      if (Array.isArray(rows) && rows.length) { const clone = safeClone(rows[0]); const now = Date.now(); settingsCache = { value: clone, expireAt: now + SETTINGS_CACHE_TTL_MS, setAt: now }; return res.json(clone); }
    }
    // If nothing found, return sane defaults
    const defaults = {
      appName: 'The Lodge Family',
      defaultLocale: 'id-ID',
      timeZone: 'Asia/Jakarta',
      primaryColor: '#0F4D39',
      darkMode: true,
      logoUrl: null,
      require2FA: false,
      sessionTimeout: 60,
      allowDirectLogin: true,
      fromName: null,
      fromEmail: null,
      emailProvider: 'smtp',
      cloudinaryEnabled: false,
      cloudinaryFolder: null,
      webhookUrl: null,
      xenditSecretKey: null,
      xenditPublicKey: null,
      xenditWebhookToken: null,
      xenditEnvironment: 'test',
      maintenanceMode: false,
      announcement: null,
    };
    const clone = safeClone(defaults);
    const now = Date.now();
    settingsCache = { value: clone, expireAt: now + SETTINGS_CACHE_TTL_MS, setAt: now };
    return res.json(clone);
  } catch (e: any) {
    console.error('Admin settings (GET) error:', e);
    return res.status(500).json({ message: e?.message || 'Server error' });
  }
});

router.put('/settings', adminAuth, async (req, res) => {
  const role = String(req.user?.adminRole || '').toUpperCase();
  if (role !== 'OWNER' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Access denied: settings require OWNER or SUPER_ADMIN' });
  }
  try {
    const body = req.body || {};
    // Helpers to coerce values
    const toBool = (v: any) => {
      if (typeof v === 'boolean') return v;
      const s = String(v).toLowerCase();
      return s === 'true' || s === '1' || s === 'on';
    };
    const toInt = (v: any) => {
      const n = parseInt(String(v), 10);
      return Number.isNaN(n) ? undefined : n;
    };
    let patch: any = {};
    if (typeof body.appName !== 'undefined') patch.appName = String(body.appName);
    if (typeof body.defaultLocale !== 'undefined') patch.defaultLocale = String(body.defaultLocale);
    if (typeof body.timeZone !== 'undefined') patch.timeZone = String(body.timeZone);
    if (typeof body.primaryColor !== 'undefined') patch.primaryColor = String(body.primaryColor);
    if (typeof body.darkMode !== 'undefined') patch.darkMode = toBool(body.darkMode);
    if (typeof body.logoUrl !== 'undefined') patch.logoUrl = body.logoUrl ? String(body.logoUrl) : null;
    if (typeof body.require2FA !== 'undefined') patch.require2FA = toBool(body.require2FA);
    if (typeof body.sessionTimeout !== 'undefined') { const v = toInt(body.sessionTimeout); if (typeof v !== 'undefined') patch.sessionTimeout = v; }
    if (typeof body.allowDirectLogin !== 'undefined') patch.allowDirectLogin = toBool(body.allowDirectLogin);
    if (typeof body.fromName !== 'undefined') patch.fromName = body.fromName ? String(body.fromName) : null;
    if (typeof body.fromEmail !== 'undefined') patch.fromEmail = body.fromEmail ? String(body.fromEmail) : null;
    if (typeof body.emailProvider !== 'undefined') patch.emailProvider = String(body.emailProvider);
    if (typeof body.cloudinaryEnabled !== 'undefined') patch.cloudinaryEnabled = toBool(body.cloudinaryEnabled);
    if (typeof body.cloudinaryFolder !== 'undefined') patch.cloudinaryFolder = body.cloudinaryFolder ? String(body.cloudinaryFolder) : null;
    if (typeof body.webhookUrl !== 'undefined') patch.webhookUrl = body.webhookUrl ? String(body.webhookUrl) : null;
    // Xendit Payment Gateway
    if (typeof body.xenditSecretKey !== 'undefined') patch.xenditSecretKey = body.xenditSecretKey ? String(body.xenditSecretKey) : null;
    if (typeof body.xenditPublicKey !== 'undefined') patch.xenditPublicKey = body.xenditPublicKey ? String(body.xenditPublicKey) : null;
    if (typeof body.xenditWebhookToken !== 'undefined') patch.xenditWebhookToken = body.xenditWebhookToken ? String(body.xenditWebhookToken) : null;
    if (typeof body.xenditEnvironment !== 'undefined') patch.xenditEnvironment = String(body.xenditEnvironment);
    if (typeof body.maintenanceMode !== 'undefined') patch.maintenanceMode = toBool(body.maintenanceMode);
    if (typeof body.announcement !== 'undefined') patch.announcement = body.announcement ? String(body.announcement) : null;

    // Validate payload with Zod
    const parsed = settingsPatchSchema.safeParse(patch);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid settings payload', errors: parsed.error.issues });
    }
    patch = parsed.data;

    // Try Prisma Client first
    try {
      const existing = await (prisma as any).settings.findFirst({ orderBy: { updatedAt: 'desc' } });
      if (existing) {
        const updated = await (prisma as any).settings.update({ where: { id: existing.id }, data: patch });
        settingsCache = { value: null, expireAt: 0, setAt: 0 };
        return res.json(updated);
      } else {
        const created = await (prisma as any).settings.create({ data: { id: uuidv4(), ...patch } });
        settingsCache = { value: null, expireAt: 0, setAt: 0 };
        return res.json(created);
      }
    } catch (e1) {
      // Fallback: ensure table exists and upsert via raw SQL
      try {
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS Settings (
          id CHAR(36) NOT NULL,
          appName VARCHAR(191) NOT NULL DEFAULT 'The Lodge Family',
          defaultLocale VARCHAR(32) NOT NULL DEFAULT 'id-ID',
          timeZone VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
          primaryColor VARCHAR(16) NOT NULL DEFAULT '#0F4D39',
          darkMode BOOLEAN NOT NULL DEFAULT true,
          logoUrl VARCHAR(255) NULL,
          require2FA BOOLEAN NOT NULL DEFAULT false,
          sessionTimeout INT NOT NULL DEFAULT 60,
          allowDirectLogin BOOLEAN NOT NULL DEFAULT true,
          fromName VARCHAR(191) NULL,
          fromEmail VARCHAR(191) NULL,
          emailProvider VARCHAR(64) NOT NULL DEFAULT 'smtp',
          cloudinaryEnabled BOOLEAN NOT NULL DEFAULT false,
          cloudinaryFolder VARCHAR(191) NULL,
          webhookUrl VARCHAR(255) NULL,
          xenditSecretKey VARCHAR(255) NULL,
          xenditPublicKey VARCHAR(255) NULL,
          xenditWebhookToken VARCHAR(255) NULL,
          xenditEnvironment VARCHAR(16) NOT NULL DEFAULT 'test',
          maintenanceMode BOOLEAN NOT NULL DEFAULT false,
          announcement TEXT NULL,
          createdAt DATETIME(3) NOT NULL,
          updatedAt DATETIME(3) NOT NULL,
          PRIMARY KEY (id)
        )`);
      } catch {}
      const rows: any = await prisma.$queryRawUnsafe(`SELECT * FROM Settings ORDER BY updatedAt DESC LIMIT 1`);
      const now = new Date();
      if (Array.isArray(rows) && rows.length) {
        const curr = rows[0] || {};
        const final = {
          appName: typeof patch.appName !== 'undefined' ? patch.appName : curr.appName ?? 'The Lodge Family',
          defaultLocale: typeof patch.defaultLocale !== 'undefined' ? patch.defaultLocale : curr.defaultLocale ?? 'id-ID',
          timeZone: typeof patch.timeZone !== 'undefined' ? patch.timeZone : curr.timeZone ?? 'Asia/Jakarta',
          primaryColor: typeof patch.primaryColor !== 'undefined' ? patch.primaryColor : curr.primaryColor ?? '#0F4D39',
          darkMode: typeof patch.darkMode !== 'undefined' ? patch.darkMode : Boolean(curr.darkMode ?? true),
          logoUrl: typeof patch.logoUrl !== 'undefined' ? patch.logoUrl : (curr.logoUrl ?? null),
          require2FA: typeof patch.require2FA !== 'undefined' ? patch.require2FA : Boolean(curr.require2FA ?? false),
          sessionTimeout: typeof patch.sessionTimeout !== 'undefined' ? patch.sessionTimeout : Number(curr.sessionTimeout ?? 60),
          allowDirectLogin: typeof patch.allowDirectLogin !== 'undefined' ? patch.allowDirectLogin : Boolean(curr.allowDirectLogin ?? true),
          fromName: typeof patch.fromName !== 'undefined' ? patch.fromName : (curr.fromName ?? null),
          fromEmail: typeof patch.fromEmail !== 'undefined' ? patch.fromEmail : (curr.fromEmail ?? null),
          emailProvider: typeof patch.emailProvider !== 'undefined' ? patch.emailProvider : curr.emailProvider ?? 'smtp',
          cloudinaryEnabled: typeof patch.cloudinaryEnabled !== 'undefined' ? patch.cloudinaryEnabled : Boolean(curr.cloudinaryEnabled ?? false),
          cloudinaryFolder: typeof patch.cloudinaryFolder !== 'undefined' ? patch.cloudinaryFolder : (curr.cloudinaryFolder ?? null),
          webhookUrl: typeof patch.webhookUrl !== 'undefined' ? patch.webhookUrl : (curr.webhookUrl ?? null),
          maintenanceMode: typeof patch.maintenanceMode !== 'undefined' ? patch.maintenanceMode : Boolean(curr.maintenanceMode ?? false),
          announcement: typeof patch.announcement !== 'undefined' ? patch.announcement : (curr.announcement ?? null),
        };
        await prisma.$executeRaw`UPDATE Settings SET appName=${final.appName}, defaultLocale=${final.defaultLocale}, timeZone=${final.timeZone}, primaryColor=${final.primaryColor}, darkMode=${final.darkMode}, logoUrl=${final.logoUrl}, require2FA=${final.require2FA}, sessionTimeout=${final.sessionTimeout}, allowDirectLogin=${final.allowDirectLogin}, fromName=${final.fromName}, fromEmail=${final.fromEmail}, emailProvider=${final.emailProvider}, cloudinaryEnabled=${final.cloudinaryEnabled}, cloudinaryFolder=${final.cloudinaryFolder}, webhookUrl=${final.webhookUrl}, maintenanceMode=${final.maintenanceMode}, announcement=${final.announcement}, updatedAt=${now} WHERE id=${curr.id}`;
        const updated: any = await prisma.$queryRaw`SELECT * FROM Settings WHERE id = ${curr.id}`;
        settingsCache = { value: null, expireAt: 0, setAt: 0 };
        return res.json(Array.isArray(updated) ? updated[0] : updated);
      } else {
        const id = uuidv4();
        const defaults = {
          appName: 'The Lodge Family',
          defaultLocale: 'id-ID',
          timeZone: 'Asia/Jakarta',
          primaryColor: '#0F4D39',
          darkMode: true,
          logoUrl: null,
          require2FA: false,
          sessionTimeout: 60,
          allowDirectLogin: true,
          fromName: null,
          fromEmail: null,
          emailProvider: 'smtp',
          cloudinaryEnabled: false,
          cloudinaryFolder: null,
          webhookUrl: null,
          maintenanceMode: false,
          announcement: null,
        } as any;
        const final = { ...defaults, ...patch };
        await prisma.$executeRaw`INSERT INTO Settings (id, appName, defaultLocale, timeZone, primaryColor, darkMode, logoUrl, require2FA, sessionTimeout, allowDirectLogin, fromName, fromEmail, emailProvider, cloudinaryEnabled, cloudinaryFolder, webhookUrl, maintenanceMode, announcement, createdAt, updatedAt) VALUES (${id}, ${final.appName}, ${final.defaultLocale}, ${final.timeZone}, ${final.primaryColor}, ${final.darkMode}, ${final.logoUrl}, ${final.require2FA}, ${final.sessionTimeout}, ${final.allowDirectLogin}, ${final.fromName}, ${final.fromEmail}, ${final.emailProvider}, ${final.cloudinaryEnabled}, ${final.cloudinaryFolder}, ${final.webhookUrl}, ${final.maintenanceMode}, ${final.announcement}, ${now}, ${now})`;
        const created: any = await prisma.$queryRaw`SELECT * FROM Settings WHERE id = ${id}`;
        settingsCache = { value: null, expireAt: 0, setAt: 0 };
        return res.json(Array.isArray(created) ? created[0] : created);
      }
    }
  } catch (e: any) {
    console.error('Admin settings (PUT) error:', e);
    return res.status(500).json({ message: e?.message || 'Server error' });
  }
});

// ==== Points Management Endpoints ====
router.get('/points/transactions', adminAuth, async (req, res) => {
  try {
    const transactions = await prisma.pointRedemption.findMany({
      include: {
        member: {
          select: {
            fullName: true,
            user: {
              select: {
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching point transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data transaksi poin'
    });
  }
});

router.get('/points/stats', adminAuth, async (req, res) => {
  try {
    const [totalPoints, totalRedemptions, activeRedemptions] = await Promise.all([
      prisma.pointRedemption.aggregate({
        _sum: { pointsUsed: true }
      }),
      prisma.pointRedemption.count(),
      prisma.pointRedemption.count({
        where: { status: 'ACTIVE' }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalPointsUsed: totalPoints._sum.pointsUsed || 0,
        totalRedemptions: totalRedemptions,
        activeRedemptions: activeRedemptions
      }
    });
  } catch (error) {
    console.error('Error fetching point stats:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil statistik poin'
    });
  }
});

router.post('/points/bulk-adjust', adminAuth, async (req, res) => {
  try {
    const { memberIds, points, type, reason } = req.body;
    
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Member IDs harus berupa array yang tidak kosong'
      });
    }

    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Jumlah poin harus lebih dari 0'
      });
    }

    if (!type || !['ADD', 'SUBTRACT'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe adjustment harus ADD atau SUBTRACT'
      });
    }

    const adjustments = [];
    for (const memberId of memberIds) {
      const member = await prisma.member.findUnique({
        where: { id: memberId }
      });

      if (!member) continue;

      const newBalance = type === 'ADD' 
        ? member.pointsBalance + points
        : Math.max(0, member.pointsBalance - points);

      await prisma.member.update({
        where: { id: memberId },
        data: { pointsBalance: newBalance }
      });

      const adjustment = await prisma.pointAdjustment.create({
        data: {
          memberId,
          points,
          type: type as 'ADD' | 'SUBTRACT',
          reason: reason || 'Bulk adjustment',
          adminId: req.user?.uid || 'unknown',
          adminName: req.user?.email || 'admin',
          previousBalance: member.pointsBalance,
          newBalance
        }
      });

      adjustments.push(adjustment);
    }

    res.json({
      success: true,
      message: `Berhasil melakukan adjustment untuk ${adjustments.length} member`,
      data: adjustments
    });
  } catch (error) {
    console.error('Error bulk adjusting points:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal melakukan bulk adjustment poin'
    });
  }
});

// ==== Vouchers Management Endpoints ====
router.get('/vouchers', adminAuth, async (req, res) => {
  try {
    const vouchers = await prisma.ticket.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: vouchers
    });
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data voucher'
    });
  }
});

router.post('/vouchers', adminAuth, async (req, res) => {
  try {
    const { name, description, imageUrl, validUntil, isActive = true } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Nama dan deskripsi voucher harus diisi'
      });
    }

    const voucher = await prisma.ticket.create({
      data: {
        name,
        validDate: validUntil ? new Date(validUntil) : new Date(),
        status: isActive ? 'ACTIVE' : 'REDEEMED',
        qrPayloadHash: 'system-generated',
        memberId: 'system' // Placeholder for system-created vouchers
      }
    });

    res.json({
      success: true,
      message: 'Voucher berhasil dibuat',
      data: voucher
    });
  } catch (error) {
    console.error('Error creating voucher:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat voucher'
    });
  }
});

router.put('/vouchers/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, validUntil, isActive } = req.body;

    const voucher = await prisma.ticket.update({
      where: { id },
      data: {
        name,
        validDate: validUntil ? new Date(validUntil) : new Date(),
        status: isActive ? 'ACTIVE' : 'REDEEMED'
      }
    });

    res.json({
      success: true,
      message: 'Voucher berhasil diupdate',
      data: voucher
    });
  } catch (error) {
    console.error('Error updating voucher:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate voucher'
    });
  }
});

router.delete('/vouchers/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.ticket.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Voucher berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting voucher:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus voucher'
    });
  }
});

router.post('/vouchers/:id/toggle-status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const voucher = await prisma.ticket.findUnique({
      where: { id }
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher tidak ditemukan'
      });
    }

    const newStatus = voucher.status === 'ACTIVE' ? 'REDEEMED' : 'ACTIVE';

    const updatedVoucher = await prisma.ticket.update({
      where: { id },
      data: { status: newStatus }
    });

    res.json({
      success: true,
      message: `Status voucher berhasil diubah menjadi ${newStatus}`,
      data: updatedVoucher
    });
  } catch (error) {
    console.error('Error toggling voucher status:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah status voucher'
    });
  }
});

// ==== Upload Endpoints ====
// ==== Upload Endpoints ====
router.post('/upload/slider-image', adminAuth, upload.single('image'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required'
      });
    }

    let imageUrl: string;

    if (cloudinary.config().cloud_name) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        { folder: 'thelodge/slider' }
      );
      imageUrl = result.secure_url;
    } else {
      // Upload to local storage
      const uploadsDir = path.join(process.cwd(), 'uploads');
      try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
      
      const filename = `slider_${Date.now()}_${Math.random().toString(36).slice(2)}.${(req.file.originalname.split('.').pop() || 'jpg')}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, req.file.buffer);
      
      const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
      imageUrl = `${baseUrl}/files/uploads/${filename}`;
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: { imageUrl }
    });
  } catch (error) {
    console.error('Error uploading slider image:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupload gambar slider'
    });
  }
});

router.post('/upload/voucher-image', adminAuth, upload.single('image'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File gambar harus diupload'
      });
    }

    let imageUrl = '';

    if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'vouchers',
            resource_type: 'image'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      }) as any;

      imageUrl = result.secure_url;
    } else {
      // Save locally (fallback)
      const filename = `voucher-${Date.now()}-${req.file.originalname}`;
      const filepath = path.join(process.cwd(), 'uploads', filename);
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      fs.writeFileSync(filepath, req.file.buffer);
      imageUrl = `/uploads/${filename}`;
    }

    res.json({
      success: true,
      message: 'Gambar berhasil diupload',
      data: { imageUrl }
    });
  } catch (error) {
    console.error('Error uploading voucher image:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupload gambar voucher'
    });
  }
});

// ==== Toggle Status Endpoints ====
router.patch('/slider-images/:id/toggle-status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const slider = await prisma.sliderImage.findUnique({
      where: { id }
    });

    if (!slider) {
      return res.status(404).json({
        success: false,
        message: 'Slider image tidak ditemukan'
      });
    }

    // Update the isActive status
    const updatedSlider = await prisma.sliderImage.update({
      where: { id },
      data: { isActive: isActive !== undefined ? isActive : !slider.isActive }
    });

    res.json({
      success: true,
      message: `Status slider berhasil diubah menjadi ${updatedSlider.isActive ? 'aktif' : 'tidak aktif'}`,
      data: updatedSlider
    });
  } catch (error) {
    console.error('Error toggling slider status:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah status slider'
    });
  }
});

// Keep POST method for backward compatibility
router.post('/slider-images/:id/toggle-status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const slider = await prisma.sliderImage.findUnique({
      where: { id }
    });

    if (!slider) {
      return res.status(404).json({
        success: false,
        message: 'Slider image tidak ditemukan'
      });
    }

    // Update the isActive status
    const updatedSlider = await prisma.sliderImage.update({
      where: { id },
      data: { isActive: isActive !== undefined ? isActive : !slider.isActive }
    });

    res.json({
      success: true,
      message: `Status slider berhasil diubah menjadi ${updatedSlider.isActive ? 'aktif' : 'tidak aktif'}`,
      data: updatedSlider
    });
  } catch (error) {
    console.error('Error toggling slider status:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah status slider'
    });
  }
});

// Event toggle status endpoint removed - Event model doesn't have isActive field

router.post('/slider-images/:id/reorder', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { position } = req.body;

    if (typeof position !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Position harus berupa angka'
      });
    }

    const updatedSlider = await prisma.sliderImage.update({
      where: { id },
      data: { position }
    });

    res.json({
      success: true,
      message: 'Posisi slider berhasil diubah',
      data: updatedSlider
    });
  } catch (error) {
    console.error('Error reordering slider:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengubah posisi slider'
    });
  }
});

// Tourism Tickets endpoints
router.get('/tourism-tickets', adminAuth, async (req: any, res: any) => {
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

    res.json({
      tickets,
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

router.post('/tourism-tickets', adminAuth, upload.single('image'), async (req: any, res: any) => {
  try {
    const {
      name,
      description,
      validDate,
      expiryDate,
      allotment,
      price,
      discount = 0,
      category,
      location,
      duration,
      includes,
      terms
    } = req.body;

    let imageUrl = null;
    if (req.file) {
      if (cloudinary.config().cloud_name) {
        // Since upload_stream needs stream piping, fallback to data upload when using memoryStorage
        const result = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
          folder: 'tourism-tickets'
        });
        imageUrl = result.secure_url;
      } else {
        // Fallback: simpan file ke /uploads dan bangun URL berdasarkan host/port aktif
        const uploadsDir = path.join(process.cwd(), 'uploads');
        try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
        const filename = `tourism_ticket_${Date.now()}_${Math.random().toString(36).slice(2)}.${(req.file.originalname.split('.').pop() || 'jpg')}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, req.file.buffer);
        const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
        imageUrl = `${baseUrl}/files/uploads/${filename}`;
      }
    }

    const finalPrice = Number(price) - (Number(price) * Number(discount) / 100);

    const ticket = await prisma.tourismTicket.create({
      data: {
        name,
        description,
        validDate: new Date(validDate),
        expiryDate: new Date(expiryDate),
        allotment: Number(allotment),
        price: Number(price),
        discount: Number(discount),
        finalPrice,
        category,
        location,
        duration,
        includes,
        terms,
        imageUrl
      }
    });

    await recordAdminActivity({
      adminId: (req as any).user!.id,
      adminName: (req as any).user!.name,
      adminRole: (req as any).user!.role,
      method: req.method,
      path: req.path,
      status: 201,
      ip: req.ip,
      ua: req.get('User-Agent'),
      body: req.body,
      query: req.query
    });

    res.status(201).json({ message: 'Tourism ticket created successfully', ticket });
  } catch (error: any) {
    console.error('Create tourism ticket error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});

router.put('/tourism-tickets/:id', adminAuth, upload.single('image'), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      validDate,
      expiryDate,
      allotment,
      price,
      discount = 0,
      category,
      location,
      duration,
      includes,
      terms
    } = req.body;

    let imageUrl = undefined;
    if (req.file) {
      if (cloudinary.config().cloud_name) {
        // Since upload_stream needs stream piping, fallback to data upload when using memoryStorage
        const result = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
          folder: 'tourism-tickets'
        });
        imageUrl = result.secure_url;
      } else {
        // Fallback: simpan file ke /uploads dan bangun URL berdasarkan host/port aktif
        const uploadsDir = path.join(process.cwd(), 'uploads');
        try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
        const filename = `tourism_ticket_${Date.now()}_${Math.random().toString(36).slice(2)}.${(req.file.originalname.split('.').pop() || 'jpg')}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, req.file.buffer);
        const baseUrl = (process.env.APP_URL && process.env.APP_URL.trim()) ? process.env.APP_URL : `${req.protocol}://${req.get('host')}`;
        imageUrl = `${baseUrl}/files/uploads/${filename}`;
      }
    }

    const finalPrice = Number(price) - (Number(price) * Number(discount) / 100);

    const updateData: any = {
      name,
      description,
      validDate: new Date(validDate),
      expiryDate: new Date(expiryDate),
      allotment: Number(allotment),
      price: Number(price),
      discount: Number(discount),
      finalPrice,
      category,
      location,
      duration,
      includes,
      terms
    };

    if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }

    const ticket = await prisma.tourismTicket.update({
      where: { id },
      data: updateData
    });

    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 200,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.json({ message: 'Tourism ticket updated successfully', ticket });
  } catch (error: any) {
    console.error('Update tourism ticket error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});

router.delete('/tourism-tickets/:id', adminAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    await prisma.tourismTicket.update({
      where: { id },
      data: { isActive: false }
    });

    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 200,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.json({ message: 'Tourism ticket deleted successfully' });
  } catch (error: any) {
    console.error('Delete tourism ticket error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});

// Accommodations endpoints
router.get('/accommodations', adminAuth, async (req: any, res: any) => {
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

    res.json({
      accommodations,
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

router.post('/accommodations', adminAuth, upload.single('image'), async (req: any, res: any) => {
  try {
    const {
      name,
      description,
      type,
      location,
      pricePerNight,
      discount = 0,
      maxGuests,
      totalRooms,
      amenities,
      policies,
      rating = 0
    } = req.body;

    let imageUrl = null;
    if (req.file && req.file.path) {
      if (cloudinary.config().cloud_name) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'accommodations'
        });
        imageUrl = result.secure_url;
        fs.unlinkSync(req.file.path);
      } else {
        // If Cloudinary is not configured, just delete the uploaded file
        fs.unlinkSync(req.file.path);
      }
    }

    const accommodation = await prisma.accommodation.create({
      data: {
        name,
        description,
        type,
        location,
        pricePerNight: Number(pricePerNight),
        discount: Number(discount),
        maxGuests: Number(maxGuests),
        totalRooms: Number(totalRooms),
        amenities,
        policies,
        rating: Number(rating),
        imageUrl
      }
    });

    await recordAdminActivity({
      adminId: (req as any).user!.id,
      adminName: (req as any).user!.name,
      adminRole: (req as any).user!.role,
      method: req.method,
      path: req.path,
      status: 201,
      ip: req.ip,
      ua: req.get('User-Agent'),
      body: req.body,
      query: req.query
    });

    res.status(201).json({ message: 'Accommodation created successfully', accommodation });
  } catch (error: any) {
    console.error('Create accommodation error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});

router.put('/accommodations/:id', adminAuth, upload.single('image'), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      type,
      location,
      pricePerNight,
      discount = 0,
      maxGuests,
      totalRooms,
      amenities,
      policies,
      rating = 0
    } = req.body;

    let imageUrl = undefined;
    if (req.file && req.file.path) {
      if (cloudinary.config().cloud_name) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'accommodations'
        });
        imageUrl = result.secure_url;
        fs.unlinkSync(req.file.path);
      } else {
        // If Cloudinary is not configured, just delete the uploaded file
        fs.unlinkSync(req.file.path);
      }
    }

    const updateData: any = {
      name,
      description,
      type,
      location,
      pricePerNight: Number(pricePerNight),
      discount: Number(discount),
      maxGuests: Number(maxGuests),
      totalRooms: Number(totalRooms),
      amenities,
      policies,
      rating: Number(rating)
    };

    if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }

    const accommodation = await prisma.accommodation.update({
      where: { id },
      data: updateData
    });

    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 200,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.json({ message: 'Accommodation updated successfully', accommodation });
  } catch (error: any) {
    console.error('Update accommodation error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});

router.delete('/accommodations/:id', adminAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    await prisma.accommodation.update({
      where: { id },
      data: { isActive: false }
    });

    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 200,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.json({ message: 'Accommodation deleted successfully' });
  } catch (error: any) {
    console.error('Delete accommodation error:', error);
    res.status(500).json({ message: error?.message || 'Server error' });
  }
});

// Test Xendit API connection
router.post('/test-xendit', adminAuth, async (req: any, res: any) => {
  try {
    const { secretKey, environment } = req.body;

    if (!secretKey) {
      return res.status(400).json({ message: 'Secret key is required' });
    }

    // Test Xendit API by making a simple request to get balance
    const xenditUrl = environment === 'live' 
      ? 'https://api.xendit.co/balance' 
      : 'https://api.xendit.co/balance';

    const response = await fetch(xenditUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      await recordAdminActivity({
        adminId: (req as any).user!.id,
        adminName: (req as any).user!.name,
        adminRole: (req as any).user!.role,
        method: req.method,
        path: req.path,
        status: 200,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: { environment }, // Don't log secret key
        query: req.query
      });

      res.json({ 
        success: true, 
        message: `Xendit API connection successful (${environment} environment)`,
        balance: data.balance || 'N/A'
      });
    } else {
      const errorData = await response.text();
      
      await recordAdminActivity({
        adminId: (req as any).user!.id,
        adminName: (req as any).user!.name,
        adminRole: (req as any).user!.role,
        method: req.method,
        path: req.path,
        status: response.status,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: { environment, error: errorData },
        query: req.query
      });

      res.status(400).json({ 
        success: false, 
        message: `Xendit API error: ${response.status} - Invalid credentials or API key` 
      });
    }
  } catch (error: any) {
    console.error('Test Xendit error:', error);
    
    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 500,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.status(500).json({ 
      success: false, 
      message: error?.message || 'Failed to test Xendit connection' 
    });
  }
});

// Benefits Management Endpoints
// Get all benefits
router.get('/benefits', adminAuth, async (req, res) => {
  console.log('🔍 Admin benefits endpoint hit!', {
    user: req.user?.email,
    role: req.user?.role,
    query: req.query
  });
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } }
      ];
    }
    
    if (status !== 'all') {
      where.isActive = status === 'active';
    }

    const [benefits, total] = await Promise.all([
      prisma.benefit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limitNum
      }),
      prisma.benefit.count({ where })
    ]);

    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 200,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.json({
      benefits,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Get benefits error:', error);
    
    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 500,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.status(500).json({ message: error?.message || 'Failed to fetch benefits' });
  }
});

// Create new benefit
router.post('/benefits', adminAuth, upload.single('image'), async (req: any, res) => {
  try {
    const { title, description, validFrom, validUntil, isActive } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    let imageUrl = null;
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'benefits',
          public_id: `benefit_${uuidv4()}`,
          overwrite: true,
          resource_type: 'image'
        });
        imageUrl = result.secure_url;
        
        // Clean up temp file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      }
    }

    const benefit = await prisma.benefit.create({
      data: {
        title,
        description,
        imageUrl,
        isActive: isActive === 'true' || isActive === true,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        createdBy: (req as any).user.uid
      }
    });

    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 201,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: { title, description, isActive },
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.status(201).json({ message: 'Benefit created successfully', benefit });
  } catch (error: any) {
    console.error('Create benefit error:', error);
    
    // Clean up temp file if exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 500,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.status(500).json({ message: error?.message || 'Failed to create benefit' });
  }
});

// Update benefit
router.put('/benefits/:id', adminAuth, upload.single('image'), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { title, description, validFrom, validUntil, isActive } = req.body;

    const existingBenefit = await prisma.benefit.findUnique({ where: { id } });
    if (!existingBenefit) {
      return res.status(404).json({ message: 'Benefit not found' });
    }

    let imageUrl = existingBenefit.imageUrl;
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'benefits',
          public_id: `benefit_${uuidv4()}`,
          overwrite: true,
          resource_type: 'image'
        });
        imageUrl = result.secure_url;
        
        // Clean up temp file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      }
    }

    const benefit = await prisma.benefit.update({
      where: { id },
      data: {
        title: title || existingBenefit.title,
        description: description || existingBenefit.description,
        imageUrl,
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : existingBenefit.isActive,
        validFrom: validFrom ? new Date(validFrom) : existingBenefit.validFrom,
        validUntil: validUntil ? new Date(validUntil) : existingBenefit.validUntil
      }
    });

    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 200,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: { title, description, isActive },
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.json({ message: 'Benefit updated successfully', benefit });
  } catch (error: any) {
    console.error('Update benefit error:', error);
    
    // Clean up temp file if exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 500,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.status(500).json({ message: error?.message || 'Failed to update benefit' });
  }
});

// Delete benefit
router.delete('/benefits/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existingBenefit = await prisma.benefit.findUnique({ where: { id } });
    if (!existingBenefit) {
      return res.status(404).json({ message: 'Benefit not found' });
    }

    await prisma.benefit.delete({ where: { id } });

    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 200,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.json({ message: 'Benefit deleted successfully' });
  } catch (error: any) {
    console.error('Delete benefit error:', error);
    
    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 500,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.status(500).json({ message: error?.message || 'Failed to delete benefit' });
  }
});

// Toggle benefit status
router.post('/benefits/:id/toggle-status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const existingBenefit = await prisma.benefit.findUnique({ where: { id } });
    if (!existingBenefit) {
      return res.status(404).json({ message: 'Benefit not found' });
    }

    const benefit = await prisma.benefit.update({
      where: { id },
      data: { isActive: !existingBenefit.isActive }
    });

    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 200,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.json({ 
      message: `Benefit ${benefit.isActive ? 'activated' : 'deactivated'} successfully`, 
      benefit 
    });
  } catch (error: any) {
    console.error('Toggle benefit status error:', error);
    
    try {
      const user = await prisma.user.findUnique({ where: { id: (req as any).user.uid } });
      await recordAdminActivity({
        adminId: (req as any).user.uid,
        adminName: user?.fullName || 'Unknown',
        adminRole: (req as any).user.adminRole,
        method: req.method,
        path: req.path,
        status: 500,
        ip: req.ip,
        ua: req.get('User-Agent'),
        body: req.body,
        query: req.query
      });
    } catch (activityError) {
      console.error('Failed to record admin activity:', activityError);
    }

    res.status(500).json({ message: error?.message || 'Failed to toggle benefit status' });
  }
});

// Missing endpoints that frontend components are calling

// PUT /api/admin/members/:id - Update member
router.put('/members/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const member = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        memberProfile: true
      }
    });

    await recordAdminActivity({
      adminId: (req as any).user!.id,
      adminName: (req as any).user!.name,
      adminRole: (req as any).user!.role,
      method: req.method,
      path: req.path,
      status: 200,
      ip: req.ip,
      ua: req.get('User-Agent'),
      body: req.body,
      query: req.query
    });

    res.json({ message: 'Member updated successfully', member });
  } catch (error: any) {
    console.error('Update member error:', error);
    res.status(500).json({ message: error?.message || 'Failed to update member' });
  }
});

// DELETE /api/admin/members/:id - Delete member
router.delete('/members/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.user.delete({
      where: { id }
    });

    await recordAdminActivity({
      adminId: (req as any).user!.id,
      adminName: (req as any).user!.name,
      adminRole: (req as any).user!.role,
      method: req.method,
      path: req.path,
      status: 200,
      ip: req.ip,
      ua: req.get('User-Agent'),
      body: req.body,
      query: req.query
    });

    res.json({ message: 'Member deleted successfully' });
  } catch (error: any) {
    console.error('Delete member error:', error);
    res.status(500).json({ message: error?.message || 'Failed to delete member' });
  }
});

// POST /api/admin/members/:id/adjust-points - Adjust member points
router.post('/members/:id/adjust-points', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { points, reason } = req.body;
    
    const member = await prisma.user.findUnique({
      where: { id },
      include: { memberProfile: true }
    });

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const currentPoints = member.memberProfile?.points || 0;
    const newPoints = currentPoints + points;

    await prisma.memberProfile.update({
      where: { userId: id },
      data: { points: newPoints }
    });

    // Record the transaction
    await prisma.pointTransaction.create({
      data: {
        userId: id,
        points: points,
        type: points > 0 ? 'EARNED' : 'SPENT',
        description: reason || 'Admin adjustment',
        adminId: (req as any).user!.id
      }
    });

    await recordAdminActivity({
      adminId: (req as any).user!.id,
      adminName: (req as any).user!.name,
      adminRole: (req as any).user!.role,
      method: req.method,
      path: req.path,
      status: 200,
      ip: req.ip,
      ua: req.get('User-Agent'),
      body: req.body,
      query: req.query
    });

    res.json({ message: 'Points adjusted successfully', newPoints });
  } catch (error: any) {
    console.error('Adjust points error:', error);
    res.status(500).json({ message: error?.message || 'Failed to adjust points' });
  }
});

// POST /api/admin/events/:id/toggle-status - Toggle event status
router.post('/events/:id/toggle-status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { isActive: !event.isActive }
    });

    await recordAdminActivity({
      adminId: (req as any).user!.id,
      adminName: (req as any).user!.name,
      adminRole: (req as any).user!.role,
      method: req.method,
      path: req.path,
      status: 200,
      ip: req.ip,
      ua: req.get('User-Agent'),
      body: req.body,
      query: req.query
    });

    res.json({ 
      message: `Event ${updatedEvent.isActive ? 'activated' : 'deactivated'} successfully`, 
      event: updatedEvent 
    });
  } catch (error: any) {
    console.error('Toggle event status error:', error);
    res.status(500).json({ message: error?.message || 'Failed to toggle event status' });
  }
});

// POST /api/admin/promos/:id/toggle-status - Toggle promo status  
router.post('/promos/:id/toggle-status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const promo = await prisma.promo.findUnique({
      where: { id }
    });

    if (!promo) {
      return res.status(404).json({ message: 'Promo not found' });
    }

    const updatedPromo = await prisma.promo.update({
      where: { id },
      data: { isActive: !promo.isActive }
    });

    await recordAdminActivity({
      adminId: (req as any).user!.id,
      adminName: (req as any).user!.name,
      adminRole: (req as any).user!.role,
      method: req.method,
      path: req.path,
      status: 200,
      ip: req.ip,
      ua: req.get('User-Agent'),
      body: req.body,
      query: req.query
    });

    res.json({ 
      message: `Promo ${updatedPromo.isActive ? 'activated' : 'deactivated'} successfully`, 
      promo: updatedPromo 
    });
  } catch (error: any) {
    console.error('Toggle promo status error:', error);
    res.status(500).json({ message: error?.message || 'Failed to toggle promo status' });
  }
});

// GET /api/admin/tickets - Get tickets for redeem voucher
router.get('/tickets', adminAuth, async (req, res) => {
  try {
    const tickets = await prisma.tourismTicket.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tickets);
  } catch (error: any) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: error?.message || 'Failed to get tickets' });
  }
});

// GET /api/admin/point-redemptions - Get point redemptions for redeem voucher
router.get('/point-redemptions', adminAuth, async (req, res) => {
  try {
    const redemptions = await prisma.pointTransaction.findMany({
      where: { type: 'SPENT' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            memberProfile: {
              select: {
                fullName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(redemptions);
  } catch (error: any) {
    console.error('Get point redemptions error:', error);
    res.status(500).json({ message: error?.message || 'Failed to get point redemptions' });
  }
});

// GET /api/admin/event-registrations - Get event registrations for redeem voucher
router.get('/event-registrations', adminAuth, async (req, res) => {
  try {
    const registrations = await prisma.eventRegistration.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            memberProfile: {
              select: {
                fullName: true
              }
            }
          }
        },
        event: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(registrations);
  } catch (error: any) {
    console.error('Get event registrations error:', error);
    res.status(500).json({ message: error?.message || 'Failed to get event registrations' });
  }
});

// Test endpoint to verify router is working
router.get('/test', (req, res) => {
  console.log('🔍 Admin test endpoint hit!');
  res.json({ message: 'Admin router is working!' });
});

/* cleaned duplicate admins block at end to fix compilation */
export default router;
