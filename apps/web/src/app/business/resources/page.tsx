import Link from 'next/link';

export default function BusinessResourcesPage() {
  return (
    <div className="ngurra-page py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="ngurra-h1 mb-4">Business Resources</h1>
        <p className="ngurra-muted mb-8">
          Tools and references to support business planning and operations.
        </p>

        <div className="ngurra-card p-6">
          <div className="space-y-3">
            <Link href="/business/plan-builder" className="ngurra-link">
              Business Plan Builder
            </Link>
            <Link href="/business-suite" className="ngurra-link">
              Business Suite
            </Link>
            <Link href="/resources" className="ngurra-link">
              Platform Resources
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
