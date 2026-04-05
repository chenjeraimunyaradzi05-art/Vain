import { Eye, Keyboard, Monitor, Volume2, FileText, Mail, Settings, Check } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Accessibility Statement - Vantage',
  description: 'Our commitment to making Vantage accessible to all users.',
};

export default function AccessibilityPage() {
  const features = [
    {
      icon: Keyboard,
      title: 'Keyboard Navigation',
      description: 'Full keyboard accessibility for all interactive elements. Use Tab to navigate and Enter/Space to activate.',
    },
    {
      icon: Eye,
      title: 'Screen Reader Support',
      description: 'Semantic HTML and ARIA labels ensure compatibility with screen readers like NVDA, JAWS, and VoiceOver.',
    },
    {
      icon: Monitor,
      title: 'Responsive Design',
      description: 'Our site works on all devices and screen sizes, with support for zoom up to 400%.',
    },
    {
      icon: Volume2,
      title: 'Reduced Motion',
      description: 'Animations respect the "prefers-reduced-motion" setting in your browser or operating system.',
    },
  ];

  const standards = [
    'WCAG 2.1 Level AA compliance',
    'Semantic HTML5 structure',
    'Sufficient color contrast (4.5:1 minimum)',
    'Focus indicators on all interactive elements',
    'Skip navigation links',
    'Alt text on all images',
    'Form labels and error messages',
    'Consistent navigation patterns',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Accessibility Statement</h1>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          We believe technology should be accessible to everyone. Vantage 
          is committed to providing an inclusive experience for all users.
        </p>
      </div>

      {/* Our Commitment */}
      <section className="mb-12">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Our Commitment
          </h2>
          <p className="text-slate-300 mb-4">
            Vantage is committed to ensuring digital accessibility for people with disabilities. 
            We are continually improving the user experience for everyone and applying the relevant 
            accessibility standards to ensure we provide equal access to all users.
          </p>
          <p className="text-slate-300">
            Our platform is designed following the Web Content Accessibility Guidelines (WCAG) 2.1 
            at the AA level. These guidelines explain how to make web content more accessible to 
            people with a wide range of disabilities.
          </p>
        </div>
      </section>

      {/* Accessibility Features */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-6">Accessibility Features</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-5"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-600/20 rounded-lg flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Standards We Follow */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-6">Standards We Follow</h2>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <ul className="grid md:grid-cols-2 gap-3">
            {standards.map((standard) => (
              <li key={standard} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{standard}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Customization */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Customization Options
        </h2>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <p className="text-slate-300 mb-4">
            You can customize your experience through your device or browser settings:
          </p>
          <ul className="space-y-3 text-slate-300">
            <li>• <strong>Text size:</strong> Use browser zoom (Ctrl/Cmd + Plus/Minus)</li>
            <li>• <strong>High contrast:</strong> Enable in your OS accessibility settings</li>
            <li>• <strong>Reduced motion:</strong> Enable in your OS or browser preferences</li>
            <li>• <strong>Screen reader:</strong> Compatible with popular screen readers</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              Visit our <Link href="/settings/appearance" className="text-blue-400 hover:underline">
              appearance settings</Link> to customize your on-site preferences.
            </p>
          </div>
        </div>
      </section>

      {/* Known Issues */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-6">Known Issues & Roadmap</h2>
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-6">
          <p className="text-slate-300 mb-4">
            We are actively working to improve accessibility across all areas of our platform. 
            Current areas of focus include:
          </p>
          <ul className="space-y-2 text-slate-300 mb-4">
            <li>• Enhanced video player controls and captions</li>
            <li>• Improved data visualization accessibility</li>
            <li>• Additional language support for screen readers</li>
          </ul>
          <p className="text-sm text-slate-400">
            If you encounter any accessibility barriers, please contact us and we will 
            prioritize addressing your concern.
          </p>
        </div>
      </section>

      {/* Feedback */}
      <section>
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-400" />
          Feedback & Assistance
        </h2>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <p className="text-slate-300 mb-4">
            We welcome your feedback on the accessibility of Vantage. 
            If you encounter any barriers or have suggestions for improvement, please let us know:
          </p>
          <ul className="space-y-2 text-slate-300 mb-6">
            <li>• <strong>Email:</strong> <a href="mailto:accessibility@vantageplatform.com" className="text-blue-400 hover:underline">accessibility@vantageplatform.com</a></li>
            <li>• <strong>Contact form:</strong> <Link href="/contact" className="text-blue-400 hover:underline">Submit a message</Link></li>
          </ul>
          <p className="text-sm text-slate-400">
            We aim to respond to accessibility feedback within 2 business days and to 
            resolve issues as quickly as possible.
          </p>
        </div>
      </section>

      {/* Last updated */}
      <div className="mt-12 pt-6 border-t border-slate-800 text-center">
        <p className="text-sm text-slate-500">
          This accessibility statement was last updated in January 2025.
        </p>
      </div>
    </div>
  );
}
