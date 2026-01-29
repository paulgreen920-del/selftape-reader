import FacebookPixel from "@/components/FacebookPixel";
import "./globals.css";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import Script from "next/script";
import Providers from "@/components/Providers";

export const metadata = {
  title: "Self Tape Reader | Book a Reader for Your Audition Instantly",
  description: "Need a reader for your self-tape audition? Book a real actor to read lines with you over video chat. No subscription required — just pay per session. Available 24/7.",
  keywords: ["self tape reader", "audition reader", "self tape help", "reader for audition", "actor reader", "self tape partner"],
  verification: {
    google: "3ipAMZ-vNQyH5ZqfOdrqsYVC_r8OGtWuNCel9ACRBIw",
  },
  openGraph: {
    title: "Self Tape Reader | Book a Reader for Your Audition",
    description: "Need a reader for your self-tape? Book a real actor instantly. No subscription — just pay per session.",
    url: "https://www.selftapereader.com",
    siteName: "Self Tape Reader",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Self Tape Reader | Book a Reader for Your Audition",
    description: "Need a reader for your self-tape? Book a real actor instantly. No subscription required.",
  },
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className="bg-gray-50 text-gray-900">
        <Providers>
          <Script
            src="https://connect.facebook.net/en_US/fbevents.js"
            strategy="afterInteractive"
          />
          <Script id="fb-pixel-init" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];}(window,document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '918220014962169');
              fbq('track', 'PageView');
            `}
          </Script>

          {/* NAVBAR */}
          <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
            <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/" className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                <img src="/uploads/stripiconsmartphone.png" alt="Logo" className="h-6 w-6" />
                Self Tape Reader
              </Link>
              <div className="hidden sm:flex items-center gap-6 text-sm">
                <Link href="/" className="hover:text-emerald-700">Home</Link>
                <Link href="/readers" className="hover:text-emerald-700">Find Readers</Link>
                <Link href="/about" className="hover:text-emerald-700">About</Link>
                <Link href="/pricing" className="hover:text-emerald-700">Pricing</Link>
                <Link href="/tips" className="hover:text-emerald-700">Acting Tips</Link>
              </div>
              <Navigation />
            </nav>
          </header>

          {/* PAGE CONTENT */}
          <main className="max-w-6xl mx-auto px-4 py-10">{children}</main>

          {/* FOOTER */}
          <footer className="mt-16 border-t">
            <div className="max-w-6xl mx-auto px-4 h-16 text-sm flex items-center justify-between">
              <p>© {new Date().getFullYear()} Self Tape Reader</p>
              <div className="flex gap-4">
                <Link href="/about" className="hover:text-emerald-700">About</Link>
                <Link href="/pricing" className="hover:text-emerald-700">Pricing</Link>
                <Link href="/terms" className="hover:text-emerald-700">Terms</Link>
                <Link href="/privacy-policy" className="hover:text-emerald-700">Privacy Policy</Link>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}