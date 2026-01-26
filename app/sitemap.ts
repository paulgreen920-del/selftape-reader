import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.selftapereader.com'

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/readers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/tips`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  // Dynamic reader profile pages
  const readers = await prisma.user.findMany({
    where: {
      role: { in: ['READER', 'ADMIN'] },
      isActive: true,
    },
    select: {
      id: true,
      updatedAt: true,
    },
  })

  const readerPages: MetadataRoute.Sitemap = readers.map((reader) => ({
    url: `${baseUrl}/reader/${reader.id}/profile`,
    lastModified: reader.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Dynamic blog post pages
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    select: {
      slug: true,
      updatedAt: true,
    },
  })

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/tips/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...readerPages, ...blogPages]
}