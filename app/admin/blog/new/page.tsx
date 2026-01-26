'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewBlogPostPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    imageUrl: '',
    published: false,
    scheduledAt: '',
  });

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function handleTitleChange(title: string) {
    setForm({
      ...form,
      title,
      slug: form.slug || generateSlug(title),
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.ok) {
        setForm({ ...form, imageUrl: data.url });
      } else {
        setError(data.error || 'Failed to upload image');
      }
    } catch (err) {
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      };

      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (data.ok) {
        router.push('/admin/blog');
      } else {
        setError(data.error || 'Failed to create post');
      }
    } catch (err) {
      setError('Failed to create post');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/blog" className="text-blue-600 hover:underline text-sm">
          ← Back to Posts
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8">New Post</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="How to Find a Reader for Your Self Tape"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Slug *
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 text-sm mr-2">/tips/</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="how-to-find-a-reader"
                required
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Excerpt (for SEO & previews)
            </label>
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="A short summary that appears in search results..."
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Featured Image
            </label>
            <div className="space-y-3">
              {form.imageUrl && (
                <div className="relative">
                  <img 
                    src={form.imageUrl} 
                    alt="Preview" 
                    className="max-h-40 rounded-lg"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, imageUrl: '' })}
                    className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                    id="image-upload"
                  />
                  <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 cursor-pointer text-center text-sm">
                    {uploading ? 'Uploading...' : form.imageUrl ? 'Replace Image' : 'Upload Image'}
                  </div>
                </label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  placeholder="Or paste image URL"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content * (Markdown supported)
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={15}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm"
              placeholder="Write your post content here..."
              required
            />
          </div>

          {/* Publishing Options */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Publishing
            </label>
            
            <div className="space-y-3">
              {/* Publish Now */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="publishType"
                  checked={form.published && !form.scheduledAt}
                  onChange={() => setForm({ ...form, published: true, scheduledAt: '' })}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Publish immediately</div>
                  <div className="text-xs text-gray-500">Post will be visible right away</div>
                </div>
              </label>

              {/* Schedule */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="publishType"
                  checked={!!form.scheduledAt}
                  onChange={() => setForm({ ...form, published: false, scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16) })}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Schedule for later</div>
                  <div className="text-xs text-gray-500 mb-2">Post will be published automatically at the scheduled time</div>
                  {form.scheduledAt && (
                    <input
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  )}
                </div>
              </label>

              {/* Draft */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="publishType"
                  checked={!form.published && !form.scheduledAt}
                  onChange={() => setForm({ ...form, published: false, scheduledAt: '' })}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Save as draft</div>
                  <div className="text-xs text-gray-500">Post will not be visible until published</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create Post'}
          </button>
          <Link
            href="/admin/blog"
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
