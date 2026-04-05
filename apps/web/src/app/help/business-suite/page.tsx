import Link from 'next/link';

export default function BusinessSuiteHelpPage() {
  return (
    <div className="ngurra-page py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="ngurra-h1 mb-4">Business Suite Help</h1>
        <p className="ngurra-muted mb-8">
          Guides and FAQs for Accounting, Cashbook, and Invoicing.
        </p>

        <div className="ngurra-card p-6">
          <div className="space-y-3">
            <Link href="/business-suite" className="ngurra-link">
              Back to Business Suite
            </Link>
            <Link href="/help" className="ngurra-link">
              Help Centre
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
