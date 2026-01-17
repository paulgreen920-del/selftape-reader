"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BasicProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [headshotUrl, setHeadshotUrl] = useState("");

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    const limited = numbers.slice(0, 10);

    if (limited.length === 0) return "";
    if (limited.length <= 3) return `(${limited}`;
    if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
  };

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            if (!data.user.emailVerified) {
              router.push("/verify-email");
              return;
            }
            setDisplayName(data.user.displayName || data.user.name || "");
            setEmail(data.user.email || "");
            setPhone(data.user.phone || "");
            setCity(data.user.city || "");
            setBio(data.user.bio || "");
            setHeadshotUrl(data.user.headshotUrl || "");
          }
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  async function handleHeadshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("Please upload an image no larger than 4MB.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data?.absoluteUrl) throw new Error(data?.error || "Upload failed");
      setHeadshotUrl(data.absoluteUrl);
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!headshotUrl) {
      alert("Please upload a headshot.");
      return;
    }
    if (!phone.trim()) {
      alert("Please enter your phone number.");
      return;
    }
    if (!city.trim()) {
      alert("Please enter your city.");
      return;
    }
    if (!bio.trim()) {
      alert("Please enter a short bio.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          city,
          bio,
          headshotUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      // Go to the "You're all set" page
      router.push("/onboarding/complete");
    } catch (err: any) {
      alert(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12">
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-12 h-1 bg-emerald-600"></div>
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">✓</div>
            <div className="w-12 h-1 bg-emerald-600"></div>
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">3</div>
            <div className="w-12 h-1 bg-gray-200"></div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold">4</div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Add a photo and some basic info so readers know who they're working with.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Headshot */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Headshot <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                {headshotUrl ? (
                  <img
                    src={headshotUrl}
                    alt="Headshot preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-emerald-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <span className="text-gray-400 text-3xl">👤</span>
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeadshotChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                </div>
              </div>
            </div>
            {/* Display Name (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                disabled
                className="w-full border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">From your account</p>
            </div>
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-500"
              />
            </div>
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                placeholder="(555) 555-5555"
                maxLength={14}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Los Angeles, CA"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short Bio <span className="text-red-500">*</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a bit about yourself..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            {/* Submit */}
            <button
              type="submit"
              disabled={saving || uploading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-full transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
