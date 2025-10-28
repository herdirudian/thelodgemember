import express from 'express';
import { PrismaClient } from '@prisma/client';
import { getXenditService, CreateInvoiceData } from '../utils/xenditService';
import { v4 as uuidv4 } from 'uuid';
import { signPayloadWithFriendlyCode } from '../utils/security';
import { generateQRDataURL } from '../utils/qr';
import { config } from '../config';

const router = express.Router();
const prisma = new PrismaClient();

// Tourism Ticket Booking Endpoints

/**
 * Create tourism ticket booking
 */
router.post('/tourism-tickets', async (req, res) => {
  try {
    const {
      ticketId,
      memberId,
      customerName,
      customerEmail,
      customerPhone,
      quantity,
      visitDate,
      notes,
      // Additional identity data
      customerAddress,
      emergencyContactName,
      emergencyContactPhone,
      specialRequests,
    } = req.body;

    // Validate required fields
    if (!ticketId || !customerName || !customerEmail || !quantity || !visitDate) {
      return res.status(400).json({
        error: 'Missing required fields: ticketId, customerName, customerEmail, quantity, visitDate',
      });
    }

    // Get ticket details
    const ticket = await prisma.tourismTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Tourism ticket not found' });
    }

    if (!ticket.isActive) {
      return res.status(400).json({ error: 'Tourism ticket is not available' });
    }

    // Check availability
    const existingBookings = await prisma.tourismTicketBooking.count({
      where: {
        ticketId,
        visitDate: new Date(visitDate),
        status: {
          in: ['PENDING', 'PAID', 'CONFIRMED'],
        },
      },
    });

    if (existingBookings + quantity > ticket.allotment) {
      return res.status(400).json({ error: 'Not enough tickets available for the selected date' });
    }

    // Calculate total amount
    const totalAmount = ticket.finalPrice * quantity;

    // Prepare additional identity data
    const identityData = {
      customerAddress: customerAddress || '',
      emergencyContactName: emergencyContactName || '',
      emergencyContactPhone: emergencyContactPhone || '',
      specialRequests: specialRequests || '',
      originalNotes: notes || ''
    };

    // Create booking record first
    const booking = await prisma.tourismTicketBooking.create({
      data: {
        ticketId,
        memberId: memberId || null,
        customerName,
        customerEmail,
        customerPhone,
        quantity,
        totalAmount,
        bookingDate: new Date(),
        visitDate: new Date(visitDate),
        notes: JSON.stringify(identityData),
        status: 'PENDING',
      },
    });

    // Generate QR code and friendly code for the booking using actual booking ID
    const payload = { 
      type: 'tourism_ticket', 
      ticketName: ticket.name, 
      customerName,
      quantity,
      visitDate: visitDate,
      bookingId: booking.id
    };
    const { data, hash, friendlyCode } = signPayloadWithFriendlyCode(payload);

    // Update booking with QR code data
    await prisma.tourismTicketBooking.update({
      where: { id: booking.id },
      data: {
        qrPayloadHash: hash,
        friendlyCode: friendlyCode,
      },
    });

    // Create payment record
    const externalId = `tourism-${booking.id}-${Date.now()}`;
    const payment = await prisma.payment.create({
      data: {
        externalId,
        amount: totalAmount,
        currency: 'IDR',
        status: 'PENDING',
        description: `Tourism Ticket: ${ticket.name} (${quantity}x)`,
        customerName,
        customerEmail,
        customerPhone,
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Link payment to booking
    await prisma.tourismTicketBooking.update({
      where: { id: booking.id },
      data: { paymentId: payment.id },
    });

    // Create Xendit invoice
    const xenditService = await getXenditService();
    const invoiceData: CreateInvoiceData = {
      externalId,
      amount: totalAmount,
      description: `Tourism Ticket: ${ticket.name} (${quantity}x)`,
      customerName,
      customerEmail,
      customerPhone,
      expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const invoiceResult = await xenditService.createInvoice(invoiceData);

    if (!invoiceResult.success) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureMessage: invoiceResult.error },
      });

      return res.status(500).json({ error: invoiceResult.error });
    }

    // Update payment with Xendit invoice details
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        xenditInvoiceId: invoiceResult.invoiceId,
        invoiceUrl: invoiceResult.invoiceUrl,
      },
    });

    res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        externalId,
        totalAmount,
        status: booking.status,
        invoiceUrl: invoiceResult.invoiceUrl,
        expiresAt: payment.expiredAt,
      },
    });
  } catch (error: any) {
    console.error('Tourism ticket booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get tourism ticket booking by ID
 */
router.get('/tourism-tickets/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.tourismTicketBooking.findUnique({
      where: { id: bookingId },
      include: {
        ticket: true,
        member: true,
        payment: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      success: true,
      booking,
    });
  } catch (error: any) {
    console.error('Get tourism ticket booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all tourism ticket bookings (admin)
 */
router.get('/tourism-tickets', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search as string } },
        { customerEmail: { contains: search as string } },
        { ticket: { name: { contains: search as string } } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.tourismTicketBooking.findMany({
        where,
        include: {
          ticket: true,
          member: true,
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.tourismTicketBooking.count({ where }),
    ]);

    res.json({
      success: true,
      bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get tourism ticket bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Cancel tourism ticket booking
 */
router.patch('/tourism-tickets/:bookingId/cancel', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.tourismTicketBooking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'PAID' || booking.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot cancel paid or completed booking' });
    }

    // Update booking status
    await prisma.tourismTicketBooking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    // Update payment status
    if (booking.payment) {
      await prisma.payment.update({
        where: { id: booking.payment.id },
        data: { status: 'CANCELLED' },
      });

      // Expire Xendit invoice if exists
      if (booking.payment.xenditInvoiceId) {
        try {
          const xenditService = await getXenditService();
          await xenditService.expireInvoice(booking.payment.xenditInvoiceId);
        } catch (error) {
          console.error('Failed to expire Xendit invoice:', error);
        }
      }
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
    });
  } catch (error: any) {
    console.error('Cancel tourism ticket booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accommodation Booking Endpoints

/**
 * Create accommodation booking
 */
router.post('/accommodations', async (req, res) => {
  try {
    const {
      accommodationId,
      memberId,
      customerName,
      customerEmail,
      customerPhone,
      checkInDate,
      checkOutDate,
      guests,
      rooms,
      specialRequests,
    } = req.body;

    // Validate required fields
    if (!accommodationId || !customerName || !customerEmail || !checkInDate || !checkOutDate || !guests || !rooms) {
      return res.status(400).json({
        error: 'Missing required fields: accommodationId, customerName, customerEmail, checkInDate, checkOutDate, guests, rooms',
      });
    }

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      return res.status(400).json({ error: 'Check-in date cannot be in the past' });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({ error: 'Check-out date must be after check-in date' });
    }

    // Get accommodation details
    const accommodation = await prisma.accommodation.findUnique({
      where: { id: accommodationId },
    });

    if (!accommodation) {
      return res.status(404).json({ error: 'Accommodation not found' });
    }

    if (!accommodation.isActive) {
      return res.status(400).json({ error: 'Accommodation is not available' });
    }

    // Check room availability
    const existingBookings = await prisma.accommodationBooking.findMany({
      where: {
        accommodationId,
        status: {
          in: ['PENDING', 'PAID', 'CONFIRMED'],
        },
        OR: [
          {
            checkInDate: {
              lte: checkOut,
            },
            checkOutDate: {
              gt: checkIn,
            },
          },
        ],
      },
    });

    const bookedRooms = existingBookings.reduce((total, booking) => total + booking.rooms, 0);
    
    if (bookedRooms + rooms > accommodation.totalRooms) {
      return res.status(400).json({ error: 'Not enough rooms available for the selected dates' });
    }

    // Check guest capacity
    if (guests > accommodation.maxGuests * rooms) {
      return res.status(400).json({ error: `Maximum ${accommodation.maxGuests} guests per room` });
    }

    // Calculate total amount
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const pricePerNight = accommodation.pricePerNight - accommodation.discount;
    const totalAmount = pricePerNight * nights * rooms;

    // Create booking record
    const booking = await prisma.accommodationBooking.create({
      data: {
        accommodationId,
        memberId: memberId || null,
        customerName,
        customerEmail,
        customerPhone,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guests,
        rooms,
        totalAmount,
        specialRequests,
        status: 'PENDING',
      },
    });

    // Create payment record
    const externalId = `accommodation-${booking.id}-${Date.now()}`;
    const payment = await prisma.payment.create({
      data: {
        externalId,
        amount: totalAmount,
        currency: 'IDR',
        status: 'PENDING',
        description: `Accommodation: ${accommodation.name} (${nights} nights, ${rooms} rooms)`,
        customerName,
        customerEmail,
        customerPhone,
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Link payment to booking
    await prisma.accommodationBooking.update({
      where: { id: booking.id },
      data: { paymentId: payment.id },
    });

    // Create Xendit invoice
    const xenditService = await getXenditService();
    const invoiceData: CreateInvoiceData = {
      externalId,
      amount: totalAmount,
      description: `Accommodation: ${accommodation.name} (${nights} nights, ${rooms} rooms)`,
      customerName,
      customerEmail,
      customerPhone,
      expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const invoiceResult = await xenditService.createInvoice(invoiceData);

    if (!invoiceResult.success) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureMessage: invoiceResult.error },
      });

      return res.status(500).json({ error: invoiceResult.error });
    }

    // Update payment with Xendit invoice details
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        xenditInvoiceId: invoiceResult.invoiceId,
        invoiceUrl: invoiceResult.invoiceUrl,
      },
    });

    res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        externalId,
        totalAmount,
        nights,
        status: booking.status,
        invoiceUrl: invoiceResult.invoiceUrl,
        expiresAt: payment.expiredAt,
      },
    });
  } catch (error: any) {
    console.error('Accommodation booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get accommodation booking by ID
 */
router.get('/accommodations/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.accommodationBooking.findUnique({
      where: { id: bookingId },
      include: {
        accommodation: true,
        member: true,
        payment: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      success: true,
      booking,
    });
  } catch (error: any) {
    console.error('Get accommodation booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all accommodation bookings (admin)
 */
router.get('/accommodations', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search as string } },
        { customerEmail: { contains: search as string } },
        { accommodation: { name: { contains: search as string } } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.accommodationBooking.findMany({
        where,
        include: {
          accommodation: true,
          member: true,
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.accommodationBooking.count({ where }),
    ]);

    res.json({
      success: true,
      bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get accommodation bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Cancel accommodation booking
 */
router.patch('/accommodations/:bookingId/cancel', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.accommodationBooking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'PAID' || booking.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot cancel paid or completed booking' });
    }

    // Update booking status
    await prisma.accommodationBooking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    // Update payment status
    if (booking.payment) {
      await prisma.payment.update({
        where: { id: booking.payment.id },
        data: { status: 'CANCELLED' },
      });

      // Expire Xendit invoice if exists
      if (booking.payment.xenditInvoiceId) {
        try {
          const xenditService = await getXenditService();
          await xenditService.expireInvoice(booking.payment.xenditInvoiceId);
        } catch (error) {
          console.error('Failed to expire Xendit invoice:', error);
        }
      }
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
    });
  } catch (error: any) {
    console.error('Cancel accommodation booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;