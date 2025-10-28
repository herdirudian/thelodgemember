import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const router = Router();
const prisma = new PrismaClient();

// Simple admin auth middleware
async function adminAuth(req: any, res: any, next: any) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const payload: any = jwt.verify(token, config.jwtSecret);
    if (payload.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const user = await prisma.user.findUnique({ where: { id: payload.uid } });
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }
    
    const adminRole: string | null = (user.adminRole ?? null) as any;
    req.user = { uid: payload.uid, role: payload.role, adminRole };

    // Allow access for SUPER_ADMIN and OWNER roles
    let allowed = true;
    if (adminRole) {
      const role = String(adminRole).toUpperCase();
      if (role === 'SUPER_ADMIN' || role === 'OWNER') {
        allowed = true;
      } else {
        // For other roles, deny access to member activities
        allowed = false;
      }
    }

    if (!allowed) {
      return res.status(403).json({ message: 'Access denied for your role' });
    }

    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// Get member activities (benefits claimed, events joined, points redeemed)
router.get('/member-activities', adminAuth, async (req, res) => {
  try {
    // Get all members with their activities
    const membersWithActivities = await prisma.member.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        },
        tickets: {
          where: {
            status: 'REDEEMED'
          },
          select: {
            id: true,
            name: true,
            redeemedAt: true,
            createdAt: true
          }
        },
        eventRegistrations: {
          include: {
            event: {
              select: {
                title: true,
                eventDate: true
              }
            }
          }
        },
        pointRedemptions: {
          where: {
            status: 'REDEEMED'
          },
          select: {
            id: true,
            pointsUsed: true,
            rewardName: true,
            redeemedAt: true,
            createdAt: true
          }
        }
      }
    });

    // Get redeem history for additional context
    const redeemHistory = await prisma.redeemHistory.findMany({
      orderBy: {
        redeemedAt: 'desc'
      }
    });

    // Format the data for admin display
    const memberActivities = membersWithActivities.map(member => {
      const claimedBenefits = member.tickets.filter(ticket => ticket.redeemedAt);
      const joinedEvents = member.eventRegistrations;
      const redeemedPoints = member.pointRedemptions.filter(redemption => redemption.redeemedAt);
      
      // Get member's redeem history
      const memberRedeemHistory = redeemHistory.filter(history => history.memberId === member.id);

      return {
        id: member.id,
        fullName: member.fullName,
        email: member.user.email,
        phone: member.phone,
        registrationDate: member.registrationDate,
        isLifetime: member.isLifetime,
        pointsBalance: member.pointsBalance,
        activities: {
          claimedBenefits: {
            count: claimedBenefits.length,
            items: claimedBenefits.map(benefit => ({
              id: benefit.id,
              name: benefit.name,
              claimedAt: benefit.redeemedAt,
              createdAt: benefit.createdAt
            }))
          },
          joinedEvents: {
            count: joinedEvents.length,
            items: joinedEvents.map(registration => ({
              id: registration.id,
              eventTitle: registration.event.title,
              eventDate: registration.event.eventDate,
              registeredAt: registration.createdAt,
              status: registration.status,
              redeemedAt: registration.redeemedAt
            }))
          },
          redeemedPoints: {
            count: redeemedPoints.length,
            totalPointsUsed: redeemedPoints.reduce((sum, redemption) => sum + redemption.pointsUsed, 0),
            items: redeemedPoints.map(redemption => ({
              id: redemption.id,
              pointsUsed: redemption.pointsUsed,
              rewardName: redemption.rewardName,
              redeemedAt: redemption.redeemedAt,
              createdAt: redemption.createdAt
            }))
          },
          redeemHistory: {
            count: memberRedeemHistory.length,
            items: memberRedeemHistory.map(history => ({
              id: history.id,
              voucherType: history.voucherType,
              voucherLabel: history.voucherLabel,
              redeemedAt: history.redeemedAt,
              adminName: history.adminName
            }))
          }
        },
        totalActivities: claimedBenefits.length + joinedEvents.length + redeemedPoints.length
      };
    });

    // Sort by total activities (most active first)
    memberActivities.sort((a, b) => b.totalActivities - a.totalActivities);

    res.json({
      success: true,
      data: memberActivities,
      summary: {
        totalMembers: memberActivities.length,
        totalBenefitsClaimed: memberActivities.reduce((sum, member) => sum + member.activities.claimedBenefits.count, 0),
        totalEventsJoined: memberActivities.reduce((sum, member) => sum + member.activities.joinedEvents.count, 0),
        totalPointsRedeemed: memberActivities.reduce((sum, member) => sum + member.activities.redeemedPoints.totalPointsUsed, 0)
      }
    });

  } catch (error) {
    console.error('Error fetching member activities:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data aktivitas member'
    });
  }
});

// Get detailed activity for specific member
router.get('/member-activities/:memberId', adminAuth, async (req, res) => {
  try {
    const { memberId } = req.params;

    const memberWithActivities = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            email: true
          }
        },
        tickets: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        eventRegistrations: {
          include: {
            event: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        pointRedemptions: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        pointAdjustments: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!memberWithActivities) {
      return res.status(404).json({
        success: false,
        message: 'Member tidak ditemukan'
      });
    }

    // Get redeem history for this member
    const redeemHistory = await prisma.redeemHistory.findMany({
      where: {
        memberId: memberId
      },
      orderBy: {
        redeemedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        member: {
          id: memberWithActivities.id,
          fullName: memberWithActivities.fullName,
          email: memberWithActivities.user.email,
          phone: memberWithActivities.phone,
          registrationDate: memberWithActivities.registrationDate,
          isLifetime: memberWithActivities.isLifetime,
          pointsBalance: memberWithActivities.pointsBalance
        },
        activities: {
          tickets: memberWithActivities.tickets,
          eventRegistrations: memberWithActivities.eventRegistrations,
          pointRedemptions: memberWithActivities.pointRedemptions,
          pointAdjustments: memberWithActivities.pointAdjustments,
          redeemHistory: redeemHistory
        }
      }
    });

  } catch (error) {
    console.error('Error fetching member activity details:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail aktivitas member'
    });
  }
});

export default router;