import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
// @ts-ignore - no types for svg-to-pdfkit
const SVGtoPDF = require('svg-to-pdfkit');

export function createMembershipCardPDF(options: {
  fullName: string;
  email: string;
  phone: string;
  memberId: string;
  qrDataUrl: string;
  outputPath: string;
  logoPath?: string;
}) {
  const width = 400;
  const height = 250;
  const doc = new PDFDocument({ size: [width, height], margin: 0 });
  const stream = fs.createWriteStream(options.outputPath);
  doc.pipe(stream);

  // Background
  doc.rect(0, 0, width, height).fill('#f7f9f8');

  // Card container with rounded border
  doc.roundedRect(10, 10, width - 20, height - 20, 14).fill('#ffffff');
  doc.roundedRect(10, 10, width - 20, height - 20, 14).stroke('#e2e8e6');

  // Brand header bar
  doc.save();
  doc.roundedRect(10, 10, width - 20, 62, 14).fill('#0F4D39');
  // Logo area (support PNG/JPG, and SVG via svg-to-pdfkit)
  if (options.logoPath && fs.existsSync(options.logoPath)) {
    const lower = options.logoPath.toLowerCase();
    if (lower.endsWith('.svg')) {
      try {
        const svgContent = fs.readFileSync(options.logoPath, 'utf8');
        SVGtoPDF(doc, svgContent, 20, 16, { width: 44, height: 28 });
      } catch {}
    } else {
      try { doc.image(options.logoPath, 20, 20, { width: 40, height: 24 }); } catch {}
    }
  } else {
    // Fallback simple logo mark (stylized leaf + stem)
    doc.fillColor('#ffffff');
    doc.save();
    doc.translate(28, 28);
    doc.scale(1.0);
    doc.moveTo(0, 12).bezierCurveTo(20, -12, 40, 12, 0, 40).fill('#86d2b7');
    doc.restore();
    doc.roundedRect(42, 28, 4, 28, 2).fill('#c7f1e0');
  }
  // Brand text
  doc.fillColor('#ffffff').fontSize(18).text('The Lodge', 70, 22, { width: width - 90, align: 'left' });
  doc.fillColor('#e6f2ef').fontSize(11).text('Family Membership', 70, 42, { width: width - 90, align: 'left' });
  doc.restore();

  // Member main info
  const contentLeftX = 24;
  const contentTopY = 86;
  doc.fillColor('#0F4D39').fontSize(14).text(options.fullName, contentLeftX, contentTopY, { width: 220 });
  doc.fillColor('#4b5563').fontSize(10).text(`${options.email}  •  ${options.phone}`, contentLeftX, contentTopY + 20, { width: 220 });

  // Member ID badge
  doc.save();
  doc.roundedRect(contentLeftX, contentTopY + 44, 200, 36, 8).fill('#e8f3f0');
  doc.fillColor('#0F4D39').fontSize(10).text('Member ID', contentLeftX + 10, contentTopY + 50);
  doc.fontSize(12).text(options.memberId, contentLeftX + 10, contentTopY + 64);
  doc.restore();

  // QR box on the right
  const qrBoxX = width - 146;
  const qrBoxY = 86;
  const qrBoxW = 120;
  const qrBoxH = 120;
  doc.save();
  doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 12).fill('#ffffff');
  doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 12).stroke('#0F4D39');

  // Prepare QR image from data URL (temporary file to ensure pdfkit compatibility)
  const qrBase64 = options.qrDataUrl.split(',')[1];
  const qrBuffer = Buffer.from(qrBase64, 'base64');
  const tempDir = path.dirname(options.outputPath);
  const qrPath = path.join(tempDir, `qr-${options.memberId}.png`);
  try { fs.writeFileSync(qrPath, qrBuffer); } catch {}
  try { doc.image(qrPath, qrBoxX + 10, qrBoxY + 10, { width: qrBoxW - 20, height: qrBoxW - 20 }); } catch {}

  doc.fillColor('#0F4D39').fontSize(9).text('Scan QR untuk verifikasi', qrBoxX, qrBoxY + qrBoxH - 22, { width: qrBoxW, align: 'center' });
  doc.restore();

  // Footer tagline
  doc.fillColor('#6b7280').fontSize(9).text('Experience nature & adventure at The Lodge', 20, height - 28, { width: width - 40, align: 'center' });

  doc.end();
  stream.on('finish', () => {
    try { fs.unlinkSync(qrPath); } catch {}
  });
}

// Bukti Redeem Voucher (A4)
export async function createRedeemProofPDF(options: {
  outputPath: string;
  logoPath?: string;
  companyName?: string;
  memberName: string;
  voucherType: string;
  voucherLabel?: string;
  redeemedAt: Date;
  qrDataUrl: string;
  adminName: string;
}): Promise<void> {
  try {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(options.outputPath);
    doc.pipe(stream);

      const company = options.companyName || 'The Lodge Family';
      // Header
      doc.rect(0, 0, doc.page.width, 80).fill('#ffffff');
      if (options.logoPath && fs.existsSync(options.logoPath)) {
        try {
          const lower = options.logoPath.toLowerCase();
          if (lower.endsWith('.svg')) {
            const svg = fs.readFileSync(options.logoPath, 'utf8');
            SVGtoPDF(doc, svg, 50, 20, { width: 100, height: 50 });
          } else {
            doc.image(options.logoPath, 50, 20, { width: 100 });
          }
        } catch {}
      }
      doc.fontSize(20).fillColor('#0F4D39').text(company, 170, 25);
      doc.fontSize(12).fillColor('#333333').text('Bukti Redeem Voucher', 170, 50);

      doc.moveDown(2);
      doc.fontSize(14).fillColor('#0F4D39').text('Detail Redeem', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#333333').text(`Nama Member      : ${options.memberName}`);
      doc.text(`Jenis Voucher     : ${options.voucherType}${options.voucherLabel ? ` - ${options.voucherLabel}` : ''}`);
      doc.text(`Tanggal & Waktu   : ${options.redeemedAt.toLocaleString('id-ID')}`);
      doc.text(`Verifikasi oleh   : ${options.adminName}`);

    // QR code (hasil digunakan) — lebih robust terhadap input non-data URL
    let qrDataUrl = options.qrDataUrl;
    if (!qrDataUrl || !qrDataUrl.startsWith('data:')) {
      try {
        qrDataUrl = await QRCode.toDataURL(qrDataUrl || '');
      } catch {}
    }

    let qrPath: string | undefined;
    try {
      const commaIndex = qrDataUrl.indexOf(',');
      if (commaIndex !== -1) {
        const qrBase64 = qrDataUrl.substring(commaIndex + 1);
        const qrBuffer = Buffer.from(qrBase64, 'base64');
        qrPath = path.join(path.dirname(options.outputPath), `qr-proof-${Date.now()}.png`);
        try { fs.writeFileSync(qrPath, qrBuffer); } catch {}
        try { doc.image(qrPath, doc.page.width - 170, 120, { width: 120, height: 120 }); } catch {}
      }
    } catch {}

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => {
        try { if (qrPath) fs.unlinkSync(qrPath); } catch {}
        resolve();
      });
      stream.on('error', (error) => {
        try { if (qrPath) fs.unlinkSync(qrPath); } catch {}
        reject(error);
      });
    });
  } catch (error) {
    throw error;
  }
}
