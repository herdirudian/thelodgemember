import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import verifyRouter from './routes/verify';
import memberRouter from './routes/member';
import adminRouter from './routes/admin';
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
const allowedOrigins = [config.frontendUrl, 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];
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
app.use('/api', memberRouter);
app.use('/api/admin', adminRouter);

// Health
app.get('/', (_req, res) => {
  res.send({ status: 'ok', name: 'The Lodge Family Membership API' });
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
        createMembershipCardPDF({ fullName, email: adminEmail, phone, memberId: adminMember.id, qrDataUrl: qrDataURL, outputPath: pdfPath });
        await prisma.member.update({ where: { id: adminMember.id }, data: { membershipCardUrl: `${config.appUrl}/files/cards/${adminMember.id}.pdf` } });

        console.log(`Seeded admin user: ${adminEmail}`);
      }
    }
  } catch (e) {
    console.error('Seed error', e);
  }
}
seedInitialData();