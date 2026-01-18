// app/onboarding/reader/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const UNION_OPTIONS = ["SAG-AFTRA", "AEA", "AGVA", "Non-Union"];
const LANGUAGE_OPTIONS = ["English", "Spanish", "French", "Italian", "German", "Mandarin"];
const SPECIALTY_OPTIONS = ["Comedy", "Drama", "Shakespeare", "Musical Theatre", "Improvisation", "Accents"];

type LinkItem = { label: string; url: string };

export default function ReaderOnboardingMini() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [playableAgeMin, setPlayableAgeMin] = useState<number | "">("");
  const [playableAgeMax, setPlayableAgeMax] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [rate15Usd, setRate15Usd] = useState<number | "">(15);
  const [rateUsd, setRateUsd] = useState<number | "">(25);
  const [rate60Usd, setRate60Usd] = useState<number | "">(60);
  const [unions, setUnions] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [headshot, setHeadshot] = useState("");
  const [uploading, setUploading] = useState(false);
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState<LinkItem[]>([{ label: "", url: "" }]);
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const canSubmit = 
    displayName.trim().length > 0 && 
    /\S+@\S+\.\S+/.test(email) &&
    phone.trim().length > 0 &&
    city.trim().length > 0 &&
    playableAgeMin !== "" &&
    playableAgeMax !== "" &&
    gender.trim().length > 0 &&
    unions.length > 0 &&
    languages.length > 0 &&
    specialties.length > 0 &&
    rate15Usd !== "" && rate15Usd > 0 &&
    rateUsd !== "" && rateUsd > 0 &&
    rate60Usd !== "" && rate60Usd > 0 &&
    headshot.trim().length > 0 &&
    acceptedTerms;

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            if (!data.user.emailVerified) {
              window.location.href = '/verify-email';
              return;
            }
            
            // Set basic user info
            setDisplayName(data.user.name || "");
            setEmail(data.user.email || "");
            
            // Pre-fill existing reader profile data if available
            if (data.user.headshotUrl) setHeadshot(data.user.headshotUrl);
            if (data.user.bio) setBio(data.user.bio);
            if (data.user.phone) setPhone(data.user.phone);
            if (data.user.city) setCity(data.user.city);
            if (data.user.playableAgeMin) setPlayableAgeMin(data.user.playableAgeMin);
            if (data.user.playableAgeMax) setPlayableAgeMax(data.user.playableAgeMax);
            if (data.user.gender) setGender(data.user.gender);
            
            // Pre-fill rates (convert from cents to dollars)
            if (data.user.ratePer15Min) setRate15Usd(data.user.ratePer15Min / 100);
            if (data.user.ratePer30Min) setRateUsd(data.user.ratePer30Min / 100);
            if (data.user.ratePer60Min) setRate60Usd(data.user.ratePer60Min / 100);
            
            // Pre-fill arrays (parse JSON if needed)
            if (data.user.unions) {
              const unionsArray = Array.isArray(data.user.unions) ? data.user.unions : JSON.parse(data.user.unions);
              setUnions(unionsArray);
            }
            if (data.user.languages) {
              const languagesArray = Array.isArray(data.user.languages) ? data.user.languages : JSON.parse(data.user.languages);
              setLanguages(languagesArray);
            }
            if (data.user.specialties) {
              const specialtiesArray = Array.isArray(data.user.specialties) ? data.user.specialties : JSON.parse(data.user.specialties);
              setSpecialties(specialtiesArray);
            }
            if (data.user.links && Array.isArray(data.user.links) && data.user.links.length > 0) {
              const linksArray = Array.isArray(data.user.links) ? data.user.links : JSON.parse(data.user.links);
              setLinks(linksArray);
            }
            
            // Pre-check terms if previously accepted
            if (data.user.acceptsTerms) setAcceptedTerms(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  function toggleItem(value: string, setFn: React.Dispatch<React.SetStateAction<string[]>>) {
    setFn((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
  }

  async function handleHeadshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await res.json();
      if (data.url) {
        setHeadshot(data.url);
      } else {
        throw new Error("No URL returned from upload");
      }
    } catch (err: any) {
      console.error("Headshot upload error:", err);
      alert(err?.message || "Failed to upload headshot");
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!headshot.trim()) {
      alert("Please upload a headshot.");
      return;
    }
    if (playableAgeMin === "" || playableAgeMax === "") {
      alert("Please enter your playable age range.");
      return;
    }
    if (Number(playableAgeMin) > Number(playableAgeMax)) {
      alert("Playable age: Min must be ≤ Max.");
      return;
    }
    if (!gender) {
      alert("Please select your gender.");
      return;
    }
    if (unions.length === 0) {
      alert("Please select at least one union status.");
      return;
    }
    if (languages.length === 0) {
      alert("Please select at least one language.");
      return;
    }
    if (specialties.length === 0) {
      alert("Please select at least one specialty.");
      return;
    }
    if (rate15Usd === "" || rate15Usd <= 0) {
      alert("Please enter a valid rate for 15 minutes.");
      return;
    }
    if (rateUsd === "" || rateUsd <= 0) {
      alert("Please enter a valid rate for 30 minutes.");
      return;
    }
    if (rate60Usd === "" || rate60Usd <= 0) {
      alert("Please enter a valid rate for 60 minutes.");
      return;
    }

    setBusy(true);
    try {
      const cleanLinks = links.filter((l) => l.label.trim() && l.url.trim());

      const payload = {
        displayName,
        email,
        headshotUrl: headshot,
        phone,
        city,
        bio,
        playableAgeMin: Number(playableAgeMin),
        playableAgeMax: Number(playableAgeMax),
        gender,
        rate15Usd: Number(rate15Usd),
        rateUsd: Number(rateUsd),
        rate60Usd: Number(rate60Usd),
        unions,
        languages,
        specialties,
        links: cleanLinks,
      };

      console.log("[onboarding] POST /api/readers payload:", payload);

      const res = await fetch("/api/readers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text().catch(() => "");
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        console.warn("[onboarding] Non-JSON response:", raw.slice(0, 300));
      }

      if (!res.ok || !data?.ok) {
        if (res.status === 409) {
          alert("That email is already registered as a reader. Try a different email.");
        } else {
          const msg = data?.error || `Failed to save (HTTP ${res.status}). ${raw ? raw.slice(0, 200) : ""}`;
          alert(msg);
        }
        return;
      }

      const readerId = data?.readerId || data?.id;
      if (!readerId) {
        alert("Saved, but missing readerId from server response.");
        return;
      }

      window.location.href = `/onboarding/schedule?readerId=${encodeURIComponent(readerId)}`;
      return;
    } catch (err: any) {
      console.error("[onboarding] submit error:", err);
      alert(err?.message || "Unexpected error while saving.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <p>Loading your information...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Quick Reader Onboarding</h1>
      <p className="mb-4 text-sm text-gray-600">
        All fields marked with <span className="text-red-600">*</span> are required. Complete your profile to continue.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Display name</label>
          <input
            className="border rounded px-3 py-2 w-full bg-gray-100"
            value={displayName}
            disabled
            placeholder="Paul Green"
          />
          <p className="text-xs text-gray-500 mt-1">Locked - from your account</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            className="border rounded px-3 py-2 w-full bg-gray-100"
            value={email}
            disabled
            placeholder="paul@example.com"
          />
          <p className="text-xs text-gray-500 mt-1">Locked - from your account</p>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium">Phone <span className="text-red-600">*</span></label>
          <input
            type="tel"
            className="border rounded px-3 py-2 w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Your contact number for booking coordination.</p>
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium">City <span className="text-red-600">*</span></label>
          <input
            type="text"
            className="border rounded px-3 py-2 w-full"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Los Angeles, CA"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Your location helps actors find local readers.</p>
        </div>

        {/* Headshot Upload */}
        <div>
          <label className="block text-sm font-medium">Headshot <span className="text-red-600">*</span></label>
          <input
            type="file"
            accept="image/*"
            onChange={handleHeadshotUpload}
            disabled={uploading}
            className="border rounded px-3 py-2 w-full"
            required
          />
          {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
          {headshot && (
            <div className="mt-2">
              <img src={headshot} alt="Headshot preview" className="w-32 h-32 object-cover rounded" />
              <p className="text-xs text-green-600 mt-1">✓ Uploaded successfully</p>
            </div>
          )}
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium">Bio</label>
          <textarea
            className="border rounded px-3 py-2 w-full"
            rows={4}
            placeholder="Tell actors a bit about yourself and your experience..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">Optional - Share your acting experience, training, or what makes you a great reader.</p>
        </div>

        {/* Playable Age & Gender */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Playable Age Range <span className="text-red-600">*</span></label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={120}
                className="border rounded px-3 py-2 w-20 text-center"
                placeholder="Min"
                value={playableAgeMin}
                onChange={(e) => setPlayableAgeMin(e.target.value === "" ? "" : Number(e.target.value))}
                required
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
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Numbers only — your typical playable age range.</p>
          </div>

          <div>
            <label className="block text-sm font-medium">Gender <span className="text-red-600">*</span></label>
            <select
              name="gender"
              className="w-full rounded-md border px-3 py-2 bg-white"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
            >
              <option value="" disabled>Select gender</option>
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
        <div>
          <label className="block text-sm font-medium">Rate per 15 min (USD) <span className="text-red-600">*</span></label>
          <input
            type="number"
            min={1}
            step={1}
            className="border rounded px-3 py-2 w-full"
            value={rate15Usd}
            onChange={(e) => setRate15Usd(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="15"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Rate per 30 min (USD) <span className="text-red-600">*</span></label>
          <input
            type="number"
            min={1}
            step={1}
            className="border rounded px-3 py-2 w-full"
            value={rateUsd}
            onChange={(e) => setRateUsd(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="25"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Saved as cents in DB (e.g., $25 → 2500).</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Rate per 60 min (USD) <span className="text-red-600">*</span></label>
          <input
            type="number"
            min={1}
            step={1}
            className="border rounded px-3 py-2 w-full"
            value={rate60Usd}
            onChange={(e) => setRate60Usd(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="60"
            required
          />
        </div>

        {/* Unions */}
        <div>
          <label className="block text-sm font-medium">Union <span className="text-red-600">*</span></label>
          <div className="flex flex-wrap gap-2 mt-2">
            {UNION_OPTIONS.map((u) => (
              <label key={u} className="flex items-center gap-2 border rounded px-3 py-2">
                <input
                  type="checkbox"
                  checked={unions.includes(u)}
                  onChange={() => toggleItem(u, setUnions)}
                />
                <span>{u}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div>
          <label className="block text-sm font-medium">Languages <span className="text-red-600">*</span></label>
          <div className="flex flex-wrap gap-2 mt-2">
            {LANGUAGE_OPTIONS.map((l) => (
              <label key={l} className="flex items-center gap-2 border rounded px-3 py-2">
                <input
                  type="checkbox"
                  checked={languages.includes(l)}
                  onChange={() => toggleItem(l, setLanguages)}
                />
                <span>{l}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Specialties */}
        <div>
          <label className="block text-sm font-medium">Specialties <span className="text-red-600">*</span></label>
          <div className="flex flex-wrap gap-2 mt-2">
            {SPECIALTY_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 border rounded px-3 py-2">
                <input
                  type="checkbox"
                  checked={specialties.includes(s)}
                  onChange={() => toggleItem(s, setSpecialties)}
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Links */}
        <div>
          <label className="block text-sm font-medium">Links</label>
          <div className="space-y-3 mt-2">
            {links.map((l, i) => (
              <div key={i} className="grid grid-cols-1 gap-2">
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
                    className="border rounded px-3 py-1"
                    onClick={addLinkRow}
                  >
                    + Add link
                  </button>
                  {links.length > 1 && (
                    <button
                      type="button"
                      className="border rounded px-3 py-1"
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

        {/* Terms */}
        <div className="border-t pt-6 mt-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              required
            />
            <span className="text-sm text-gray-700">
              I agree to the{" "}
              <a href="/terms" target="_blank" className="text-emerald-600 hover:underline">
                Terms of Service
              </a>
              {" "}and{" "}
              <a href="/privacy" target="_blank" className="text-emerald-600 hover:underline">
                Privacy Policy
              </a>
              <span className="text-red-600 ml-1">*</span>
            </span>
          </label>
        </div>

        {/* Skip and Submit buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="border border-gray-300 rounded px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Skip for now
          </button>
          <button
            className="bg-emerald-600 text-white rounded px-4 py-2 hover:bg-emerald-700 disabled:opacity-50 flex-1"
            type="submit"
            disabled={!canSubmit || busy}
            title={!acceptedTerms ? "Please accept the Terms of Service and Privacy Policy" : ""}
          >
            {busy ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
