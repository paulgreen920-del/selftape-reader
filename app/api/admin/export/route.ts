import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminAuth } from "@/lib/admin-auth";

/**
 * POST /api/admin/export
 * Export users to CSV with selected columns and related data
 */
export async function POST(req: Request) {
  const adminCheck = await checkAdminAuth(req);
  if (!adminCheck.isAdmin) return adminCheck.response;

  try {
    const body = await req.json();
    const { userIds, columns, includeBookings, includeTemplates } = body;

    // Build where clause
    const where: any = {};
    if (userIds && userIds.length > 0) {
      where.id = { in: userIds };
    }

    // Fetch users with related data
    const users = await prisma.user.findMany({
      where,
      include: {
        Booking_Booking_readerIdToUser: includeBookings ? {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            User_Booking_actorIdToUser: {
              select: { email: true, displayName: true }
            }
          }
        } : false,
        Booking_Booking_actorIdToUser: includeBookings ? {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            User_Booking_readerIdToUser: {
              select: { email: true, displayName: true }
            }
          }
        } : false,
        AvailabilityTemplate: includeTemplates ? true : false,
        AvailabilitySlot: includeTemplates ? {
          where: {
            startTime: { gte: new Date() },
            isBooked: false,
          },
          take: 20,
        } : false,
        CalendarConnection: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Define all available columns
    const allColumns: Record<string, (user: any) => string> = {
      id: (u) => u.id || '',
      email: (u) => u.email || '',
      displayName: (u) => u.displayName || u.name || '',
      role: (u) => u.role || '',
      isActive: (u) => u.isActive ? 'Yes' : 'No',
      emailVerified: (u) => u.emailVerified ? 'Yes' : 'No',
      phone: (u) => u.phone || '',
      city: (u) => u.city || '',
      timezone: (u) => u.timezone || '',
      bio: (u) => (u.bio || '').replace(/[\n\r,]/g, ' ').substring(0, 200),
      gender: (u) => u.gender || '',
      playableAgeMin: (u) => u.playableAgeMin?.toString() || '',
      playableAgeMax: (u) => u.playableAgeMax?.toString() || '',
      ratePer15Min: (u) => u.ratePer15Min ? `$${(u.ratePer15Min / 100).toFixed(2)}` : '',
      ratePer30Min: (u) => u.ratePer30Min ? `$${(u.ratePer30Min / 100).toFixed(2)}` : '',
      ratePer60Min: (u) => u.ratePer60Min ? `$${(u.ratePer60Min / 100).toFixed(2)}` : '',
      subscriptionStatus: (u) => u.subscriptionStatus || 'none',
      subscriptionId: (u) => u.subscriptionId || '',
      stripeAccountId: (u) => u.stripeAccountId || '',
      stripeCustomerId: (u) => u.stripeCustomerId || '',
      headshotUrl: (u) => u.headshotUrl || '',
      calendarConnected: (u) => u.CalendarConnection ? 'Yes' : 'No',
      calendarType: (u) => u.CalendarConnection?.provider || '',
      createdAt: (u) => u.createdAt ? new Date(u.createdAt).toISOString() : '',
      updatedAt: (u) => u.updatedAt ? new Date(u.updatedAt).toISOString() : '',
      // Computed fields
      totalBookingsAsReader: (u) => u.Booking_Booking_readerIdToUser?.length?.toString() || '0',
      totalBookingsAsActor: (u) => u.Booking_Booking_actorIdToUser?.length?.toString() || '0',
      availabilityTemplateCount: (u) => u.AvailabilityTemplate?.length?.toString() || '0',
      upcomingSlotCount: (u) => u.AvailabilitySlot?.length?.toString() || '0',
    };

    // Use selected columns or default set
    const selectedColumns = columns && columns.length > 0 
      ? columns 
      : ['email', 'displayName', 'role', 'isActive', 'subscriptionStatus', 'createdAt'];

    // Build CSV header
    const csvHeader = selectedColumns.join(',');

    // Build CSV rows
    const csvRows = users.map(user => {
      return selectedColumns.map((col: string) => {
        const getValue = allColumns[col];
        if (!getValue) return '';
        const value = getValue(user);
        // Escape quotes and wrap in quotes if contains comma
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    // Combine header and rows
    let csv = [csvHeader, ...csvRows].join('\n');

    // If including bookings as separate section, add them
    if (includeBookings) {
      csv += '\n\n--- BOOKINGS (as Reader) ---\n';
      csv += 'User Email,Actor Email,Actor Name,Date,Duration,Status,Price,Created\n';
      
      users.forEach(user => {
        if (user.Booking_Booking_readerIdToUser) {
          user.Booking_Booking_readerIdToUser.forEach((booking: any) => {
            const row = [
              user.email,
              booking.User_Booking_actorIdToUser?.email || '',
              booking.User_Booking_actorIdToUser?.displayName || '',
              booking.startTime ? new Date(booking.startTime).toISOString() : '',
              booking.duration?.toString() || '',
              booking.status || '',
              booking.priceCents ? `$${(booking.priceCents / 100).toFixed(2)}` : '',
              booking.createdAt ? new Date(booking.createdAt).toISOString() : '',
            ].map(v => v.includes(',') ? `"${v}"` : v).join(',');
            csv += row + '\n';
          });
        }
      });

      csv += '\n--- BOOKINGS (as Actor) ---\n';
      csv += 'User Email,Reader Email,Reader Name,Date,Duration,Status,Price,Created\n';
      
      users.forEach(user => {
        if (user.Booking_Booking_actorIdToUser) {
          user.Booking_Booking_actorIdToUser.forEach((booking: any) => {
            const row = [
              user.email,
              booking.User_Booking_readerIdToUser?.email || '',
              booking.User_Booking_readerIdToUser?.displayName || '',
              booking.startTime ? new Date(booking.startTime).toISOString() : '',
              booking.duration?.toString() || '',
              booking.status || '',
              booking.priceCents ? `$${(booking.priceCents / 100).toFixed(2)}` : '',
              booking.createdAt ? new Date(booking.createdAt).toISOString() : '',
            ].map(v => v.includes(',') ? `"${v}"` : v).join(',');
            csv += row + '\n';
          });
        }
      });
    }

    // If including templates, add them
    if (includeTemplates) {
      csv += '\n\n--- AVAILABILITY TEMPLATES ---\n';
      csv += 'User Email,Day,Start Time,End Time,Active\n';
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      users.forEach(user => {
        if (user.AvailabilityTemplate) {
          user.AvailabilityTemplate.forEach((template: any) => {
            const row = [
              user.email,
              dayNames[template.dayOfWeek] || template.dayOfWeek,
              template.startTime || '',
              template.endTime || '',
              template.isActive ? 'Yes' : 'No',
            ].join(',');
            csv += row + '\n';
          });
        }
      });
    }

    // Return CSV as downloadable file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (err: any) {
    console.error("[admin/export] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/export/columns
 * Returns available columns for export
 */
export async function GET(req: Request) {
  const adminCheck = await checkAdminAuth(req);
  if (!adminCheck.isAdmin) return adminCheck.response;

  const columns = [
    { key: 'id', label: 'User ID', category: 'Basic' },
    { key: 'email', label: 'Email', category: 'Basic' },
    { key: 'displayName', label: 'Display Name', category: 'Basic' },
    { key: 'role', label: 'Role', category: 'Basic' },
    { key: 'isActive', label: 'Active Status', category: 'Basic' },
    { key: 'emailVerified', label: 'Email Verified', category: 'Basic' },
    { key: 'phone', label: 'Phone', category: 'Contact' },
    { key: 'city', label: 'City', category: 'Contact' },
    { key: 'timezone', label: 'Timezone', category: 'Contact' },
    { key: 'bio', label: 'Bio', category: 'Profile' },
    { key: 'gender', label: 'Gender', category: 'Profile' },
    { key: 'playableAgeMin', label: 'Playable Age Min', category: 'Profile' },
    { key: 'playableAgeMax', label: 'Playable Age Max', category: 'Profile' },
    { key: 'ratePer15Min', label: 'Rate (15 min)', category: 'Rates' },
    { key: 'ratePer30Min', label: 'Rate (30 min)', category: 'Rates' },
    { key: 'ratePer60Min', label: 'Rate (60 min)', category: 'Rates' },
    { key: 'subscriptionStatus', label: 'Subscription Status', category: 'Billing' },
    { key: 'subscriptionId', label: 'Subscription ID', category: 'Billing' },
    { key: 'stripeAccountId', label: 'Stripe Account ID', category: 'Billing' },
    { key: 'stripeCustomerId', label: 'Stripe Customer ID', category: 'Billing' },
    { key: 'headshotUrl', label: 'Headshot URL', category: 'Profile' },
    { key: 'calendarConnected', label: 'Calendar Connected', category: 'Setup' },
    { key: 'calendarType', label: 'Calendar Type', category: 'Setup' },
    { key: 'createdAt', label: 'Created At', category: 'Dates' },
    { key: 'updatedAt', label: 'Updated At', category: 'Dates' },
    { key: 'totalBookingsAsReader', label: 'Bookings as Reader', category: 'Stats' },
    { key: 'totalBookingsAsActor', label: 'Bookings as Actor', category: 'Stats' },
    { key: 'availabilityTemplateCount', label: 'Availability Templates', category: 'Stats' },
    { key: 'upcomingSlotCount', label: 'Upcoming Slots', category: 'Stats' },
  ];

  return NextResponse.json({ ok: true, columns });
}