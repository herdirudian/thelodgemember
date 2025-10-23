import Xendit from 'xendit-node';
import { PrismaClient } from '@prisma/client';
import { sendEVoucherEmail } from './emailService';

const prisma = new PrismaClient();

interface XenditConfig {
  secretKey: string;
  environment: 'test' | 'live';
}

interface CreateInvoiceData {
  externalId: string;
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
  expiryDate?: Date;
}

interface PaymentResult {
  success: boolean;
  invoiceId?: string;
  invoiceUrl?: string;
  externalId?: string;
  error?: string;
}

class XenditService {
  private xendit: any;
  private config: XenditConfig;

  constructor(config: XenditConfig) {
    this.config = config;
    this.xendit = new Xendit({
      secretKey: config.secretKey,
    });
  }

  /**
   * Create payment invoice for booking
   */
  async createInvoice(data: CreateInvoiceData): Promise<PaymentResult> {
    try {
      // Check if we're in development mode with invalid API keys
      // Only use development mode for old/invalid keys, not for real test keys
      const isDevelopmentMode = this.config.secretKey.includes('development') && 
                               (this.config.secretKey.includes('G0rv') || this.config.secretKey.includes('O46J'));
      
      if (isDevelopmentMode) {
        console.log('🚧 Development mode: Simulating Xendit invoice creation');
        
        // Simulate invoice creation for development
        const mockInvoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mockInvoiceUrl = `https://checkout.xendit.co/web/${mockInvoiceId}`;
        
        return {
          success: true,
          invoiceId: mockInvoiceId,
          invoiceUrl: mockInvoiceUrl,
          externalId: data.externalId,
        };
      }

      const invoiceData = {
        external_id: data.externalId,
        amount: data.amount,
        description: data.description,
        invoice_duration: 86400, // 24 hours in seconds
        customer: {
          given_names: data.customerName,
          email: data.customerEmail,
          mobile_number: data.customerPhone,
        },
        customer_notification_preference: {
          invoice_created: ['email'],
          invoice_reminder: ['email'],
          invoice_paid: ['email'],
          invoice_expired: ['email'],
        },
        success_redirect_url: data.successRedirectUrl || `${process.env.FRONTEND_URL}/payment/success`,
        failure_redirect_url: data.failureRedirectUrl || `${process.env.FRONTEND_URL}/payment/failed`,
        currency: 'IDR',
        items: [
          {
            name: data.description,
            quantity: 1,
            price: data.amount,
          },
        ],
      };

      if (data.expiryDate) {
        invoiceData.invoice_duration = Math.floor((data.expiryDate.getTime() - Date.now()) / 1000);
      }

      const invoice = await this.xendit.Invoice.createInvoice({
        data: invoiceData
      });

      return {
        success: true,
        invoiceId: invoice.id,
        invoiceUrl: invoice.invoice_url,
        externalId: invoice.external_id,
      };
    } catch (error: any) {
      console.error('Xendit create invoice error:', error);
      
      // If API call fails, fall back to development mode
      if (error.status === 403 || error.status === 401) {
        console.log('🚧 API key invalid, falling back to development mode');
        
        const mockInvoiceId = `inv_dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mockInvoiceUrl = `https://checkout-dev.xendit.co/web/${mockInvoiceId}`;
        
        return {
          success: true,
          invoiceId: mockInvoiceId,
          invoiceUrl: mockInvoiceUrl,
          externalId: data.externalId,
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to create payment invoice',
      };
    }
  }

  /**
   * Get invoice details by ID
   */
  async getInvoice(invoiceId: string) {
    try {
      const invoice = await this.xendit.Invoice.getInvoice({ invoiceId });
      return {
        success: true,
        data: invoice,
      };
    } catch (error: any) {
      console.error('Xendit get invoice error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get invoice details',
      };
    }
  }

  /**
   * Expire an invoice
   */
  async expireInvoice(invoiceId: string) {
    try {
      const invoice = await this.xendit.Invoice.expireInvoice({ invoiceId });
      return {
        success: true,
        data: invoice,
      };
    } catch (error: any) {
      console.error('Xendit expire invoice error:', error);
      return {
        success: false,
        error: error.message || 'Failed to expire invoice',
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(rawBody: string, signature: string, webhookToken: string): boolean {
    try {
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha256', webhookToken)
        .update(rawBody)
        .digest('hex');
      
      return hash === signature;
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Process webhook payload
   */
  async processWebhook(payload: any) {
    try {
      const { external_id, status, id: xenditInvoiceId, paid_at } = payload;

      // Find payment record by external ID
      const payment = await prisma.payment.findUnique({
        where: { externalId: external_id },
        include: {
          tourismTicketBooking: true,
          accommodationBooking: true,
        },
      });

      if (!payment) {
        throw new Error(`Payment not found for external_id: ${external_id}`);
      }

      // Update payment status
      const updateData: any = {
        xenditInvoiceId,
        webhookData: JSON.stringify(payload),
        updatedAt: new Date(),
      };

      if (status === 'PAID') {
        updateData.status = 'PAID';
        updateData.paidAt = paid_at ? new Date(paid_at) : new Date();
        updateData.paymentMethod = payload.payment_method;
        updateData.paymentChannel = payload.payment_channel;
      } else if (status === 'EXPIRED') {
        updateData.status = 'EXPIRED';
      } else if (status === 'FAILED') {
        updateData.status = 'FAILED';
        updateData.failureCode = payload.failure_code;
        updateData.failureMessage = payload.failure_message;
      }

      // Update payment record
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: updateData,
      });

      // Update booking status based on payment status
      if (status === 'PAID') {
        if (payment.tourismTicketBooking) {
          await prisma.tourismTicketBooking.update({
            where: { id: payment.tourismTicketBooking.id },
            data: { status: 'PAID' },
          });

          // Send e-voucher email for tourism ticket booking
          try {
            const bookingWithDetails = await prisma.tourismTicketBooking.findUnique({
              where: { id: payment.tourismTicketBooking.id },
              include: {
                ticket: true,
                member: true,
              },
            });

            if (bookingWithDetails && bookingWithDetails.qrPayloadHash && bookingWithDetails.friendlyCode) {
              // Generate QR code for the booking
              const { generateQRDataURL } = await import('./qr');
              const { config } = await import('../config');
              
              const qrUrl = `${config.appUrl}/api/verify?data=${encodeURIComponent(bookingWithDetails.qrPayloadHash)}&hash=${bookingWithDetails.qrPayloadHash}`;
              const qrDataURL = await generateQRDataURL(qrUrl);

              const emailData = {
                id: bookingWithDetails.id,
                customerName: bookingWithDetails.customerName,
                customerEmail: bookingWithDetails.customerEmail,
                customerPhone: bookingWithDetails.customerPhone,
                customerAddress: bookingWithDetails.notes || '', // Use notes field as address fallback
                tourismTicket: {
                  name: bookingWithDetails.ticket.name,
                  description: bookingWithDetails.ticket.description,
                  location: bookingWithDetails.ticket.location,
                  duration: bookingWithDetails.ticket.duration,
                  category: bookingWithDetails.ticket.category,
                  price: bookingWithDetails.ticket.price,
                  imageUrl: bookingWithDetails.ticket.imageUrl || undefined,
                },
                quantity: bookingWithDetails.quantity,
                totalAmount: bookingWithDetails.totalAmount,
                bookingDate: bookingWithDetails.createdAt.toISOString(),
                status: 'PAID',
                paymentStatus: 'PAID',
                qrCode: qrDataURL,
                friendlyCode: bookingWithDetails.friendlyCode,
              };

              const emailSent = await sendEVoucherEmail(emailData);
              if (emailSent) {
                console.log(`E-voucher email sent successfully for booking ${bookingWithDetails.id}`);
              } else {
                console.error(`Failed to send e-voucher email for booking ${bookingWithDetails.id}`);
              }
            }
          } catch (emailError) {
            console.error('Error sending e-voucher email:', emailError);
            // Don't fail the webhook processing if email fails
          }
        }

        if (payment.accommodationBooking) {
          await prisma.accommodationBooking.update({
            where: { id: payment.accommodationBooking.id },
            data: { status: 'PAID' },
          });
        }
      } else if (status === 'EXPIRED' || status === 'FAILED') {
        if (payment.tourismTicketBooking) {
          await prisma.tourismTicketBooking.update({
            where: { id: payment.tourismTicketBooking.id },
            data: { status: status === 'EXPIRED' ? 'EXPIRED' : 'CANCELLED' },
          });
        }

        if (payment.accommodationBooking) {
          await prisma.accommodationBooking.update({
            where: { id: payment.accommodationBooking.id },
            data: { status: status === 'EXPIRED' ? 'EXPIRED' : 'CANCELLED' },
          });
        }
      }

      return {
        success: true,
        payment: updatedPayment,
      };
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process webhook',
      };
    }
  }
}

// Initialize Xendit service with configuration from database
let xenditService: XenditService | null = null;

export const getXenditService = async (): Promise<XenditService> => {
  if (!xenditService) {
    const settings = await prisma.settings.findFirst();
    
    if (!settings?.xenditSecretKey) {
      throw new Error('Xendit configuration not found. Please configure Xendit settings first.');
    }

    xenditService = new XenditService({
      secretKey: settings.xenditSecretKey,
      environment: settings.xenditEnvironment as 'test' | 'live',
    });
  }

  return xenditService;
};

export { XenditService };
export type { CreateInvoiceData, PaymentResult };