import { Router } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { signPayload } from '../utils/security';
import { generateQRDataURL } from '../utils/qr';
import { createMembershipCardPDF } from '../utils/pdf';
import path from 'path';

const prisma = new PrismaClient();
const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, code } = req.body as {
      fullName: string; email: string; phone: string; password: string; code: string
    };
    if (!fullName || !email || !phone || !password || !code) return res.status(400).json({ message: 'Missing fields' });

    const regCode = await prisma.registrationCode.findUnique({ where: { code } });
    if (!regCode || !regCode.isActive || (regCode.expiresAt && regCode.expiresAt < new Date())) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed, role: Role.MEMBER } });
    const payload = { type: 'member', memberId: user.id };
    const { data, hash } = signPayload(payload);

    const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
    const qrDataURL = await generateQRDataURL(qrUrl);

    const member = await prisma.member.create({ data: {
      userId: user.id,
      fullName,
      phone,
      qrPayloadHash: hash,
    }});

    const cardsDir = path.join(process.cwd(), 'cards');
    const pdfPath = path.join(cardsDir, `${member.id}.pdf`);
    try { require('fs').mkdirSync(cardsDir, { recursive: true }); } catch {}
    createMembershipCardPDF({ fullName, email, phone, memberId: member.id, qrDataUrl: qrDataURL, outputPath: pdfPath, logoPath: path.join(process.cwd(), '..', 'frontend', 'public', 'The Lodge Maribaya Logo.svg') });

    await prisma.member.update({ where: { id: member.id }, data: { membershipCardUrl: `${config.appUrl}/files/cards/${member.id}.pdf` } });

    const token = jwt.sign({ uid: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
    res.json({ token, member });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ uid: user.id, role: user.role, adminRole: user.adminRole, isActive: user.isActive }, config.jwtSecret, { expiresIn: '7d' });
    const member = await prisma.member.findUnique({ where: { userId: user.id } });
    res.json({ token, role: user.role, adminRole: user.adminRole, isActive: user.isActive, member });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;