import React from "react";
import { prisma } from "@/lib/prisma";
import PaymentProcessor from "@/components/PaymentProcessor";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };

function formatInTZ(dt: Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    dateStyle: "full",
    timeStyle: "short",
  }).format(dt);
}

function toGoogleUTC(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const HH = pad(d.getUTCHours());
  const MM = pad(d.getUTCMinutes());
  const SS = pad(d.getUTCSeconds());
  return `${yyyy}${mm}${dd}T${HH}${MM}${SS}Z`;
}

function toICalUTC(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const HH = pad(d.getUTCHours());
  const MM = pad(d.getUTCMinutes());
  const SS = pad(d.getUTCSeconds());
  return `${yyyy}${mm}${dd}T${HH}${MM}${SS}Z`;
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function SuccessPage({ searchParams }: { searchParams: SearchParams }) {
  // Handle both sync and async searchParams for Next.js 16
  const params = await Promise.resolve(searchParams);
  
  const bookingId =
    (typeof params.bookingId === "string" && params.bookingId) ||
    (typeof params.id === "string" && params.id) ||
    "";

  if (!bookingId) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Payment Success</h1>
        <p className="text-gray-600">Thanks! Return to your account to view booking details.</p>
      </main>
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      totalCents: true,
      meetingUrl: true,
      User_Booking_readerIdToUser: { 
        select: { 
          id: true, 
          displayName: true, 
          name: true, 
          email: true,
          timezone: true,
          headshotUrl: true
        } 
      },
      User_Booking_actorIdToUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
  });

  if (!booking) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Booking not found</h1>
        <p className="text-gray-600">Please check your link or return to your dashboard.</p>
      </main>
    );
  }



  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const readerTZ = booking.User_Booking_readerIdToUser?.timezone || "America/New_York";
  const readerName = booking.User_Booking_readerIdToUser?.displayName || booking.User_Booking_readerIdToUser?.name || "your reader";
  const actorName = booking.User_Booking_actorIdToUser?.name || "Actor";
  
  // Format dates
  const localStart = formatInTZ(start, readerTZ);
  const localEnd = formatInTZ(end, readerTZ);
  const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

  // Calendar event details
  const title = `Reading Session with ${readerName}`;
  const description = `Self-tape reading session between ${actorName} and ${readerName}.${booking.meetingUrl ? `\n\nJoin your session: ${booking.meetingUrl}` : '\n\nMeeting details will be provided closer to the session time.'}`;
  const location = booking.meetingUrl || "Online Video Call";

  // Google Calendar URL
  const gCalUrl = new URL("https://calendar.google.com/calendar/render");
  gCalUrl.searchParams.set("action", "TEMPLATE");
  gCalUrl.searchParams.set("text", title);
  gCalUrl.searchParams.set("details", description);
  gCalUrl.searchParams.set("location", location);
  gCalUrl.searchParams.set("dates", `${toGoogleUTC(start)}/${toGoogleUTC(end)}`);

  // Microsoft Calendar URL (Outlook) - uses ISO format
  const outlookUrl = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
  outlookUrl.searchParams.set("subject", title);
  outlookUrl.searchParams.set("body", description);
  outlookUrl.searchParams.set("location", location);
  outlookUrl.searchParams.set("startdt", start.toISOString());
  outlookUrl.searchParams.set("enddt", end.toISOString());

  // iCal data
  const icalData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ReadersMarket//Reading Session//EN
BEGIN:VEVENT
UID:${booking.id}@readersmarket.com
DTSTAMP:${toICalUTC(new Date())}
DTSTART:${toICalUTC(start)}
DTEND:${toICalUTC(end)}
SUMMARY:${title}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

  const icalUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(icalData)}`;

  return (
    <main className="max-w-4xl mx-auto p-6">
      {/* Payment Processing */}
      <PaymentProcessor bookingId={booking.id} />
      
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed! 🎬</h1>
        <p className="text-lg text-gray-600">Your reading session has been successfully scheduled</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Booking Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-6">Session Details</h2>
            
            {/* Reader Info */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-gray-100 grid place-items-center text-lg font-semibold">
                {booking.User_Booking_readerIdToUser?.headshotUrl ? (
                  <img
                    src={booking.User_Booking_readerIdToUser.headshotUrl}
                    alt={readerName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  readerName.split(" ").map((p: string) => p[0]).join("").slice(0, 2)
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{readerName}</h3>
                <p className="text-gray-600">Your Reading Partner</p>
                {booking.User_Booking_readerIdToUser?.email && (
                  <p className="text-sm text-gray-500">{booking.User_Booking_readerIdToUser.email}</p>
                )}
              </div>
            </div>

            {/* Session Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Date & Time</div>
                  <div className="text-gray-900 space-y-2">
                    <div className="font-semibold">{start.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      timeZone: readerTZ
                    })}</div>
                    
                    {/* Session time in local timezone */}
                    <div className="">
                      <div className="text-lg font-semibold">
                        {start.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          timeZoneName: 'short'
                        })}
                      </div>
                    </div>
                  </div>"
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Duration</div>
                  <div className="text-gray-900 font-semibold">{duration} minutes</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Session Cost</div>
                  <div className="text-gray-900 font-semibold text-lg">{formatCents(booking.totalCents || 0)}</div>
                </div>
              </div>
            </div>

            {/* Meeting Link */}
            <div className="mt-6 pt-6 border-t">
              <div className="text-sm font-medium text-gray-500 mb-3">Video Session</div>
              {booking.meetingUrl ? (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Your meeting is ready!</span>
                    </div>
                    <p className="text-blue-700 text-sm mb-3">Click the link below when it's time for your session</p>
                    <a 
                      href={booking.meetingUrl} 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Join Video Session
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Meeting link coming soon</span>
                  </div>
                  <p className="text-gray-600 text-sm">Your video session link will be provided closer to the meeting time</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar Integration */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Add to Calendar</h2>
            <p className="text-sm text-gray-600 mb-6">Don't forget your session! Add it to your calendar.</p>
            
            <div className="space-y-3">
              {/* Google Calendar */}
              <a 
                href={gCalUrl.toString()} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-3 w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Google Calendar</div>
                  <div className="text-sm text-gray-500">Add to Google Calendar</div>
                </div>
              </a>

              {/* Microsoft Outlook */}
              <a 
                href={outlookUrl.toString()} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-3 w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 9h10v1H7V9m0 2h10v1H7v-1m0 2h7v1H7v-1M12 20l8-4V8l-8-4-8 4v8l8 4z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Outlook Calendar</div>
                  <div className="text-sm text-gray-500">Add to Microsoft Outlook</div>
                </div>
              </a>

              {/* iCal Download */}
              <a 
                href={icalUrl}
                download={`reading-session-${booking.id}.ics`}
                className="flex items-center gap-3 w-full p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">iCal File</div>
                  <div className="text-sm text-gray-500">Download calendar file</div>
                </div>
              </a>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 mt-6">
            <h3 className="font-semibold text-emerald-900 mb-3">What's Next?</h3>
            <ul className="space-y-2 text-sm text-emerald-800">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Check your email for confirmation details</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Add the session to your calendar</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Prepare your script and materials</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Test your camera and microphone beforehand</span>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <p className="text-sm text-emerald-700 font-medium">Break a leg! 🍀</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
