'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Sparkles, Mail, Phone, MessageSquare, Video } from 'lucide-react';

// Feminine theme constants
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

const CONTACT_METHODS = [
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Get help via email within 24-48 hours',
    action: 'support@vantageplatform.com',
    href: 'mailto:support@vantageplatform.com',
    linkText: 'Send Email',
  },
  {
    icon: MessageSquare,
    title: 'Community Forum',
    description: 'Ask questions and connect with other users',
    action: 'Visit Forums',
    href: '/community/forums',
    linkText: 'Browse Forums',
  },
  {
    icon: Phone,
    title: 'Phone Support',
    description: 'Mon-Fri, 9am-5pm AEST',
    action: '1800 XXX XXX',
    href: 'tel:1800000000',
    linkText: 'Call Now',
  },
  {
    icon: Video,
    title: 'Book a Call',
    description: 'Schedule a video call with our team',
    action: 'Schedule',
    href: '/help',
    linkText: 'Book Meeting',
  },
];

const DEPARTMENTS = [
  { value: 'general', label: 'General Enquiry' },
  { value: 'support', label: 'Technical Support' },
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'employer', label: 'Employer Services' },
  { value: 'mentorship', label: 'Mentorship Program' },
  { value: 'training', label: 'Training & Courses' },
  { value: 'accessibility', label: 'Accessibility Feedback' },
  { value: 'partnership', label: 'Partnership Enquiry' },
  { value: 'media', label: 'Media & Press' },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'general',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Failed to send message. Please try again.');
      }

      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        department: 'general',
        subject: '',
        message: '',
      });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ngurra-page py-12 px-6">
      {/* Decorative Halos */}
      <div className="ngurra-halos">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-pink-600" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-600">
              Get in Touch
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
            Contact Us
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Have a question, feedback, or need assistance? We're here to help. 
            Choose your preferred contact method below.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {CONTACT_METHODS.map((method, i) => {
            const Icon = method.icon;
            return (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl p-6 text-center hover:border-pink-300 transition-colors"
                style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}
              >
                <div className="p-3 rounded-xl bg-pink-50 inline-block mb-4">
                  <Icon className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">{method.title}</h3>
                <p className="text-slate-500 text-sm mb-4">{method.description}</p>
                <Link
                  href={method.href}
                  className="inline-flex items-center gap-1 text-sm text-pink-600 hover:text-pink-700 font-medium"
                >
                  {method.linkText}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Contact Form */}
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-8" style={{ boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)' }}>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Send a Message</h2>

            {submitted ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Message Sent!</h3>
                <p className="text-slate-600 mb-6">
                  Thank you for contacting us. We'll respond within 24-48 hours.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="text-pink-600 hover:text-pink-700"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 transition-all"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="department" className="block text-xs font-semibold uppercase tracking-[0.15em] text-purple-600 mb-2">
                    Department
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 transition-all"
                    placeholder="Brief description of your enquiry"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs font-semibold uppercase tracking-[0.15em] text-pink-600 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-pink-100 focus:border-pink-500 transition-all resize-y"
                    placeholder="How can we help you?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full text-white font-medium rounded-lg py-3 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ 
                    background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                    boxShadow: '0 4px 12px rgba(233, 30, 140, 0.3)'
                  }}
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          {/* Info Panel */}
          <div className="space-y-8">
            {/* Office Info */}
            <div className="bg-white border border-slate-200 rounded-xl p-6" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Office Location</h3>
              <div className="space-y-3 text-slate-600 text-sm">
                <p>
                  <span className="text-slate-400">Address:</span><br />
                  Level 1, 123 Innovation Way<br />
                  Sydney NSW 2000, Australia
                </p>
                <p>
                  <span className="text-slate-400">Business Hours:</span><br />
                  Monday - Friday: 9:00 AM - 5:00 PM AEST<br />
                  Saturday - Sunday: Closed
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white border border-slate-200 rounded-xl p-6" style={{ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' }}>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/help" className="text-pink-600 hover:text-pink-700 text-sm">
                    📚 Help Centre & FAQs
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-pink-600 hover:text-pink-700 text-sm">
                    🔒 Privacy & Data Sovereignty
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-pink-600 hover:text-pink-700 text-sm">
                    📜 Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="text-pink-600 hover:text-pink-700 text-sm">
                    ℹ️ About Vantage
                  </Link>
                </li>
              </ul>
            </div>

            {/* Emergency */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-amber-700 mb-3">⚠️ Urgent Safety Concerns</h3>
              <p className="text-slate-600 text-sm mb-3">
                If you have concerns about user safety, inappropriate content, or require immediate assistance:
              </p>
              <a
                href="mailto:safety@vantageplatform.com"
                className="text-amber-700 hover:text-amber-800 font-medium text-sm"
              >
                safety@vantageplatform.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
