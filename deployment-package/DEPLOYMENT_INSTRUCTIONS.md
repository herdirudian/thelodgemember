# Manual Deployment Instructions for VPS

## Overview
This package contains all the new features and updates that need to be deployed to the VPS at `103.127.99.7`.

## New Features Included
1. **Messages System** - New messaging functionality
2. **Notifications System** - Real-time notifications for users
3. **Booking System** - Tourism tickets and accommodation booking
4. **Payment Integration** - Xendit payment gateway integration
5. **Rewards System** - Points and rewards management
6. **My Activities** - User activity tracking
7. **Profile Management** - Enhanced profile editing
8. **Settings Page** - User preferences and settings
9. **Admin Notifications** - Admin notification management

## Files to Upload

### Backend Files
Upload these files to `/var/www/thelodgefamily/backend/`:

1. **New Route Files:**
   - `src/routes/notifications.ts` → `/var/www/thelodgefamily/backend/src/routes/`
   - `src/routes/booking.ts` → `/var/www/thelodgefamily/backend/src/routes/`
   - `src/routes/webhook.ts` → `/var/www/thelodgefamily/backend/src/routes/`

2. **Updated Route Files:**
   - `src/routes/admin.ts` → `/var/www/thelodgefamily/backend/src/routes/`
   - `src/routes/member.ts` → `/var/www/thelodgefamily/backend/src/routes/`

3. **Main Backend File:**
   - `src/index.ts` → `/var/www/thelodgefamily/backend/src/`

4. **Database Schema:**
   - `prisma/schema.prisma` → `/var/www/thelodgefamily/backend/prisma/`

5. **Dependencies:**
   - `package.json` → `/var/www/thelodgefamily/backend/`

### Frontend Files
Upload these directories to `/var/www/thelodgefamily/frontend/src/app/`:

1. **New Dashboard Pages:**
   - `(dashboard)/accommodation/` → `/var/www/thelodgefamily/frontend/src/app/(dashboard)/`
   - `(dashboard)/tourism-tickets/` → `/var/www/thelodgefamily/frontend/src/app/(dashboard)/`
   - `(dashboard)/booking/` → `/var/www/thelodgefamily/frontend/src/app/(dashboard)/`
   - `(dashboard)/messages/` → `/var/www/thelodgefamily/frontend/src/app/(dashboard)/`
   - `(dashboard)/settings/` → `/var/www/thelodgefamily/frontend/src/app/(dashboard)/`
   - `(dashboard)/rewards/` → `/var/www/thelodgefamily/frontend/src/app/(dashboard)/`
   - `(dashboard)/my-activities/` → `/var/www/thelodgefamily/frontend/src/app/(dashboard)/`
   - `(dashboard)/profile/edit/` → `/var/www/thelodgefamily/frontend/src/app/(dashboard)/profile/`

2. **New Top-Level Pages:**
   - `notifications/` → `/var/www/thelodgefamily/frontend/src/app/`
   - `payment/` → `/var/www/thelodgefamily/frontend/src/app/`

3. **Admin Pages:**
   - `admin/notifications/` → `/var/www/thelodgefamily/frontend/src/app/admin/`

4. **Components:**
   - `components/` → `/var/www/thelodgefamily/frontend/src/` (replace entire directory)

5. **Dependencies:**
   - `package.json` → `/var/www/thelodgefamily/frontend/`

## Deployment Steps

### Step 1: Upload Files
Use FTP, SFTP, or file manager to upload all files to their respective locations on the VPS.

### Step 2: Install Dependencies
SSH into the VPS and run:
```bash
# Backend dependencies
cd /var/www/thelodgefamily/backend
npm install

# Frontend dependencies  
cd /var/www/thelodgefamily/frontend
npm install
```

### Step 3: Update Database
```bash
cd /var/www/thelodgefamily/backend
npx prisma generate
npx prisma db push
```

### Step 4: Build Frontend
```bash
cd /var/www/thelodgefamily/frontend
npm run build
```

### Step 5: Restart Services
```bash
pm2 restart thelodgefamily-backend
pm2 restart thelodgefamily-frontend
```

## Verification
After deployment, verify the new features:

1. **Messages**: Visit `https://family.thelodgegroup.id/messages`
2. **Notifications**: Visit `https://family.thelodgegroup.id/notifications`
3. **Booking**: Check tourism tickets and accommodation booking
4. **Dashboard**: Verify all new menu items appear in the sidebar
5. **Admin Panel**: Check admin notifications functionality

## Environment Variables
Ensure these environment variables are set on the VPS:

### Backend (.env)
```
XENDIT_SECRET_KEY=your_xendit_secret_key
XENDIT_WEBHOOK_TOKEN=your_webhook_token
XENDIT_PUBLIC_KEY=your_xendit_public_key
```

### Frontend (.env.local)
```
NEXT_PUBLIC_XENDIT_PUBLIC_KEY=your_xendit_public_key
NEXT_PUBLIC_API_URL=https://api.family.thelodgegroup.id
```

## Troubleshooting

### If services fail to start:
1. Check logs: `pm2 logs thelodgefamily-backend` and `pm2 logs thelodgefamily-frontend`
2. Verify file permissions: `chown -R www-data:www-data /var/www/thelodgefamily`
3. Check database connection and schema

### If new pages don't appear:
1. Clear Next.js cache: `rm -rf /var/www/thelodgefamily/frontend/.next`
2. Rebuild: `npm run build`
3. Restart frontend service: `pm2 restart thelodgefamily-frontend`

## Support
If you encounter issues during deployment, check the application logs and ensure all files are uploaded to the correct locations with proper permissions.