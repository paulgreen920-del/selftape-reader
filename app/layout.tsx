import "./globals.css";
import Link from "next/link";
import Navigation from "@/components/Navigation";

export const metadata = {
  title: "Self Tape Reader",
  description: "Actors helping actors with self-tapes",
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
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
      </body>
    </html>
  );
}