import { Router } from 'express';
import { PrismaClient, RedemptionStatus, RegistrationStatus, TicketStatus, PromoType } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { verifyPayload } from '../utils/security';
import multer from 'multer';
import dayjs from 'dayjs';
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
  } catch (err) {
    // Fallback raw SQL for MySQL
    try {
      const id = uuidv4();
      // Pastikan tabel tersedia
      try {
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS AdminActivity (
          id CHAR(36) NOT NULL,
          adminId VARCHAR(191) NOT NULL,
          adminName VARCHAR(191) NULL,
          adminRole ENUM('CASHIER','MODERATOR','OWNER','SUPER_ADMIN') NULL,
          method VARCHAR(16) NOT NULL,
          path VARCHAR(255) NOT NULL,
          status INT NOT NULL,
          ip VARCHAR(64) NULL,
          userAgent VARCHAR(255) NULL,
          requestBody TEXT NULL,
          query TEXT NULL,
          createdAt DATETIME(3) NOT NULL,
          PRIMARY KEY (id)
        )`);
      } catch {}
      await prisma.$executeRaw`INSERT INTO AdminActivity (id, adminId, adminName, adminRole, method, path, status, ip, userAgent, requestBody, query, createdAt) VALUES (${id}, ${payload.adminId}, ${payload.adminName}, ${payload.adminRole}, ${payload.method}, ${payload.path}, ${payload.status}, ${payload.ip}, ${payload.userAgent}, ${payload.requestBody}, ${payload.query}, ${payload.createdAt})`;
    } catch (e2) {
      console.error('Failed to record admin activity:', e2);
    }
  }
}

async function adminAuth(req: any, res: any, next: any) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  const method = String(req.method || '').toUpperCase();
  const pathname = String(req.originalUrl || req.path || '');
  const ip = (req.headers['x-forwarded-for'] as any) || req.ip || '';
  const ua = (req.headers['user-agent'] as any) || '';
  if (!token) {
    try {
      await recordAdminActivity({ adminId: 'unknown', method, path: pathname, status: 401, ip, ua, body: req.body, query: req.query });
    } catch {}
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const payload: any = jwt.verify(token, config.jwtSecret);
    if (payload.role !== 'ADMIN') {
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
});

// Members listing
router.get('/members', adminAuth, async (_req, res) => {
  try {
    const list = await prisma.member.findMany({
      include: { user: true },
      orderBy: { registrationDate: 'desc' },
      take: 100,
    });
    res.json(list);
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
router.post('/registration-codes', adminAuth, async (req, res) => {
  const { code, expiresAt, isActive } = req.body as { code?: string; expiresAt?: string; isActive?: boolean };
  const payload = {
    code: code || `CODE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    isActive: isActive ?? true,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    createdBy: 'admin',
  };
  const created = await prisma.registrationCode.create({ data: payload });
  res.json(created);
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
    const { title, description, eventDate, quota } = req.body as { title: string; description: string; eventDate: string; quota: string };
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
    } });
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
    const { start, end, adminId, method } = req.query as { start?: string; end?: string; adminId?: string; method?: string };
    const where: any = {};
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = new Date(start);
      if (end) where.createdAt.lte = new Date(end);
    }
    if (adminId) where.adminId = String(adminId);
    if (method) where.method = String(method).toUpperCase();
    try {
      const list = await (prisma as any).adminActivity.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
      return res.json({ activities: list });
    } catch {
      // Fallback raw query
      const clauses: string[] = [];
      const params: any[] = [];
      if (start) { clauses.push(`createdAt >= ?`); params.push(new Date(start)); }
      if (end) { clauses.push(`createdAt <= ?`); params.push(new Date(end)); }
      if (adminId) { clauses.push(`adminId = ?`); params.push(String(adminId)); }
      if (method) { clauses.push(`method = ?`); params.push(String(method).toUpperCase()); }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const rows: any = await prisma.$queryRawUnsafe(`SELECT * FROM AdminActivity ${whereSql} ORDER BY createdAt DESC LIMIT 500`, ...params);
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
      createRedeemProofPDF({ outputPath, memberName, voucherType: 'Tiket Gratis Member', voucherLabel, redeemedAt, qrDataUrl: qrDataURL, adminName, companyName: 'The Lodge Family' });
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
      createRedeemProofPDF({ outputPath, memberName, voucherType: 'Redeem Poin', voucherLabel, redeemedAt, qrDataUrl: qrDataURL, adminName, companyName: 'The Lodge Family' });
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
      createRedeemProofPDF({ outputPath, memberName, voucherType: 'Event Eksklusif Member', voucherLabel, redeemedAt, qrDataUrl: qrDataURL, adminName, companyName: 'The Lodge Family' });
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
    if (type && ['TICKET', 'POINTS', 'EVENT'].includes(type)) where.voucherType = type;
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
    const { start, end, adminId, method } = req.query as { start?: string; end?: string; adminId?: string; method?: string };
    const where: any = {};
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = new Date(start);
      if (end) where.createdAt.lte = new Date(end);
    }
    if (adminId) where.adminId = String(adminId);
    if (method) where.method = String(method).toUpperCase();
    try {
      const list = await (prisma as any).adminActivity.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
      return res.json({ activities: list });
    } catch {
      // Fallback raw query
      const clauses: string[] = [];
      const params: any[] = [];
      if (start) { clauses.push(`createdAt >= ?`); params.push(new Date(start)); }
      if (end) { clauses.push(`createdAt <= ?`); params.push(new Date(end)); }
      if (adminId) { clauses.push(`adminId = ?`); params.push(String(adminId)); }
      if (method) { clauses.push(`method = ?`); params.push(String(method).toUpperCase()); }
      const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const rows: any = await prisma.$queryRawUnsafe(`SELECT * FROM AdminActivity ${whereSql} ORDER BY createdAt DESC LIMIT 500`, ...params);
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
      createRedeemProofPDF({ outputPath, memberName, voucherType: 'Tiket Gratis Member', voucherLabel, redeemedAt, qrDataUrl: qrDataURL, adminName, companyName: 'The Lodge Family' });
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
      createRedeemProofPDF({ outputPath, memberName, voucherType: 'Redeem Poin', voucherLabel, redeemedAt, qrDataUrl: qrDataURL, adminName, companyName: 'The Lodge Family' });
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
      createRedeemProofPDF({ outputPath, memberName, voucherType: 'Event Eksklusif Member', voucherLabel, redeemedAt, qrDataUrl: qrDataURL, adminName, companyName: 'The Lodge Family' });
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
    if (type && ['TICKET', 'POINTS', 'EVENT'].includes(type)) where.voucherType = type;
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

/* cleaned duplicate admins block at end to fix compilation */
export default router;