# Admin Panel

A comprehensive admin backend for managing users, bookings, and viewing platform statistics.

## Features

### 🎯 Dashboard (`/admin`)
- **User Statistics**: Total users, readers, actors, active subscriptions
- **Booking Metrics**: Total, pending, completed, and canceled bookings
- **Revenue Tracking**: Platform fees from completed bookings
- **Recent Activity**: Latest 10 bookings with details

### 👥 User Management (`/admin/users`)
- **View All Users**: Paginated list with 50 users per page
- **Search & Filter**: Search by email/name, filter by role (Actor/Reader/Admin)
- **Edit Users**: Update role, status, subscription, onboarding step
- **Delete Users**: Remove users with confirmation
- **User Details**: See onboarding status, subscription status, Stripe connection

### 📅 Booking Management (`/admin/bookings`)
- **View All Bookings**: Paginated list with complete booking details
- **Search & Filter**: Search by email, filter by status
- **Edit Bookings**: Change status, add admin notes
- **Delete Bookings**: Remove bookings with confirmation
- **Booking Info**: Actor, reader, time, duration, price, status

## Setup

### 1. Create an Admin User

Run the setup script with your email:

```bash
node setup-admin.js admin@example.com
```

Or manually update an existing user in the database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';
```

### 2. Access the Admin Panel

1. Login with your admin account
2. Navigate to `/admin`
3. You'll see the dashboard with statistics

## API Endpoints

All admin endpoints require ADMIN role authentication via session cookie.

### Stats
- **GET** `/api/admin/stats` - Get dashboard statistics

### Users
- **GET** `/api/admin/users?page=1&limit=50&role=READER&search=john` - List users
- **PUT** `/api/admin/users` - Update user
  ```json
  {
    "userId": "user_123",
    "updates": {
      "role": "READER",
      "isActive": true,
      "subscriptionStatus": "active",
      "onboardingStep": null
    }
  }
  ```
- **DELETE** `/api/admin/users?userId=user_123` - Delete user

### Bookings
- **GET** `/api/admin/bookings?page=1&limit=50&status=PENDING&search=email` - List bookings
- **PUT** `/api/admin/bookings` - Update booking
  ```json
  {
    "bookingId": "booking_123",
    "updates": {
      "status": "COMPLETED",
      "notes": "Manually marked as completed"
    }
  }
  ```
- **DELETE** `/api/admin/bookings?bookingId=booking_123` - Delete booking

## Security

- **Role-Based Access**: Only users with `role: "ADMIN"` can access admin routes
- **Session Authentication**: Uses existing cookie-based auth system
- **Authorization Checks**: All API endpoints verify admin role via `checkAdminAuth()`
- **Client-Side Guards**: Admin layout redirects non-admins to dashboard

## Navigation

The admin panel includes:
- Dashboard overview
- Users management
- Bookings management
- "User View" link to return to regular dashboard
- Admin email display

## Permissions

Admins can:
- ✅ View all users and bookings
- ✅ Edit user roles, status, subscriptions
- ✅ Update booking statuses
- ✅ Delete users and bookings
- ✅ View platform statistics and revenue
- ✅ Search and filter all data

Admins cannot:
- ❌ Change user passwords (must be done in database)
- ❌ Process refunds (must use Stripe dashboard)
- ❌ Modify payment amounts after booking created

## Development Notes

- Admin auth middleware: `lib/admin-auth.ts`
- Admin layout: `app/admin/layout.tsx`
- Styling: Tailwind CSS with gray theme
- Icons: Heroicons (SVG inline)
- Pagination: 50 items per page default
- Real-time updates: Manual refresh required

## Future Enhancements

Potential additions:
- Export data to CSV
- Advanced analytics charts
- Email notification system
- Bulk user operations
- Audit log of admin actions
- Calendar view of bookings
- Revenue analytics over time
