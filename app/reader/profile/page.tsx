"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const UNION_OPTIONS = ["SAG-AFTRA", "AEA", "AGVA", "Non-Union"];
const LANGUAGE_OPTIONS = ["English", "Spanish", "French", "Italian", "German", "Mandarin"];
const SPECIALTY_OPTIONS = ["Comedy", "Drama", "Shakespeare", "Musical Theatre", "Improvisation", "Accents"];

type LinkItem = { label: string; url: string };

export default function EditReaderProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [readerId, setReaderId] = useState("");

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");

  const [playableAgeMin, setPlayableAgeMin] = useState<number | "">("");
  const [playableAgeMax, setPlayableAgeMax] = useState<number | "">("");
  const [gender, setGender] = useState("");

  const [rate15Usd, setRate15Usd] = useState<number | "">(15);
  const [rateUsd, setRateUsd] = useState<number | "">(25);
  const [rate60Usd, setRate60Usd] = useState<number | "">(60);

  const [unions, setUnions] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);

  const [headshotUrl, setHeadshotUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const [links, setLinks] = useState<LinkItem[]>([{ label: "", url: "" }]);

  useEffect(() => {
    async function fetchReaderData() {
      try {
        // Get current user
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();

        if (userData.user.role !== 'READER' && userData.user.role !== 'ADMIN') {
          alert('You must be a reader to access this page');
          router.push('/dashboard');
          return;
        }

        // Fetch reader data using current user's ID
        const readerRes = await fetch(`/api/readers/profile?id=${userData.user.id}`);
        if (!readerRes.ok) {
          throw new Error('Failed to load reader profile');
        }

        const readerData = await readerRes.json();
        const reader = readerData.reader;

        // Set readerId to current user's ID
        setReaderId(userData.user.id);
        setDisplayName(reader.displayName || "");
        setEmail(reader.email || "");
        setPhone(reader.phone || "");
        setTimezone(reader.timezone || "America/New_York");
        setCity(reader.city || "");
        setBio(reader.bio || "");
        setPlayableAgeMin(reader.playableAgeMin ?? "");
        setPlayableAgeMax(reader.playableAgeMax ?? "");
        setGender(reader.gender || "");
        setHeadshotUrl(reader.headshotUrl || "");

        // Convert cents to dollars
        setRate15Usd(reader.ratePer15Min ? reader.ratePer15Min / 100 : 15);
        setRateUsd(reader.ratePer30Min ? reader.ratePer30Min / 100 : 25);
        setRate60Usd(reader.ratePer60Min ? reader.ratePer60Min / 100 : 60);

        setUnions(Array.isArray(reader.unions) ? reader.unions : []);
        setLanguages(Array.isArray(reader.languages) ? reader.languages : []);
        setSpecialties(Array.isArray(reader.specialties) ? reader.specialties : []);
        setLinks(Array.isArray(reader.links) && reader.links.length > 0 ? reader.links : [{ label: "", url: "" }]);

      } catch (err: any) {
        console.error('Failed to load reader data:', err);
        alert('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    }

    fetchReaderData();
  }, [router]);

  function toggleItem(value: string, setFn: React.Dispatch<React.SetStateAction<string[]>>) {
    setFn((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  }

  async function handleHeadshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // 10MB limit (must match backend)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("Please upload an image no larger than 10MB.");
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
      // Show a user-friendly error if file is too large
      if (err.message && err.message.includes("no larger than 10MB")) {
        alert("Please upload an image no larger than 10MB.");
      } else {
        alert(err.message || "Upload failed");
      }
      setHeadshotUrl("");
    } finally {
      setUploading(false);
    }
  }

  function updateLink(index: number, key: keyof LinkItem, value: string) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [key]: value } : l)));
  }

  function addLinkRow() {
    setLinks((prev) => [...prev, { label: "", url: "" }]);
  }

  function removeLinkRow(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      playableAgeMin !== "" &&
      playableAgeMax !== "" &&
      Number(playableAgeMin) > Number(playableAgeMax)
    ) {
      alert("Playable age: Min must be ≤ Max.");
      return;
    }

    if (uploading) {
      alert("Please wait for the headshot to finish uploading.");
      return;
    }

    setSaving(true);
    try {
      const cleanLinks = links.filter((l) => l.label.trim() && l.url.trim());

      const payload = {
        displayName,
        email,
        phone,
        timezone,
        city,
        bio,
        playableAgeMin: playableAgeMin === "" ? null : Number(playableAgeMin),
        playableAgeMax: playableAgeMax === "" ? null : Number(playableAgeMax),
        gender: gender || null,
        headshotUrl,
        rate15Usd: rate15Usd === "" ? 0 : rate15Usd,
        rateUsd: rateUsd === "" ? 0 : rateUsd,
        rate60Usd: rate60Usd === "" ? 0 : rate60Usd,
        unions,
        languages,
        specialties,
        links: cleanLinks,
      };

      const res = await fetch(`/api/readers/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readerId: readerId, ...payload }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to update profile");
      }

      alert("Profile updated successfully!");
      router.push('/dashboard');
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      alert(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Edit Reader Profile</h1>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
          {/* Headshot */}
          <div>
            <label className="block text-sm font-medium mb-2">Headshot <span className="text-xs text-gray-500">(max 10MB)</span></label>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm"
              onChange={handleHeadshotChange}
            />
            <p className="text-xs text-gray-500 mt-1">Please upload a clear image. Maximum file size: 10MB.</p>
            {uploading && <p className="text-xs mt-1">Uploading…</p>}
            {headshotUrl && (
              <div className="mt-2">
                <img
                  src={headshotUrl}
                  alt="Headshot preview"
                  className="h-32 w-32 object-cover rounded"
                />
              </div>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Display Name</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              required
            />
            <p className="text-xs text-gray-500 mt-1">This name will be shown to actors when booking sessions</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              className="border rounded px-3 py-2 w-full bg-gray-100"
              value={email}
              disabled
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">Your login email address</p>
              <Link href="/settings/change-email" className="text-xs text-blue-600 hover:underline">
                Change email
              </Link>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="flex items-center justify-between">
              <input
                type="password"
                className="border rounded px-3 py-2 w-full bg-gray-100 mr-3"
                value="••••••••••••"
                disabled
              />
              <Link
                href="/settings/change-password"
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg whitespace-nowrap"
              >
                Change Password
              </Link>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 555 5555"
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium mb-2">Timezone</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {[
                "America/New_York",
                "America/Chicago",
                "America/Denver",
                "America/Los_Angeles",
                "Europe/London",
                "Europe/Paris",
                "Asia/Tokyo",
              ].map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="New York, NY"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-2">Bio</label>
            <textarea
              className="border rounded px-3 py-2 w-full min-h-[120px]"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell actors what it's like to work with you."
            />
          </div>

          {/* Playable Age & Gender */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Playable Age Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={120}
                  className="border rounded px-3 py-2 w-20 text-center"
                  placeholder="Min"
                  value={playableAgeMin}
                  onChange={(e) => setPlayableAgeMin(e.target.value === "" ? "" : Number(e.target.value))}
                />
                <span>–</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  className="border rounded px-3 py-2 w-20 text-center"
                  placeholder="Max"
                  value={playableAgeMax}
                  onChange={(e) => setPlayableAgeMax(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Gender</label>
              <select
                className="w-full rounded-md border px-3 py-2 bg-white"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Select gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Transgender">Transgender</option>
                <option value="Prefer not to say">Prefer not to say</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Rates */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rate per 15 min (USD)</label>
              <input
                type="number"
                min={0}
                step={1}
                className="border rounded px-3 py-2 w-full"
                value={rate15Usd}
                onChange={(e) => setRate15Usd(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Rate per 30 min (USD)</label>
              <input
                type="number"
                min={0}
                step={1}
                className="border rounded px-3 py-2 w-full"
                value={rateUsd}
                onChange={(e) => setRateUsd(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Rate per 60 min (USD)</label>
              <input
                type="number"
                min={0}
                step={1}
                className="border rounded px-3 py-2 w-full"
                value={rate60Usd}
                onChange={(e) => setRate60Usd(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>

          {/* Unions */}
          <div>
            <label className="block text-sm font-medium mb-2">Union</label>
            <div className="flex flex-wrap gap-2">
              {UNION_OPTIONS.map((u) => (
                <label key={u} className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={unions.includes(u)}
                    onChange={() => toggleItem(u, setUnions)}
                  />
                  <span className="text-sm">{u}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium mb-2">Languages</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((l) => (
                <label key={l} className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={languages.includes(l)}
                    onChange={() => toggleItem(l, setLanguages)}
                  />
                  <span className="text-sm">{l}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Specialties */}
          <div>
            <label className="block text-sm font-medium mb-2">Specialties</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map((s) => (
                <label key={s} className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={specialties.includes(s)}
                    onChange={() => toggleItem(s, setSpecialties)}
                  />
                  <span className="text-sm">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <label className="block text-sm font-medium mb-2">Links</label>
            <div className="space-y-3">
              {links.map((l, i) => (
                <div key={i} className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      className="border rounded px-3 py-2 w-full"
                      placeholder="Label (e.g., Website, Instagram)"
                      value={l.label}
                      onChange={(e) => updateLink(i, "label", e.target.value)}
                    />
                    <input
                      className="border rounded px-3 py-2 w-full"
                      placeholder="https://example.com/your-profile"
                      value={l.url}
                      onChange={(e) => updateLink(i, "url", e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                      onClick={addLinkRow}
                    >
                      + Add link
                    </button>
                    {links.length > 1 && (
                      <button
                        type="button"
                        className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                        onClick={() => removeLinkRow(i)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}