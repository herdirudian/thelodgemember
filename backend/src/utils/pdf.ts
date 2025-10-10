import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export function createMembershipCardPDF(options: {
  fullName: string;
  email: string;
  phone: string;
  memberId: string;
  qrDataUrl: string;
  outputPath: string;
}) {
  const doc = new PDFDocument({ size: [400, 250], margin: 20 });
  const stream = fs.createWriteStream(options.outputPath);
  doc.pipe(stream);

  doc.rect(0, 0, 400, 250).fill('#ffffff');
  doc.fillColor('#0F4D39');
  doc.roundedRect(10, 10, 380, 230, 12).stroke('#0F4D39');

  doc.fontSize(18).fillColor('#0F4D39').text('The Lodge Family', 20, 20);
  doc.fontSize(10).fillColor('#333333').text('Membership Card', 20, 40);

  doc.fontSize(12).fillColor('#0F4D39').text(options.fullName, 20, 70);
  doc.fontSize(10).fillColor('#333333').text(`${options.email} | ${options.phone}`, 20, 90);
  doc.fontSize(10).fillColor('#333333').text(`Member ID: ${options.memberId}`, 20, 110);

  const qrBase64 = options.qrDataUrl.split(',')[1];
  const qrBuffer = Buffer.from(qrBase64, 'base64');
  const qrPath = path.join(path.dirname(options.outputPath), `qr-${options.memberId}.png`);
  fs.writeFileSync(qrPath, qrBuffer);
  doc.image(qrPath, 280, 60, { width: 100, height: 100 });

  doc.fontSize(9).fillColor('#0F4D39').text('Scan QR for validation', 280, 165, { width: 100, align: 'center' });

  doc.end();
  stream.on('finish', () => {
    try { fs.unlinkSync(qrPath); } catch {}
  });
}

// Bukti Redeem Voucher (A4)
export function createRedeemProofPDF(options: {
  outputPath: string;
  logoPath?: string;
  companyName?: string;
  memberName: string;
  voucherType: string;
  voucherLabel?: string;
  redeemedAt: Date;
  qrDataUrl: string;
  adminName: string;
}) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(options.outputPath);
  doc.pipe(stream);

  const company = options.companyName || 'The Lodge Family';
  // Header
  doc.rect(0, 0, doc.page.width, 80).fill('#ffffff');
  if (options.logoPath && fs.existsSync(options.logoPath)) {
    try { doc.image(options.logoPath, 50, 20, { width: 100 }); } catch {}
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

  // QR code (hasil digunakan)
  const qrBase64 = options.qrDataUrl.split(',')[1];
  const qrBuffer = Buffer.from(qrBase64, 'base64');
  const qrPath = path.join(path.dirname(options.outputPath), `qr-proof-${Date.now()}.png`);
  fs.writeFileSync(qrPath, qrBuffer);
  doc.moveDown(1);
  doc.fontSize(11).fillColor('#0F4D39').text('QR Voucher (terpakai):');
  doc.image(qrPath, 50, doc.y + 10, { width: 140, height: 140 });
  doc.moveDown(8);
  doc.fontSize(9).fillColor('#0F4D39').text('Scan QR bila diperlukan untuk validasi tambahan');

  // Footer
  doc.moveDown(2);
  doc.fontSize(10).fillColor('#999999').text('Dokumen ini dihasilkan otomatis oleh sistem The Lodge Family.');

  doc.end();
  stream.on('finish', () => {
    try { fs.unlinkSync(qrPath); } catch {}
  });
}