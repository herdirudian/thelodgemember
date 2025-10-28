import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
  // Create notification for new announcement/post
  static async createAnnouncementNotification(announcementId: string, title: string, description: string) {
    try {
      // Get all active members
      const members = await prisma.member.findMany({
        where: {
          user: {
            isActive: true
          }
        },
        select: { id: true }
      });

      if (members.length === 0) {
        console.log('No active members found for announcement notification');
        return;
      }

      // Create notifications for all active members
      const notifications = await Promise.all(
        members.map(member =>
          prisma.notification.create({
            data: {
              memberId: member.id,
              title: `📢 Pengumuman Baru: ${title}`,
              message: description.length > 150 ? 
                `${description.substring(0, 150)}...` : 
                description,
              type: NotificationType.NEW_ANNOUNCEMENT,
              relatedId: announcementId,
              relatedType: 'ANNOUNCEMENT',
              actionUrl: `/announcements/${announcementId}`,
              actionText: 'Lihat Selengkapnya'
            }
          })
        )
      );

      console.log(`Created ${notifications.length} notifications for announcement: ${title}`);
      return notifications;
    } catch (error) {
      console.error('Error creating announcement notifications:', error);
      throw error;
    }
  }

  // Create notification for ticket claim
  static async createTicketClaimNotification(memberId: string, ticketName: string, redeemHistoryId: string) {
    try {
      const notification = await prisma.notification.create({
        data: {
          memberId,
          title: '🎫 Tiket Berhasil Diklaim',
          message: `Selamat! Anda telah berhasil mengklaim tiket "${ticketName}". Silakan cek detail tiket di halaman riwayat redeem.`,
          type: NotificationType.TICKET_CLAIMED,
          relatedId: redeemHistoryId,
          relatedType: 'REDEEM_HISTORY',
          actionUrl: `/my-activities?tab=redeem`,
          actionText: 'Lihat Tiket'
        }
      });

      console.log(`Created ticket claim notification for member ${memberId}: ${ticketName}`);
      return notification;
    } catch (error) {
      console.error('Error creating ticket claim notification:', error);
      throw error;
    }
  }

  // Create notification for point adjustment
  static async createPointAdjustmentNotification(memberId: string, points: number, reason: string, type: 'EARNED' | 'DEDUCTED') {
    try {
      const notification = await prisma.notification.create({
        data: {
          memberId,
          title: type === 'EARNED' ? '💰 Poin Bertambah' : '💸 Poin Berkurang',
          message: type === 'EARNED' ? 
            `Selamat! Anda mendapat ${points} poin. ${reason}` :
            `${points} poin telah dikurangi dari akun Anda. ${reason}`,
          type: NotificationType.POINT_UPDATE,
          actionUrl: '/profile',
          actionText: 'Lihat Profil'
        }
      });

      console.log(`Created point adjustment notification for member ${memberId}: ${type} ${points} points`);
      return notification;
    } catch (error) {
      console.error('Error creating point adjustment notification:', error);
      throw error;
    }
  }

  // Create notification for membership status change
  static async createMembershipStatusNotification(memberId: string, newStatus: string, message: string) {
    try {
      const notification = await prisma.notification.create({
        data: {
          memberId,
          title: '👤 Status Keanggotaan Diperbarui',
          message,
          type: NotificationType.MEMBERSHIP_UPDATE,
          actionUrl: '/membership',
          actionText: 'Lihat Keanggotaan'
        }
      });

      console.log(`Created membership status notification for member ${memberId}: ${newStatus}`);
      return notification;
    } catch (error) {
      console.error('Error creating membership status notification:', error);
      throw error;
    }
  }

  // Create notification for benefit redemption
  static async createBenefitRedemptionNotification(memberId: string, benefitName: string, benefitRedemptionId: string) {
    try {
      const notification = await prisma.notification.create({
        data: {
          memberId,
          title: '🎁 Benefit Berhasil Diklaim',
          message: `Selamat! Anda telah berhasil mengklaim benefit "${benefitName}". Silakan cek detail benefit di halaman riwayat redeem.`,
          type: NotificationType.BENEFIT_CLAIMED,
          relatedId: benefitRedemptionId,
          relatedType: 'BENEFIT_REDEMPTION',
          actionUrl: `/my-activities?tab=benefits`,
          actionText: 'Lihat Benefit'
        }
      });

      console.log(`Created benefit redemption notification for member ${memberId}: ${benefitName}`);
      return notification;
    } catch (error) {
      console.error('Error creating benefit redemption notification:', error);
      throw error;
    }
  }

  // Create custom admin notification
  static async createAdminNotification(memberIds: string[], title: string, message: string, options?: {
    imageUrl?: string;
    actionUrl?: string;
    actionText?: string;
    type?: NotificationType;
  }) {
    try {
      const notifications = await Promise.all(
        memberIds.map(memberId =>
          prisma.notification.create({
            data: {
              memberId,
              title,
              message,
              type: options?.type || NotificationType.ADMIN_MESSAGE,
              imageUrl: options?.imageUrl,
              actionUrl: options?.actionUrl,
              actionText: options?.actionText
            }
          })
        )
      );

      console.log(`Created ${notifications.length} admin notifications: ${title}`);
      return notifications;
    } catch (error) {
      console.error('Error creating admin notifications:', error);
      throw error;
    }
  }

  // Get unread notification count for a member
  static async getUnreadCount(memberId: string): Promise<number> {
    try {
      const count = await prisma.notification.count({
        where: {
          memberId,
          isRead: false
        }
      });
      return count;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string) {
    try {
      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a member
  static async markAllAsRead(memberId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          memberId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
}

export default NotificationService;