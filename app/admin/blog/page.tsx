'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  imageUrl: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      const res = await fetch('/api/admin/blog');
      const data = await res.json();
      if (data.ok) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function togglePublish(post: BlogPost) {
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !post.published }),
      });
      const data = await res.json();
      if (data.ok) {
        loadPosts();
      }
    } catch (err) {
      console.error('Failed to toggle publish:', err);
    }
  }

  async function deletePost(post: BlogPost) {
    if (!confirm(`Are you sure you want to delete "${post.title}"?`)) return;
    
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.ok) {
        loadPosts();
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  }

  if (loading) {
    return <div className="p-8">Loading posts...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Self Tape Tips</h1>
        <Link
          href="/admin/blog/new"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          + New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No posts yet. Create your first one!
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{post.title}</div>
                    {post.excerpt && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {post.excerpt}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    /tips/{post.slug}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        post.published
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {post.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => togglePublish(post)}
                      className="text-emerald-600 hover:text-emerald-800 text-sm"
                    >
                      {post.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => deletePost(post)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                    {post.published && (
                      <Link
                        href={`/tips/${post.slug}`}
                        target="_blank"
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
