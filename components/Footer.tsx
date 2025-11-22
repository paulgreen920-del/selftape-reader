export default function Footer() {
  return (
    <footer className="mt-12 border-t bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-500 flex flex-col items-center gap-2">
        <span>© {new Date().getFullYear()} Self-Tape Reader Marketplace</span>
        <a href="/privacy-policy" className="text-blue-500 hover:underline">Privacy Policy</a>
      </div>
    </footer>
  );
}
