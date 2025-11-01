import nodemailer from 'nodemailer';
import { config } from '../config';

// Interface untuk data booking yang akan dikirim via email
interface BookingEmailData {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  tourismTicket: {
    name: string;
    description: string;
    location: string;
    duration: string;
    category: string;
    price: number;
    imageUrl?: string;
  };
  quantity: number;
  totalAmount: number;
  bookingDate: string;
  status: string;
  paymentStatus: string;
  qrCode?: string;
  friendlyCode?: string;
}

// Konfigurasi transporter email
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Template HTML untuk e-voucher
const generateEVoucherHTML = (booking: BookingEmailData): string => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>E-Voucher - ${booking.tourismTicket.name}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .voucher-title {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 10px;
        }
        .booking-id {
          background-color: #eff6ff;
          padding: 10px;
          border-radius: 5px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 20px;
        }
        .ticket-info {
          background-color: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #10b981;
        }
        .ticket-image {
          width: 100%;
          max-width: 300px;
          height: 200px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-label {
          font-weight: bold;
          color: #374151;
        }
        .info-value {
          color: #6b7280;
        }
        .total-amount {
          background-color: #fef3c7;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          margin: 20px 0;
          border: 2px solid #f59e0b;
        }
        .qr-code {
          text-align: center;
          margin: 20px 0;
          padding: 20px;
          background-color: #f9fafb;
          border-radius: 8px;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .status-paid {
          background-color: #d1fae5;
          color: #065f46;
        }
        .important-note {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
        }
        .important-note h4 {
          color: #dc2626;
          margin-top: 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">The Lodge Family</div>
          <h1 class="voucher-title">E-Voucher Tiket Wisata</h1>
          <div class="booking-id">Booking ID: ${booking.id}</div>
        </div>

        <div class="ticket-info">
          ${booking.tourismTicket.imageUrl ? `<img src="${booking.tourismTicket.imageUrl}" alt="${booking.tourismTicket.name}" class="ticket-image">` : ''}
          <h2 style="color: #1f2937; margin-top: 0;">${booking.tourismTicket.name}</h2>
          <p style="color: #6b7280; margin-bottom: 15px;">${booking.tourismTicket.description}</p>
          
          <div class="info-row">
            <span class="info-label">Kategori:</span>
            <span class="info-value">${booking.tourismTicket.category}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Lokasi:</span>
            <span class="info-value">${booking.tourismTicket.location}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Durasi:</span>
            <span class="info-value">${booking.tourismTicket.duration}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Harga per Tiket:</span>
            <span class="info-value">${formatPrice(booking.tourismTicket.price)}</span>
          </div>
        </div>

        <h3 style="color: #1f2937;">Detail Pemesanan</h3>
        <div class="info-row">
          <span class="info-label">Nama Pemesan:</span>
          <span class="info-value">${booking.customerName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${booking.customerEmail}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Telepon:</span>
          <span class="info-value">${booking.customerPhone}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Alamat:</span>
          <span class="info-value">${booking.customerAddress}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Jumlah Tiket:</span>
          <span class="info-value">${booking.quantity} tiket</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tanggal Booking:</span>
          <span class="info-value">${formatDate(booking.bookingDate)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status Pembayaran:</span>
          <span class="info-value">
            <span class="status-badge status-paid">LUNAS</span>
          </span>
        </div>

        <div class="total-amount">
          <h3 style="margin: 0; color: #92400e;">Total Pembayaran</h3>
          <h2 style="margin: 10px 0 0 0; color: #92400e;">${formatPrice(booking.totalAmount)}</h2>
        </div>

        ${booking.qrCode ? `
        <div class="qr-code">
          <h4 style="color: #1f2937;">QR Code E-Voucher</h4>
          <img src="${booking.qrCode}" alt="QR Code" style="max-width: 200px;">
          ${booking.friendlyCode ? `
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: center;">
            <h4 style="color: #1f2937; margin: 0 0 10px 0;">Kode Voucher</h4>
            <div style="font-size: 18px; font-weight: bold; color: #059669; letter-spacing: 2px; font-family: monospace;">
              ${booking.friendlyCode}
            </div>
            <p style="font-size: 12px; color: #6b7280; margin: 10px 0 0 0;">
              Alternatif: Berikan kode ini jika QR code tidak dapat dipindai
            </p>
          </div>
          ` : ''}
          <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
            Tunjukkan QR Code atau kode voucher ini saat check-in
          </p>
        </div>
        ` : ''}

        <div class="important-note">
          <h4>Informasi Penting:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li>E-voucher ini berlaku sebagai tiket masuk</li>
            <li>Harap tunjukkan e-voucher ini (digital atau print) saat check-in</li>
            <li>Tiket tidak dapat dikembalikan atau ditukar</li>
            <li>Untuk pertanyaan, hubungi customer service kami</li>
          </ul>
        </div>

        <div class="footer">
          <p><strong>The Lodge Family</strong></p>
          <p>Email: ${process.env.FROM_EMAIL} | Website: ${process.env.FRONTEND_URL}</p>
          <p style="font-size: 12px;">
            Email ini dikirim secara otomatis, mohon tidak membalas email ini.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Fungsi untuk mengirim e-voucher email
export const sendEVoucherEmail = async (booking: BookingEmailData): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: process.env.FROM_NAME || 'The Lodge Family',
        address: process.env.FROM_EMAIL || 'no-reply@thelodgegroup.id',
      },
      to: booking.customerEmail,
      subject: `E-Voucher Tiket Wisata - ${booking.tourismTicket.name} (${booking.id})`,
      html: generateEVoucherHTML(booking),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('E-voucher email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send e-voucher email:', error);
    return false;
  }
};

// Fungsi untuk mengirim email konfirmasi booking (sebelum pembayaran)
export const sendBookingConfirmationEmail = async (booking: BookingEmailData): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: {
        name: process.env.FROM_NAME || 'The Lodge Family',
        address: process.env.FROM_EMAIL || 'no-reply@thelodgegroup.id',
      },
      to: booking.customerEmail,
      subject: `Konfirmasi Booking - ${booking.tourismTicket.name} (${booking.id})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Konfirmasi Booking Tiket Wisata</h2>
          <p>Halo ${booking.customerName},</p>
          <p>Terima kasih telah melakukan booking tiket wisata di The Lodge Family.</p>
          <p><strong>Detail Booking:</strong></p>
          <ul>
            <li>Booking ID: ${booking.id}</li>
            <li>Tiket: ${booking.tourismTicket.name}</li>
            <li>Jumlah: ${booking.quantity} tiket</li>
            <li>Total: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(booking.totalAmount)}</li>
          </ul>
          <p>Silakan lakukan pembayaran untuk mengaktifkan tiket Anda. E-voucher akan dikirim setelah pembayaran berhasil.</p>
          <p>Terima kasih,<br>The Lodge Family</p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Booking confirmation email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error);
    return false;
  }
};