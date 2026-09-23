import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { LEGAL_DOCUMENTS, legalDocument } from '@/lib/legal';
import { pageMetadata } from '@/lib/metadata';

export function generateStaticParams() {
  return LEGAL_DOCUMENTS.map((document) => ({ slug: document.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const document = legalDocument(slug);
  if (!document) return { title: 'Not found', robots: { index: false, follow: true } };

  return pageMetadata({
    title: document.title,
    description: document.summary,
    path: `/legal/${document.slug}`,
  });
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const document = legalDocument(slug);
  if (!document) notFound();

  return <LegalDocumentView document={document} />;
}
