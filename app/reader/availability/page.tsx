
"use client";
import { useState, useEffect, useRef } from "react";
interface User {
  id: string;
  name: string;
  email: string;
  role: 'READER' | 'ADMIN' | 'USER';
  timezone?: string;
}
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CalendarConnection {
  id: string;
  provider: 'GOOGLE' | 'MICROSOFT';
  email: string;
  createdAt: string;
  isActive: boolean;
}

interface AvailabilityTemplate {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  isActive?: boolean;
}

// Common timezone options
const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

export default function ManageAvailabilityPage() {
  // ...user's provided code...
}