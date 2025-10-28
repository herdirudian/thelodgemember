import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const router = Router();
const prisma = new PrismaClient();

// Helper function to verify JWT token
const verifyToken = (req: Request, res: Response): any => {
  try {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    if (!token) {
      res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
      return null;
    }
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token tidak valid' });
    return null;
  }
};

// Helper function to check if user is admin
const requireAdmin = (payload: any) => {
  if (payload.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }
};

// Get notifications for a member
router.get('/member/:memberId', async (req: Request, res: Response) => {
  try {
    const payload = verifyToken(req, res);
    if (!payload) return;
    const { memberId } = req.params;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const whereClause: any = { memberId };
    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }
    
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
      include: {
        member: {
          select: {
            fullName: true,
            membershipNumber: true
          }
        }
      }
    });
    
    const total = await prisma.notification.count({
      where: whereClause
    });
    
    const unreadCount = await prisma.notification.count({
      where: { memberId, isRead: false }
    });
    
    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        },
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil notifikasi'
    });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const payload = verifyToken(req, res);
    if (!payload) return;
    const { notificationId } = req.params;
    
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
    
    res.json({
      success: true,
      data: notification,
      message: 'Notifikasi berhasil ditandai sebagai dibaca'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menandai notifikasi sebagai dibaca'
    });
  }
});

// Mark all notifications as read for a member
router.patch('/member/:memberId/read-all', async (req: Request, res: Response) => {
  try {
    const payload = verifyToken(req, res);
    if (!payload) return;
    const { memberId } = req.params;
    
    await prisma.notification.updateMany({
      where: { 
        memberId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
    
    res.json({
      success: true,
      message: 'Semua notifikasi berhasil ditandai sebagai dibaca'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menandai semua notifikasi sebagai dibaca'
    });
  }
});

// Get unread count for a member
router.get('/member/:memberId/unread-count', async (req: Request, res: Response) => {
  try {
    const payload = verifyToken(req, res);
    if (!payload) return;
    const { memberId } = req.params;
    
    const unreadCount = await prisma.notification.count({
      where: { 
        memberId,
        isRead: false
      }
    });
    
    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil jumlah notifikasi yang belum dibaca'
    });
  }
});

// Admin: Create notification (alias for frontend compatibility)
router.post('/admin', async (req: Request, res: Response) => {
  try {
    const payload = verifyToken(req, res);
    if (!payload) return;
    requireAdmin(payload);
    
    const { title, content, priority = 'MEDIUM', targetType = 'ALL_MEMBERS', memberIds = [] } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title dan content harus diisi'
      });
    }

    // Create admin message
    const adminMessage = await prisma.adminMessage.create({
      data: {
        title,
        message: content,
        targetType: targetType === 'ALL_MEMBERS' ? 'ALL_MEMBERS' : 'SPECIFIC_MEMBERS',
        targetIds: targetType === 'SPECIFIC_MEMBERS' ? JSON.stringify(memberIds) : null,
        createdBy: payload.uid || payload.userId || 'unknown',
        createdByName: payload.user?.email || payload.email || 'Admin',
        isActive: true,
        isSent: true,
        sentAt: new Date()
      }
    });

    // Get target members
    let targetMembers = [];
    if (targetType === 'ALL_MEMBERS') {
      targetMembers = await prisma.member.findMany({
        where: { 
          user: {
            isActive: true
          }
        },
        select: { id: true }
      });
    } else if (targetType === 'SPECIFIC_MEMBERS' && memberIds.length > 0) {
      targetMembers = await prisma.member.findMany({
        where: { 
          id: { in: memberIds },
          user: {
            isActive: true
          }
        },
        select: { id: true }
      });
    }

    // Create notifications for target members
    if (targetMembers.length > 0) {
      await prisma.notification.createMany({
        data: targetMembers.map(member => ({
          memberId: member.id,
          title,
          message: content,
          type: 'ADMIN_MESSAGE'
        }))
      });
    }

    res.json({
      success: true,
      data: {
        id: adminMessage.id,
        title: adminMessage.title,
        content: adminMessage.message,
        priority: 'MEDIUM', // Default priority
        isActive: adminMessage.isActive,
        createdAt: adminMessage.createdAt,
        admin: {
          name: adminMessage.createdByName
        }
      },
      message: `Notifikasi berhasil dikirim ke ${targetMembers.length} member`
    });
  } catch (error) {
    console.error('Error creating admin notification:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat notifikasi admin'
    });
  }
});

// Admin: Create notification for specific member(s)
router.post('/admin/create', async (req: Request, res: Response) => {
  try {
    const payload = verifyToken(req, res);
    if (!payload) return;
    requireAdmin(payload);
    const { memberIds, title, message, type, imageUrl, actionUrl, actionText } = req.body;
    
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Member IDs harus berupa array dan tidak boleh kosong'
      });
    }
    
    const notifications = await Promise.all(
      memberIds.map((memberId: string) =>
        prisma.notification.create({
          data: {
            memberId,
            title,
            message,
            type: type || 'ADMIN_MESSAGE',
            imageUrl,
            actionUrl,
            actionText
          }
        })
      )
    );
    
    res.json({
      success: true,
      data: notifications,
      message: `Berhasil mengirim notifikasi ke ${notifications.length} member`
    });
  } catch (error) {
    console.error('Error creating notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat notifikasi'
    });
  }
});

// Admin: Create admin message (broadcast)
router.post('/admin/message', async (req: Request, res: Response) => {
  try {
    const payload = verifyToken(req, res);
    if (!payload) return;
    requireAdmin(payload);
    const { title, message, imageUrl, targetType, targetIds, isScheduled, scheduledAt } = req.body;
    const adminUser = payload;
    
    // Create admin message record
    const adminMessage = await prisma.adminMessage.create({
      data: {
        title,
        message,
        imageUrl,
        targetType: targetType || 'ALL_MEMBERS',
        targetIds: targetIds ? JSON.stringify(targetIds) : null,
        isScheduled: isScheduled || false,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdBy: adminUser.id,
        createdByName: adminUser.fullName || adminUser.email
      }
    });
    
    // If not scheduled, send immediately
    if (!isScheduled) {
      let memberIds: string[] = [];
      
      if (targetType === 'ALL_MEMBERS' || !targetType) {
        const members = await prisma.member.findMany({
          select: { id: true }
        });
        memberIds = members.map(m => m.id);
      } else if (targetType === 'ACTIVE_MEMBERS') {
        const members = await prisma.member.findMany({
          where: {
            user: {
              isActive: true
            }
          },
          select: { id: true }
        });
        memberIds = members.map(m => m.id);
      } else if (targetType === 'SPECIFIC_MEMBERS' && targetIds) {
        memberIds = targetIds;
      }
      
      // Create notifications for all target members
      if (memberIds.length > 0) {
        await Promise.all(
          memberIds.map((memberId: string) =>
            prisma.notification.create({
              data: {
                memberId,
                title,
                message,
                type: 'ADMIN_MESSAGE',
                imageUrl,
                relatedId: adminMessage.id,
                relatedType: 'ADMIN_MESSAGE'
              }
            })
          )
        );
        
        // Mark admin message as sent
        await prisma.adminMessage.update({
          where: { id: adminMessage.id },
          data: {
            isSent: true,
            sentAt: new Date()
          }
        });
      }
    }
    
    res.json({
      success: true,
      data: adminMessage,
      message: isScheduled ? 'Pesan berhasil dijadwalkan' : `Pesan berhasil dikirim ke ${targetType === 'ALL_MEMBERS' ? 'semua member' : 'member yang dipilih'}`
    });
  } catch (error) {
    console.error('Error creating admin message:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat pesan admin'
    });
  }
});

// Admin: Get all admin messages
router.get('/admin/messages', async (req: Request, res: Response) => {
  try {
    const payload = verifyToken(req, res);
    if (!payload) return;
    requireAdmin(payload);
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const messages = await prisma.adminMessage.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    });
    
    const total = await prisma.adminMessage.count();
    
    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin messages:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil pesan admin'
    });
  }
});

// Admin: Get all admin messages (alias for frontend compatibility)
router.get('/admin-messages', async (req: Request, res: Response) => {
  try {
    const payload = verifyToken(req, res);
    if (!payload) return;
    requireAdmin(payload);
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const messages = await prisma.adminMessage.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit)
    });
    
    const total = await prisma.adminMessage.count();
    
    res.json({
      success: true,
      data: messages.map(msg => ({
        id: msg.id,
        title: msg.title,
        content: msg.message,
        priority: 'MEDIUM', // Default priority since it's not in the model
        isActive: msg.isActive !== false,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        admin: {
          name: msg.createdByName || 'Unknown'
        }
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching admin messages:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil pesan admin'
    });
  }
});

// Admin: Get all notifications
router.get('/all', async (req: Request, res: Response) => {
  try {
    const payload = verifyToken(req, res);
    if (!payload) return;
    requireAdmin(payload);
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
      include: {
        member: {
          select: {
            fullName: true,
            user: {
              select: {
                email: true
              }
            }
          }
        }
      }
    });
    
    const total = await prisma.notification.count();
    
    res.json({
      success: true,
      data: {
        notifications: notifications.map(notif => ({
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          memberId: notif.memberId,
          member: {
            fullName: notif.member?.fullName || 'Unknown',
            email: notif.member?.user?.email || 'Unknown'
          },
          isRead: notif.isRead,
          createdAt: notif.createdAt
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil semua notifikasi'
    });
  }
});

// Delete notification (admin only)
router.delete('/:notificationId', async (req: Request, res: Response) => {
  try {
    const payload = verifyToken(req, res);
    if (!payload) return;
    requireAdmin(payload);
    const { notificationId } = req.params;
    
    await prisma.notification.delete({
      where: { id: notificationId }
    });
    
    res.json({
      success: true,
      message: 'Notifikasi berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus notifikasi'
    });
  }
});

export default router;