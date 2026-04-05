'use client';

import { Shield, Users, Heart, AlertTriangle, CheckCircle } from 'lucide-react';

export default function GuidelinesPage() {
  return (
    <div className="vantage-page py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="vantage-h1 mb-4">Community Guidelines</h1>
          <p className="text-xl max-w-2xl mx-auto vantage-text">
            Building a supportive, respectful, and productive community for everyone on Vantage.
          </p>
        </div>

        {/* Our Values */}
        <section className="mb-12">
          <div className="vantage-card p-8">
            <h2 className="vantage-h2 mb-6 flex items-center gap-2">
              <Heart className="w-6 h-6 text-pink-500" />
              Our Values
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">Respect & Inclusion</h3>
                  <p className="vantage-text text-sm">
                    Treat everyone with dignity and respect. We welcome people from all backgrounds and experiences.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">Support & Encouragement</h3>
                  <p className="vantage-text text-sm">
                    Help others succeed. Share knowledge, offer guidance, and celebrate achievements.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">Professionalism</h3>
                  <p className="vantage-text text-sm">
                    Maintain professional conduct in all interactions. This is a platform for growth and opportunity.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">Safety & Privacy</h3>
                  <p className="vantage-text text-sm">
                    Protect personal information and create a safe environment for all users.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Code of Conduct */}
        <section className="mb-12">
          <div className="vantage-card p-8">
            <h2 className="vantage-h2 mb-6 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-500" />
              Code of Conduct
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3 text-lg">✅ Do</h3>
                <ul className="space-y-2 vantage-text">
                  <li>Be constructive and helpful in your communications</li>
                  <li>Share relevant experiences and insights</li>
                  <li>Respect different opinions and perspectives</li>
                  <li>Report inappropriate behavior to moderators</li>
                  <li>Keep personal information private</li>
                  <li>Follow all applicable laws and regulations</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3 text-lg">❌ Don't</h3>
                <ul className="space-y-2 vantage-text">
                  <li>Share false or misleading information</li>
                  <li>Discriminate or harass others</li>
                  <li>Spam or promote unrelated services</li>
                  <li>Share others' personal information without consent</li>
                  <li>Attempt to exploit or scam other users</li>
                  <li>Post inappropriate or offensive content</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Reporting */}
        <section className="mb-12">
          <div className="vantage-card p-8">
            <h2 className="vantage-h2 mb-6 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              Reporting Issues
            </h2>
            
            <div className="space-y-4 vantage-text">
              <p>
                If you encounter inappropriate behavior or content, please report it immediately. 
                We take all reports seriously and will investigate promptly.
              </p>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                <h3 className="font-semibold mb-3">How to Report:</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Use the report button on posts or messages</li>
                  <li>• Email: <a href="mailto:safety@vantageplatform.com" className="vantage-link">safety@vantageplatform.com</a></li>
                  <li>• Include relevant screenshots or details</li>
                  <li>• We'll respond within 24 hours</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Enforcement */}
        <section className="mb-12">
          <div className="vantage-card p-8">
            <h2 className="vantage-h2 mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-500" />
              Enforcement
            </h2>
            
            <div className="space-y-4 vantage-text">
              <p>
                We reserve the right to take appropriate action for violations of these guidelines, including:
              </p>
              
              <ul className="space-y-2">
                <li>• Warning or temporary suspension</li>
                <li>• Content removal</li>
                <li>• Permanent account termination</li>
                <li>• Reporting to authorities if illegal activity is involved</li>
              </ul>
              
              <p className="mt-4">
                Decisions are made by our moderation team based on the severity and frequency of violations.
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="text-center">
          <div className="vantage-card p-8">
            <h2 className="vantage-h2 mb-4">Questions?</h2>
            <p className="vantage-text mb-6">
              If you have questions about these guidelines or need clarification, please reach out.
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="mailto:support@vantageplatform.com"
                className="vantage-btn-primary px-6 py-3"
              >
                Contact Support
              </a>
              <a
                href="/help"
                className="vantage-btn-secondary px-6 py-3"
              >
                Visit Help Center
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
