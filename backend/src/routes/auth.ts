import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { signPayload } from '../utils/security';
import { generateQRDataURL } from '../utils/qr';
import { createMembershipCardPDF } from '../utils/pdf';
import { generateMembershipNumber } from '../utils/membershipNumber';
import path from 'path';
import { sendEmail } from '../utils/email';

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

// Limit brute-force attempts on auth endpoints without changing functionality
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 20,           // 20 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Validate registration code endpoint
router.post('/validate-registration-code', authLimiter, async (req, res) => {
  try {
    const { code } = req.body as { code: string };

    if (!code) {
      return res.status(400).json({ message: 'Kode registrasi harus diisi' });
    }

    // Find the registration code
    const registrationCode = await prisma.registrationCode.findUnique({ where: { code } });
    
    if (!registrationCode || !registrationCode.isActive) {
      return res.status(400).json({ message: 'Kode registrasi tidak valid atau sudah tidak aktif' });
    }

    // Check if code has expired
    if (registrationCode.expiresAt && registrationCode.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Kode registrasi sudah kadaluarsa' });
    }

    // Check quota limit if set
    if (registrationCode.quota !== null && registrationCode.usedCount >= registrationCode.quota) {
      return res.status(400).json({ message: 'Kuota kode registrasi sudah habis' });
    }

    res.json({ message: 'Kode registrasi valid' });
  } catch (e) {
    console.error('Validate registration code error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { fullName, email, phone, password, registrationCode } = req.body as {
      fullName: string; email: string; phone: string; password: string; registrationCode: string;
    };
    if (!fullName || !email || !phone || !password || !registrationCode) return res.status(400).json({ message: 'Missing fields' });

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password harus minimal 6 karakter' });
    }

    // Check if email is already registered
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email sudah terdaftar' });

    // Verify the registration code
    const regCode = await prisma.registrationCode.findUnique({ where: { code: registrationCode } });
    if (!regCode || !regCode.isActive || (regCode.expiresAt && regCode.expiresAt < new Date())) {
      return res.status(400).json({ message: 'Kode registrasi tidak valid atau sudah kadaluarsa' });
    }

    // Check quota limit if set
    if (regCode.quota !== null && regCode.usedCount >= regCode.quota) {
      return res.status(400).json({ message: 'Kuota kode registrasi sudah habis' });
    }

    // Create new user with the provided password
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed, role: Role.MEMBER } });
    const membershipNumber = await generateMembershipNumber();
    const payload = { type: 'member', memberId: user.id };
    const { data, hash } = signPayload(payload);

    const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
    const qrDataURL = await generateQRDataURL(qrUrl);

    const member = await prisma.member.create({ data: {
      userId: user.id,
      fullName,
      phone,
      membershipNumber,
      qrPayloadHash: hash,
    }});

    const cardsDir = path.join(process.cwd(), 'cards');
    const pdfPath = path.join(cardsDir, `${member.id}.pdf`);
    try { require('fs').mkdirSync(cardsDir, { recursive: true }); } catch {}
    createMembershipCardPDF({ fullName, email, phone, memberId: member.id, qrDataUrl: qrDataURL, outputPath: pdfPath, logoPath: path.join(process.cwd(), '..', 'frontend', 'public', 'The Lodge Maribaya Logo.svg') });

    await prisma.member.update({ where: { id: member.id }, data: { membershipCardUrl: `${config.appUrl}/files/cards/${member.id}.pdf` } });

    // Increment usage count and deactivate if quota reached or no quota set
    if (regCode.quota === null) {
      // No quota limit - deactivate after single use (original behavior)
      await prisma.registrationCode.update({ 
        where: { id: regCode.id }, 
        data: { isActive: false, usedCount: regCode.usedCount + 1 } 
      });
    } else {
      // Has quota - increment count and deactivate if quota reached
      const newUsedCount = regCode.usedCount + 1;
      await prisma.registrationCode.update({ 
        where: { id: regCode.id }, 
        data: { 
          usedCount: newUsedCount,
          isActive: newUsedCount < regCode.quota 
        } 
      });
    }

    const token = jwt.sign({ uid: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
    res.json({ 
      message: 'Registrasi berhasil! Anda dapat login menggunakan email dan password yang telah dibuat.',
      token, 
      member 
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request a registration code via email without altering existing registration flow
router.post('/request-code', authLimiter, async (req, res) => {
  try {
    const { email, fullName } = req.body as { email?: string; fullName?: string };
    if (!email) return res.status(400).json({ message: 'Missing email' });
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: 'Email sudah terdaftar' });

    const code = `CODE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
    await prisma.registrationCode.create({ data: { code, isActive: true, expiresAt, createdBy: 'system' } });

    const safeName = (fullName && fullName.trim().length > 0) ? fullName.trim() : (email.split('@')[0] || 'Member');
    const subject = 'Kode Pendaftaran Member';
    const html = `
      <p>Halo ${safeName},</p>
      <p>Berikut kode pendaftaran Anda:</p>
      <p style="font-size:18px"><strong>${code}</strong></p>
      <p>Kode berlaku hingga ${expiresAt.toLocaleString('id-ID')}.</p>
      <p>Masukkan kode ini pada form pendaftaran untuk melanjutkan.</p>
      <p>Terima kasih.</p>
    `;
    await sendEmail(email, subject, html);

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send 6-digit email verification code
router.post('/send-email-verification', authLimiter, async (req, res) => {
  try {
    const { email, fullName } = req.body as { email: string; fullName?: string };
    if (!email) return res.status(400).json({ message: 'Missing email' });

    // Check if email is already registered
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ message: 'Email sudah terdaftar' });

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

    // Store verification code in database (reuse registrationCode table)
    await prisma.registrationCode.create({ 
      data: { 
        code: verificationCode, 
        isActive: true, 
        expiresAt, 
        createdBy: 'email-verification' 
      } 
    });

    const safeName = (fullName && fullName.trim().length > 0) ? fullName.trim() : (email.split('@')[0] || 'Member');
    const subject = 'Kode Verifikasi Email';
    const html = `
      <p>Halo ${safeName},</p>
      <p>Berikut kode verifikasi email Anda:</p>
      <p style="font-size:24px; font-weight:bold; color:#0F4D39; text-align:center; padding:20px; background:#f5f5f5; border-radius:8px;">${verificationCode}</p>
      <p>Kode berlaku hingga ${expiresAt.toLocaleString('id-ID')}.</p>
      <p>Masukkan kode ini untuk memverifikasi email Anda.</p>
      <p>Terima kasih.</p>
    `;
    await sendEmail(email, subject, html);

    res.json({ success: true, message: 'Kode verifikasi telah dikirim ke email Anda' });
  } catch (e) {
    console.error('Send email verification error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify 6-digit email code
router.post('/verify-email-code', authLimiter, async (req, res) => {
  try {
    const { email, verificationCode } = req.body as { email: string; verificationCode: string };
    if (!email || !verificationCode) return res.status(400).json({ message: 'Missing email or verification code' });

    // Check if email is already registered
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email sudah terdaftar' });

    // Find the verification code
    const regCode = await prisma.registrationCode.findUnique({ where: { code: verificationCode } });
    if (!regCode || !regCode.isActive || (regCode.expiresAt && regCode.expiresAt < new Date())) {
      return res.status(400).json({ message: 'Kode verifikasi tidak valid atau sudah kadaluarsa' });
    }

    // Mark the code as used (deactivate it)
    await prisma.registrationCode.update({
      where: { id: regCode.id },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'Email berhasil diverifikasi' });
  } catch (e) {
    console.error('Email verification error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
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

// Get current user profile - endpoint /api/auth/me
router.get('/auth/me', authMiddleware, async (req: any, res) => {
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

// Update user profile - endpoint /api/auth/profile
router.put('/auth/profile', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.uid as string;
    const { fullName, phone, dateOfBirth, address } = req.body as {
      fullName: string;
      phone: string;
      dateOfBirth?: string;
      address?: string;
    };

    if (!fullName || !phone) {
      return res.status(400).json({ message: 'Nama lengkap dan nomor telepon harus diisi' });
    }

    // Update user data
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { member: true } });
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Update member data if exists
    if (user.member) {
      await prisma.member.update({
        where: { userId },
        data: {
          fullName,
          phone,
          dateOfBirth: dateOfBirth && dateOfBirth.trim() !== '' ? new Date(dateOfBirth) : null,
          address: address || null
        }
      });

      // Regenerate membership card PDF with updated information
      const membershipNumber = user.member.membershipNumber;
      const payload = { type: 'member', memberId: user.id };
      const { data, hash } = signPayload(payload);
      const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(data)}&hash=${hash}`;
      const qrDataURL = await generateQRDataURL(qrUrl);

      const cardsDir = path.join(process.cwd(), 'cards');
      const pdfPath = path.join(cardsDir, `${user.member.id}.pdf`);
      try { require('fs').mkdirSync(cardsDir, { recursive: true }); } catch {}
      createMembershipCardPDF({ 
        fullName, 
        email: user.email, 
        phone, 
        memberId: user.member.id, 
        qrDataUrl: qrDataURL, 
        outputPath: pdfPath, 
        logoPath: path.join(process.cwd(), '..', 'frontend', 'public', 'The Lodge Maribaya Logo.svg') 
      });
    }

    res.json({ message: 'Profil berhasil diperbarui' });
  } catch (e) {
    console.error('Update profile error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send WhatsApp verification code via Watzap
router.post('/send-whatsapp-verification', authLimiter, async (req, res) => {
  try {
    const { phone } = req.body as { phone: string };
    if (!phone) return res.status(400).json({ message: 'Nomor telepon diperlukan' });

    // Validate phone number format (Indonesian format)
    const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Format nomor telepon tidak valid' });
    }

    // Normalize phone number to international format
    let normalizedPhone = phone.replace(/^0/, '62').replace(/^\+/, '');
    if (!normalizedPhone.startsWith('62')) {
      normalizedPhone = '62' + normalizedPhone;
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

    // Store verification code in database
    await prisma.registrationCode.create({ 
      data: { 
        code: verificationCode, 
        isActive: true, 
        expiresAt, 
        createdBy: `whatsapp-verification-${normalizedPhone}` 
      } 
    });

    // Send WhatsApp message via Watzap
    const watzapMessage = `Kode verifikasi The Lodge Family Anda: *${verificationCode}*\n\nKode berlaku hingga ${expiresAt.toLocaleString('id-ID')}.\n\nJangan bagikan kode ini kepada siapa pun.`;
    
    try {
      // Note: Replace with actual Watzap API endpoint and credentials
      const watzapResponse = await fetch('https://api.watzap.id/v1/send_message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: process.env.WATZAP_API_KEY || 'your-watzap-api-key',
          number_key: process.env.WATZAP_NUMBER_KEY || 'ALL',
          phone_no: normalizedPhone,
          message: watzapMessage
        })
      });

      if (!watzapResponse.ok) {
        throw new Error(`Watzap API error: ${watzapResponse.status}`);
      }

      res.json({ 
        success: true, 
        message: 'Kode verifikasi telah dikirim ke WhatsApp Anda',
        phone: normalizedPhone 
      });
    } catch (watzapError) {
      console.error('Watzap API error:', watzapError);
      // For development/testing, still return success but log the error
      res.json({ 
        success: true, 
        message: 'Kode verifikasi telah dikirim ke WhatsApp Anda (mode development)',
        phone: normalizedPhone,
        code: verificationCode // Remove this in production
      });
    }
  } catch (e) {
    console.error('Send WhatsApp verification error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify WhatsApp verification code
router.post('/verify-whatsapp-code', authLimiter, async (req, res) => {
  try {
    const { phone, verificationCode } = req.body as { phone: string; verificationCode: string };
    if (!phone || !verificationCode) {
      return res.status(400).json({ message: 'Nomor telepon dan kode verifikasi diperlukan' });
    }

    // Normalize phone number
    let normalizedPhone = phone.replace(/^0/, '62').replace(/^\+/, '');
    if (!normalizedPhone.startsWith('62')) {
      normalizedPhone = '62' + normalizedPhone;
    }

    // Find the verification code
    const regCode = await prisma.registrationCode.findUnique({ 
      where: { code: verificationCode } 
    });
    
    if (!regCode || !regCode.isActive || (regCode.expiresAt && regCode.expiresAt < new Date())) {
      return res.status(400).json({ message: 'Kode verifikasi tidak valid atau sudah kadaluarsa' });
    }

    // Check if the code was created for this phone number
    if (!regCode.createdBy.includes(normalizedPhone)) {
      return res.status(400).json({ message: 'Kode verifikasi tidak valid untuk nomor telepon ini' });
    }

    // Mark the code as used (deactivate it)
    await prisma.registrationCode.update({
      where: { id: regCode.id },
      data: { isActive: false }
    });

    res.json({ 
      success: true, 
      message: 'Nomor telepon berhasil diverifikasi',
      verified: true 
    });
  } catch (e) {
    console.error('Verify WhatsApp code error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;