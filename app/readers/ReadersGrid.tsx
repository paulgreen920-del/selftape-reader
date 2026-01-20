'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const GENDERS = ["Male", "Female", "Non-binary", "Transgender", "Other"];
const UNIONS = ["SAG-AFTRA", "AEA", "AGVA", "Non-Union"];
const LANGUAGES = ["English", "Spanish", "French", "Italian", "German", "Mandarin"];
const SPECIALTIES = ["Comedy", "Drama", "Shakespeare", "Musical Theatre", "Improvisation", "Accents"];

type Reader = {
  id: string;
  displayName: string | null;
  name: string;
  email: string;
  headshotUrl: string | null;
  bio: string | null;
  timezone: string | null;
  gender: string | null;
  playableAgeMin: number | null;
  playableAgeMax: number | null;
  unions: any;
  languages: any;
  specialties: any;
  links: any;
  ratePer15Min: number | null;
  ratePer30Min: number | null;
  ratePer60Min: number | null;
  availabilitySlots: any[];
};

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatAgeRange(min: number | null, max: number | null) {
  if (!min && !max) return 'Not specified';
  if (min && max) return `${min}-${max}`;
  if (min) return `${min}+`;
  if (max) return `Up to ${max}`;
  return 'Not specified';
}

function formatArrayField(field: any, fallback = 'Not specified') {
  if (!field) return fallback;
  try {
    const parsed = Array.isArray(field) ? field : JSON.parse(field);
    return parsed.length > 0 ? parsed.join(', ') : fallback;
  } catch {
    return fallback;
  }
}

function formatLinks(linksField: any) {
  if (!linksField) return [];
  try {
    const parsed = Array.isArray(linksField) ? linksField : JSON.parse(linksField);
    return parsed.filter((link: any) => link && (typeof link === 'string' || link.url));
  } catch {
    return [];
  }
}

export default function ReadersGrid({
  readers,
  currentFilters,
}: {
  readers: Reader[];
  currentFilters: any;
}) {
  const router = useRouter();
  
  const [showFilters, setShowFilters] = useState(false);
  
  // Use currentFilters directly instead of local state
  // This ensures the form always reflects the URL parameters
  const filters = {
    gender: currentFilters?.gender || 'all',
    ageMin: currentFilters?.ageMin || '',
    ageMax: currentFilters?.ageMax || '',
    union: currentFilters?.union || 'all',
    language: currentFilters?.language || 'all',
    specialty: currentFilters?.specialty || 'all',
  };
  
  // Local state for form inputs only
  const [formFilters, setFormFilters] = useState(filters);
  
  // Sync form state when URL/currentFilters change
  useEffect(() => {
    console.log('🔄 Syncing form filters:', filters);
    console.log('🔄 Current filters from server:', currentFilters);
    setFormFilters(filters);
  }, [currentFilters]);

  function applyFilters() {
    console.log('🚀 Applying filters:', formFilters);
    const params = new URLSearchParams();
    
    if (formFilters.gender !== 'all') params.set('gender', formFilters.gender);
    if (formFilters.ageMin) params.set('ageMin', formFilters.ageMin);
    if (formFilters.ageMax) params.set('ageMax', formFilters.ageMax);
    if (formFilters.union !== 'all') params.set('union', formFilters.union);
    if (formFilters.language !== 'all') params.set('language', formFilters.language);
    if (formFilters.specialty !== 'all') params.set('specialty', formFilters.specialty);

    const newUrl = `/readers?${params.toString()}`;
    console.log('🚀 Navigating to:', newUrl);
    router.push(newUrl);
  }

  function clearFilters() {
    setFormFilters({
      gender: 'all',
      ageMin: '',
      ageMax: '',
      union: 'all',
      language: 'all',
      specialty: 'all',
    });
    router.push('/readers');
  }

  const hasActiveFilters = 
    filters.gender !== 'all' ||
    filters.ageMin !== '' ||
    filters.ageMax !== '' ||
    filters.union !== 'all' ||
    filters.language !== 'all' ||
    filters.specialty !== 'all';

  // Check authentication status
  async function checkAuthAndRoute(readerId: string) {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        // User is authenticated, route to booking page
        router.push(`/reader/${readerId}`);
      } else {
        // User not authenticated, route to login with redirect parameter
        const redirectUrl = encodeURIComponent(`/reader/${readerId}`);
        router.push(`/login?redirect=${redirectUrl}`);
      }
    } catch (error) {
      // Error checking auth, assume not logged in
      const redirectUrl = encodeURIComponent(`/reader/${readerId}`);
      router.push(`/login?redirect=${redirectUrl}`);
    }
  }

  return (
    <>
      {/* Filter Toggle & Active Filters */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Filter Readers</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Gender */}
            <div>
              <label className="block text-sm font-medium mb-2">Gender</label>
              <select
                value={formFilters.gender}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormFilters({ ...formFilters, gender: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="all">All</option>
                {GENDERS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Playable Age Range */}
            <div>
              <label className="block text-sm font-medium mb-2">Playable Age</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  value={formFilters.ageMin}
                  onChange={(e) => setFormFilters({ ...formFilters, ageMin: e.target.value })}
                  className="w-20 border rounded-lg px-3 py-2"
                  min="0"
                  max="120"
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={formFilters.ageMax}
                  onChange={(e) => setFormFilters({ ...formFilters, ageMax: e.target.value })}
                  className="w-20 border rounded-lg px-3 py-2"
                  min="0"
                  max="120"
                />
              </div>
            </div>

            {/* Union */}
            <div>
              <label className="block text-sm font-medium mb-2">Union Status</label>
              <select
                value={formFilters.union}
                onChange={(e) => setFormFilters({ ...formFilters, union: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="all">All</option>
                {UNIONS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select
                value={formFilters.language}
                onChange={(e) => setFormFilters({ ...formFilters, language: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="all">All</option>
                {LANGUAGES.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Specialty */}
            <div>
              <label className="block text-sm font-medium mb-2">Specialty</label>
              <select
                value={formFilters.specialty}
                onChange={(e) => setFormFilters({ ...formFilters, specialty: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="all">All</option>
                {SPECIALTIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={applyFilters}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {readers.length} reader{readers.length !== 1 ? 's' : ''}
      </div>

      {/* Readers Grid */}
      {readers.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-lg mb-2">No readers match your filters</p>
          <p className="text-sm text-muted-foreground mb-4">
            Try adjusting your filters to see more results
          </p>
          <button
            onClick={clearFilters}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {readers.map((r) => (
            <li
              key={r.id}
              className="group rounded-2xl border p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-muted grid place-items-center text-lg font-semibold">
                  {r.headshotUrl ? (
                    <img
                      src={r.headshotUrl}
                      alt={r.displayName || r.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (r.displayName || r.name)
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold">
                    {r.displayName || r.name}
                  </h2>
                  <p className="truncate text-sm text-muted-foreground">
                    {r.email}
                  </p>
                </div>
              </div>

              {r.bio ? (
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {r.bio}
                </p>
              ) : null}

              {/* Profile Information Grid */}
              <div className="mt-4 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/60 p-3">
                    <div className="text-xs text-muted-foreground">Gender</div>
                    <div className="font-medium">{r.gender || "Not specified"}</div>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-3">
                    <div className="text-xs text-muted-foreground">Age Range</div>
                    <div className="font-medium">{formatAgeRange(r.playableAgeMin, r.playableAgeMax)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/60 p-3">
                    <div className="text-xs text-muted-foreground">Union Status</div>
                    <div className="font-medium">{formatArrayField(r.unions)}</div>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-3">
                    <div className="text-xs text-muted-foreground">Specialties</div>
                    <div className="font-medium">{formatArrayField(r.specialties)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {r.languages && (
                    <div className="rounded-xl bg-muted/60 p-3">
                      <div className="text-xs text-muted-foreground">Languages</div>
                      <div className="font-medium">{formatArrayField(r.languages)}</div>
                    </div>
                  )}
                  
                  {formatLinks(r.links).length > 0 && (
                  <div className="rounded-xl bg-muted/60 p-3">
                    <div className="text-xs text-muted-foreground">Links</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formatLinks(r.links).map((link: any, index: number) => {
                        const url = typeof link === 'string' ? link : link.url;
                        const label = typeof link === 'string' ? 'Link' : (link.label || 'Link');
                        
                        return (
                          <a
                            key={index}
                            href={url.startsWith('http') ? url : `https://${url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md border text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            {label}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
                </div>
              </div>

              <div className="mt-4 rounded-xl border p-3">
                <div className="text-xs text-muted-foreground mb-1">Rates</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium">
                    15m: {formatCents(r.ratePer15Min || 1500)}
                  </span>
                  <span className="font-medium">
                    30m: {formatCents(r.ratePer30Min || 2500)}
                  </span>
                  <span className="font-medium">
                    60m: {formatCents(r.ratePer60Min || 6000)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 space-y-2">
                <button
                  onClick={() => checkAuthAndRoute(r.id)}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-white font-semibold transition hover:bg-emerald-700"
                >
                  Book {r.displayName || r.name}
                </button>
                <Link
                  href={`/reader/${r.id}/profile`}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium transition hover:bg-gray-50"
                >
                  View Full Profile
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}