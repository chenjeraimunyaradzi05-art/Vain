import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | Vantage',
  description: 'Terms of service and conditions for using the Vantage platform.',
};

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content: `By accessing or using Vantage ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.

The Platform is operated by Vantage (Developer: Munyaradzi Chenjerai). We reserve the right to modify these terms at any time. Continued use of the Platform after changes constitutes acceptance of the modified terms.`,
  },
  {
    title: '2. Eligibility',
    content: `To use the Platform, you must:
• Be at least 16 years of age (or have parental/guardian consent)
• Provide accurate and complete registration information
• Maintain the security of your account credentials
• Comply with all applicable laws and regulations

The Platform is designed primarily for Aboriginal and Torres Strait Islander job seekers, but is open to all users who respect our community guidelines and cultural protocols.`,
  },
  {
    title: '3. User Accounts',
    content: `When you create an account, you are responsible for:
• Maintaining the confidentiality of your login credentials
• All activities that occur under your account
• Notifying us immediately of any unauthorised access

We reserve the right to suspend or terminate accounts that violate these terms or our community guidelines.`,
  },
  {
    title: '4. User Roles and Responsibilities',
    content: `**Job Seekers (Members)**
• Provide accurate information in your profile and applications
• Respect employer confidentiality during application processes
• Use the Platform for legitimate employment purposes only

**Employers (Companies)**
• Provide accurate job listing information
• Comply with all employment and anti-discrimination laws
• Maintain genuine Reconciliation Action Plan commitments where stated
• Respond to applications in a timely and respectful manner

**Mentors**
• Provide guidance within your areas of expertise
• Maintain appropriate professional boundaries
• Complete required cultural safety training
• Report any concerns about mentee wellbeing

**Training Providers (TAFE/RTO)**
• Provide accurate course information
• Maintain appropriate accreditations
• Support student success and completion`,
  },
  {
    title: '5. Indigenous Data Sovereignty',
    content: `We are committed to Indigenous Data Sovereignty principles:

**Collective Benefit**: Data collection serves community interests
**Authority to Control**: Users control how their data is used
**Responsibility**: We are accountable for data stewardship
**Ethics**: Data use respects cultural values

You may request:
• Export of all your personal data
• Deletion of your account and associated data
• Opt-out of analytics and research participation
• Restriction of data sharing with third parties

See our Privacy Policy for detailed information on data handling.`,
  },
  {
    title: '6. Acceptable Use',
    content: `You agree NOT to:
• Post false, misleading, or fraudulent content
• Harass, abuse, or discriminate against other users
• Use the Platform for unlawful purposes
• Attempt to access other users' accounts
• Scrape, copy, or redistribute Platform content without permission
• Post content that violates intellectual property rights
• Use automated systems (bots) without authorisation
• Circumvent security measures or access restrictions

Violations may result in immediate account suspension or termination.`,
  },
  {
    title: '7. Content and Intellectual Property',
    content: `**Your Content**: You retain ownership of content you submit (resumes, profiles, posts). By submitting content, you grant us a licence to display, store, and process it for Platform purposes.

**Our Content**: The Platform's design, code, logos, and features are owned by Vantage and protected by intellectual property laws.

**Cultural Content**: We respect Indigenous Cultural and Intellectual Property (ICIP). Users must not share cultural knowledge, designs, or stories without appropriate permissions from Traditional Custodians.`,
  },
  {
    title: '8. Third-Party Services',
    content: `The Platform integrates with third-party services including:
• Stripe (payment processing)
• Firebase (notifications)
• Jitsi Meet (video calls)
• TAFE/RTO systems (course data)

Your use of these services is subject to their respective terms. We are not responsible for third-party service availability or practices.`,
  },
  {
    title: '9. Payments and Subscriptions',
    content: `**Employer Subscriptions**
• Subscription fees are billed in advance
• Refunds are provided on a pro-rata basis for annual plans
• We reserve the right to change pricing with 30 days notice

**Mentor Payments**
• Mentors receive compensation via Stripe Connect
• Payout schedules are subject to Stripe's policies
• Tax obligations are the responsibility of individual mentors

**Course Payments**
• Course fees are paid to training providers via the Platform
• Refund policies are determined by individual providers`,
  },
  {
    title: '10. Disclaimers',
    content: `The Platform is provided "as is" without warranties of any kind. We do not guarantee:
• Employment outcomes or job placements
• Mentor availability or qualifications
• Accuracy of third-party job listings
• Continuous, uninterrupted service availability

We are not an employment agency and do not make hiring decisions. Employment relationships are between job seekers and employers.`,
  },
  {
    title: '11. Limitation of Liability',
    content: `To the maximum extent permitted by law, Vantage is not liable for:
• Indirect, incidental, or consequential damages
• Loss of data, profits, or business opportunities
• Actions of other users or third parties
• Service interruptions or technical issues

Our total liability is limited to fees paid by you in the 12 months preceding the claim.`,
  },
  {
    title: '12. Dispute Resolution',
    content: `We encourage informal resolution of disputes. If a dispute cannot be resolved informally:

1. **Mediation**: Disputes will first be referred to mediation
2. **Arbitration**: If mediation fails, binding arbitration under Australian law
3. **Jurisdiction**: Courts of New South Wales, Australia have exclusive jurisdiction

You agree to waive any right to participate in class action lawsuits against us.`,
  },
  {
    title: '13. Termination',
    content: `**By You**: You may close your account at any time through Settings > Privacy > Delete Account.

**By Us**: We may suspend or terminate accounts for:
• Violation of these Terms or Community Guidelines
• Fraudulent or illegal activity
• Extended inactivity (with prior notice)
• At our discretion with reasonable cause

Upon termination, you may request export of your data within 30 days.`,
  },
  {
    title: '14. Changes to Terms',
    content: `We may update these Terms periodically. Significant changes will be notified via:
• Email to your registered address
• In-app notification
• Banner on the Platform

Continued use after changes take effect constitutes acceptance. If you disagree with changes, you should discontinue use and close your account.`,
  },
  {
    title: '15. Contact Us',
    content: `For questions about these Terms, contact us at:

**Email**: legal@vantageplatform.com
**Mail**: Vantage, [Address to be added]
**Phone**: [Phone to be added]

For urgent safety concerns, contact: safety@vantageplatform.com`,
  },
];

export default function TermsPage() {
  return (
    <div className="vantage-page py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="vantage-h1 mb-4">
            Terms of Service
          </h1>
          <p className="vantage-muted">
            Last updated: {new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Table of Contents */}
        <nav className="vantage-card p-6 mb-12">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Contents</h2>
          <ul className="grid md:grid-cols-2 gap-2">
            {SECTIONS.map((section, i) => (
              <li key={i}>
                <a
                  href={`#section-${i + 1}`}
                  className="text-sm vantage-link hover:underline"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sections */}
        <div className="space-y-12">
          {SECTIONS.map((section, i) => (
            <section key={i} id={`section-${i + 1}`} className="scroll-mt-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 pb-2 vantage-divider">
                {section.title}
              </h2>
              <div className="vantage-text text-sm leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 vantage-divider text-center">
          <p className="vantage-muted text-sm mb-4">
            By using Vantage, you acknowledge that you have read, understood, and agree to these Terms of Service.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/privacy"
              className="text-sm vantage-link"
            >
              Privacy Policy
            </Link>
            <span className="text-slate-400 dark:text-slate-600">|</span>
            <Link
              href="/help"
              className="text-sm vantage-link"
            >
              Help Centre
            </Link>
            <span className="text-slate-400 dark:text-slate-600">|</span>
            <Link
              href="/about"
              className="text-sm vantage-link"
            >
              About Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
