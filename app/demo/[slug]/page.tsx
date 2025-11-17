'use client';

import { useParams } from 'next/navigation';

export default function DemoPage() {
  const params = useParams<{ slug: string }>();
  return (
    <main className="p-8">
      <h1>demo/[slug] ok — slug: {params?.slug ?? '(none)'}</h1>
      <pre>params: {JSON.stringify(params)}</pre>
    </main>
  );
}
