"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Upload, ShieldCheck, User, Mail, Phone, Building2, FileText } from "lucide-react";

export default function ApplyAgentPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    licenseNumber: "",
    type: "agent",
    specializations: "",
    credentials: null as File | null,
    about: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as any;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setStep(2), 1200); // Simulate review
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-gray-900 py-12 px-4">
      <div className="w-full max-w-xl rounded-2xl p-8 shadow-lg" style={{background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(10px)"}}>
        {step === 1 && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              <h1 className="text-2xl font-bold text-white">Apply for Agent/Broker Verification</h1>
            </div>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Full Name *</label>
                  <input name="name" required value={form.name} onChange={handleChange} className="w-full px-4 py-3 rounded-xl text-white bg-white/10 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="e.g. Sarah Williams" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Email *</label>
                  <input name="email" type="email" required value={form.email} onChange={handleChange} className="w-full px-4 py-3 rounded-xl text-white bg-white/10 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="e.g. sarah@email.com" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Phone *</label>
                  <input name="phone" required value={form.phone} onChange={handleChange} className="w-full px-4 py-3 rounded-xl text-white bg-white/10 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="e.g. 0412 345 678" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Company *</label>
                  <input name="company" required value={form.company} onChange={handleChange} className="w-full px-4 py-3 rounded-xl text-white bg-white/10 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="e.g. First Nations Realty" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">License Number *</label>
                  <input name="licenseNumber" required value={form.licenseNumber} onChange={handleChange} className="w-full px-4 py-3 rounded-xl text-white bg-white/10 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="e.g. NSW12345" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Type *</label>
                  <select name="type" value={form.type} onChange={handleChange} className="w-full px-4 py-3 rounded-xl text-white bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option value="agent">Real Estate Agent</option>
                    <option value="broker">Mortgage Broker</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Specializations</label>
                <input name="specializations" value={form.specializations} onChange={handleChange} className="w-full px-4 py-3 rounded-xl text-white bg-white/10 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="e.g. Residential, Indigenous Housing" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Upload Credentials (PDF, JPG, PNG)</label>
                <input name="credentials" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleChange} className="w-full px-4 py-3 rounded-xl text-white bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">About You</label>
                <textarea name="about" value={form.about} onChange={handleChange} rows={3} className="w-full px-4 py-3 rounded-xl text-white bg-white/10 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Tell us about your experience, community involvement, and why you want to join." />
              </div>
              <button type="submit" className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]" style={{background: "linear-gradient(135deg, #8B5CF6, #E91E8C)", boxShadow: "0 4px 15px rgba(139, 92, 246, 0.3)"}}>
                Submit Application
              </button>
            </form>
          </>
        )}
        {step === 2 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6" style={{background: "rgba(16,185,129,0.15)"}}>
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
            <p className="text-gray-300 mb-4">Our team will review your details and contact you within 2 business days.</p>
            <Link href="/rentals" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]" style={{background: "linear-gradient(135deg, #8B5CF6, #E91E8C)"}}>
              <ShieldCheck className="w-4 h-4" />
              Back to Rentals
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
