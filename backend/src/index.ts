import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import verifyRouter from './routes/verify';
import memberRouter from './routes/member';
import adminRouter from './routes/admin';
import adminActivitiesRouter from './routes/admin-activities';
import bookingRouter from './routes/booking';
import webhookRouter from './routes/webhook';
import path from 'path';
import fs from 'fs';
import { PrismaClient, Role } from '@prisma/client';
import { config } from './config';
import bcrypt from 'bcryptjs';
import { signPayload } from './utils/security';
import { generateQRDataURL } from './utils/qr';
import { createMembershipCardPDF } from './utils/pdf';

dotenv.config({ override: true });

const app = express();
app.use(express.json());
// Strengthen CORS: allow localhost variants, explicit methods and headers
const allowedOrigins = [config.frontendUrl, 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:3003', 'http://127.0.0.1:3003'];
app.use(cors({
  origin: (origin, callback) => {
    // In development, reflect the request origin to allow dev hosts and IPs
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (!origin) return callback(null, true);
    const isLocal = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
    if (allowedOrigins.includes(origin) || isLocal) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Disable COEP to avoid blocking cross-origin resources in dev
  crossOriginEmbedderPolicy: false,
}));
app.use(morgan('dev'));

// Routes
app.use('/api', authRouter);
app.use('/api', verifyRouter);
app.use('/api/member', memberRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin', adminActivitiesRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/webhook', webhookRouter);

// Health
app.get('/', (_req, res) => {
  res.send({ status: 'ok', name: 'The Lodge Family Membership API' });
});
// Tambahkan rute health untuk prefix /api agar ping di frontend mengembalikan JSON
app.get('/api', (_req, res) => {
  res.json({ status: 'ok', name: 'The Lodge Family Membership API', path: '/api' });
});

// Static files for generated membership cards
app.use('/files/cards', express.static(path.join(process.cwd(), 'cards')));

// Static files for uploaded assets (fallback jika tidak menggunakan Cloudinary)
app.use('/files/uploads', express.static(path.join(process.cwd(), 'uploads')));

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});

// Seed minimal data for local dev
const prisma = new PrismaClient();
async function seedInitialData() {
  try {
    const codeCount = await prisma.registrationCode.count();
    if (codeCount === 0) {
      await prisma.registrationCode.create({ data: { code: 'WELCOME2025', isActive: true, createdBy: 'system' } });
      console.log('Seeded registration code: WELCOME2025');
    }

    const annCount = await prisma.announcement.count();
    if (annCount === 0) {
      await prisma.announcement.create({
        data: {
          title: 'Welcome to The Lodge Family',
          description: 'Your membership is now active. Redeem free tickets and explore exclusive events!',
          postedAt: new Date(),
          createdBy: 'system',
        },
      });
      console.log('Seeded default announcement');
    }

    // Seed minimal sample events for local dev if none exists
    const evCount = await prisma.event.count();
    if (evCount === 0) {
      const now = Date.now();
      await prisma.event.create({
        data: {
          title: 'Exclusive Gathering',
          description: 'Meet & greet with members and enjoy exclusive benefits.',
          eventDate: new Date(now + 7 * 24 * 60 * 60 * 1000),
          quota: 100,
          imageUrl: undefined,
        },
      });
      await prisma.event.create({
        data: {
          title: 'Member Workshop',
          description: 'Hands-on workshop for members with limited seats.',
          eventDate: new Date(now + 14 * 24 * 60 * 60 * 1000),
          quota: 50,
          imageUrl: undefined,
        },
      });
      console.log('Seeded sample events: Exclusive Gathering, Member Workshop');
    }

    // Seed ADMIN account if provided via environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (!existingAdmin) {
        const hashed = await bcrypt.hash(adminPassword, 10);
        const adminUser = await prisma.user.create({ data: { email: adminEmail, password: hashed, role: Role.ADMIN } });
        const fullName = process.env.ADMIN_FULL_NAME || 'Administrator';
        const phone = process.env.ADMIN_PHONE || '0000000000';

        // Create a member profile for admin to enable dashboard and card generation
        const payload = { type: 'member', memberId: adminUser.id };
        const { data, hash } = signPayload(payload);
        const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
        const qrDataURL = await generateQRDataURL(qrUrl);

        const adminMember = await prisma.member.create({ data: {
          userId: adminUser.id,
          fullName,
          phone,
          qrPayloadHash: hash,
        }});

        const cardsDir = path.join(process.cwd(), 'cards');
        const pdfPath = path.join(cardsDir, `${adminMember.id}.pdf`);
        try { fs.mkdirSync(cardsDir, { recursive: true }); } catch {}
-        createMembershipCardPDF({ fullName, email: adminEmail, phone, memberId: adminMember.id, qrDataUrl: qrDataURL, outputPath: pdfPath, logoPath: path.join(process.cwd(), 'assets', 'lodge-logo.png') });
+        createMembershipCardPDF({ fullName, email: adminEmail, phone, memberId: adminMember.id, qrDataUrl: qrDataURL, outputPath: pdfPath, logoPath: path.join(process.cwd(), '..', 'frontend', 'public', 'The Lodge Maribaya Logo.svg') });
        await prisma.member.update({ where: { id: adminMember.id }, data: { membershipCardUrl: `${config.appUrl}/files/cards/${adminMember.id}.pdf` } });

        console.log(`Seeded admin user: ${adminEmail}`);
      }
    }
    // Seed default Settings if not exist
    const existingSettings = await (prisma as any).settings.findFirst({ orderBy: { updatedAt: 'desc' } }).catch(() => null);
    if (!existingSettings) {
      try {
        await (prisma as any).settings.create({ data: {
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
          xenditSecretKey: process.env.XENDIT_SECRET_KEY || null,
          xenditPublicKey: process.env.XENDIT_PUBLIC_KEY || null,
          xenditWebhookToken: process.env.XENDIT_WEBHOOK_TOKEN || null,
          xenditEnvironment: 'test',
        } });
        console.log('Seeded default Settings via Prisma');
      } catch {
        // Fallback raw SQL for MySQL if Prisma model ungenerated
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
            xenditSecretKey VARCHAR(191) NULL,
            xenditPublicKey VARCHAR(191) NULL,
            xenditWebhookToken VARCHAR(191) NULL,
            xenditEnvironment VARCHAR(191) NOT NULL DEFAULT 'test',
            createdAt DATETIME(3) NOT NULL,
            updatedAt DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
          )`);
          const rows: any = await prisma.$queryRawUnsafe(`SELECT * FROM Settings ORDER BY updatedAt DESC LIMIT 1`);
          if (!Array.isArray(rows) || rows.length === 0) {
            const now = new Date();
            const id = crypto.randomUUID ? crypto.randomUUID() : require('uuid').v4();
            await prisma.$executeRaw`INSERT INTO Settings (id, appName, defaultLocale, timeZone, primaryColor, darkMode, logoUrl, require2FA, sessionTimeout, allowDirectLogin, fromName, fromEmail, emailProvider, cloudinaryEnabled, cloudinaryFolder, webhookUrl, maintenanceMode, announcement, xenditSecretKey, xenditPublicKey, xenditWebhookToken, xenditEnvironment, createdAt, updatedAt) VALUES (${id}, 'The Lodge Family', 'id-ID', 'Asia/Jakarta', '#0F4D39', true, ${null}, false, 60, true, ${null}, ${null}, 'smtp', false, ${null}, ${null}, false, ${null}, ${process.env.XENDIT_SECRET_KEY || null}, ${process.env.XENDIT_PUBLIC_KEY || null}, ${process.env.XENDIT_WEBHOOK_TOKEN || null}, 'test', ${now}, ${now})`;
            console.log('Seeded default Settings via raw SQL');
          }
        } catch (err) {
          console.error('Failed to seed default Settings', err);
        }
      }
    }
  } catch (e) {
    console.error('Seed error', e);
  }
}
seedInitialData();