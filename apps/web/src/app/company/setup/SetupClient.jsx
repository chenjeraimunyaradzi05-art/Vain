"use client";
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, Globe, Phone, MapPin, Mail, FileText, CheckCircle, ChevronRight } from 'lucide-react';
import useAuth from '../../../hooks/useAuth';
import api from '@/lib/apiClient';

const INDUSTRIES = [
    'Mining & Resources',
    'Construction',
    'Healthcare',
    'Education',
    'Government',
    'Retail & Hospitality',
    'Manufacturing',
    'Agriculture',
    'Professional Services',
    'Technology',
    'Transport & Logistics',
    'Not for Profit',
    'Other',
];

const STATES = [
    { code: 'NSW', name: 'New South Wales' },
    { code: 'VIC', name: 'Victoria' },
    { code: 'QLD', name: 'Queensland' },
    { code: 'WA', name: 'Western Australia' },
    { code: 'SA', name: 'South Australia' },
    { code: 'TAS', name: 'Tasmania' },
    { code: 'NT', name: 'Northern Territory' },
    { code: 'ACT', name: 'Australian Capital Territory' },
];

export default function SetupClient() {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [companyName, setCompanyName] = useState('');
    const [abn, setAbn] = useState('');
    const [industry, setIndustry] = useState('');
    const [description, setDescription] = useState('');
    const [website, setWebsite] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [stateVal, setStateVal] = useState('');
    const [postcode, setPostcode] = useState('');
    const [phone, setPhone] = useState('');
    const [hrEmail, setHrEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [selectedTier, setSelectedTier] = useState(null);
    
    // Read tier from URL params (from pricing page flow)
    useEffect(() => {
        const tierParam = searchParams?.get('tier');
        if (tierParam) {
            setSelectedTier(tierParam);
        }
    }, [searchParams]);
    const [error, setError] = useState(null);
    
    // Load existing profile
    useEffect(() => {
      async function loadProfile() {
        if (!isAuthenticated) return setLoadingProfile(false);
        try {
          const { ok, data } = await api('/company/profile');
          if (ok) {
            const p = data?.profile;
            if (p) {
              setCompanyName(p.companyName || '');
              setAbn(p.abn || '');
              setIndustry(p.industry || '');
              setDescription(p.description || '');
              setWebsite(p.website || '');
              setAddress(p.address || '');
              setCity(p.city || '');
              setStateVal(p.state || '');
              setPostcode(p.postcode || '');
              setPhone(p.phone || '');
              setHrEmail(p.hrEmail || '');
            }
          }
        } catch (err) {
          // ignore
        } finally {
          setLoadingProfile(false);
        }
      }
      loadProfile();
    }, [isAuthenticated]);

    useEffect(() => {
      if (!authLoading && !isAuthenticated)
        router.push('/');
    }, [authLoading, isAuthenticated, router]);

    // Calculate completion percentage
    const fields = [companyName, industry, description, website, phone, hrEmail, city, stateVal];
    const filledFields = fields.filter(f => f && f.trim()).length;
    const completionPercent = Math.round((filledFields / fields.length) * 100);

    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        if (!companyName || !industry)
            return setError('Company name and industry are required');
        try {
          setLoading(true);
          const { ok, data, error: apiError } = await api('/company/profile', {
            method: 'POST',
            body: { companyName, abn, industry, description, website, address, city, state: stateVal, postcode, phone, hrEmail },
          });
          if (!ok)
            throw new Error(apiError || 'Save failed');
            // If a paid tier was selected from pricing, redirect to subscription page
            if (selectedTier && selectedTier !== 'FREE') {
                router.push(`/company/subscription?tier=${selectedTier}`);
            } else {
                router.push('/company/dashboard');
            }
        }
        catch (err) {
            setError(err.message || 'Save failed');
        }
        finally {
            setLoading(false);
        }
    }

    if (loadingProfile) {
        return (
            <div className="max-w-3xl mx-auto py-12 px-4">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-slate-800 rounded w-48"></div>
                    <div className="h-96 bg-slate-800 rounded"></div>
                </div>
            </div>
        );
    }

    return (<div className="max-w-3xl mx-auto py-12 px-4">
      <Link href="/company/dashboard" className="text-blue-300 hover:text-blue-200 text-sm mb-4 inline-flex items-center gap-1">
        ← Company dashboard
      </Link>
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-400" />
            Company Profile
          </h2>
          <p className="text-sm text-slate-400 mt-1">Set up your company to start posting jobs</p>
        </div>
        
        {/* Completion indicator */}
        <div className="text-right">
          <div className="text-sm text-slate-400">Profile completion</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${completionPercent >= 75 ? 'bg-green-500' : completionPercent >= 50 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${completionPercent >= 75 ? 'text-green-400' : 'text-slate-300'}`}>
              {completionPercent}%
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="bg-slate-900/40 border border-slate-800 p-6 rounded-lg space-y-6">
        {error && (
          <div className="text-red-200 bg-red-950/40 border border-red-900/60 p-3 rounded-lg flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4" /> Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-slate-200">Company name <span className="text-red-400">*</span></span>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Acme Mining Pty Ltd" className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100 placeholder:text-slate-500"/>
            </label>

            <label className="block">
              <span className="text-sm text-slate-200">ABN</span>
              <input value={abn} onChange={(e) => setAbn(e.target.value)} placeholder="e.g. 12 345 678 901" className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100 placeholder:text-slate-500"/>
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-slate-200">Industry <span className="text-red-400">*</span></span>
            <select 
              value={industry} 
              onChange={(e) => setIndustry(e.target.value)} 
              className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100"
            >
              <option value="">Select an industry...</option>
              {INDUSTRIES.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-slate-200">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell candidates about your company, culture, and commitment to Indigenous employment…" className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100 placeholder:text-slate-500 h-24"/>
          </label>
        </div>

        {/* Contact Section */}
        <div className="space-y-4 border-t border-slate-800 pt-6">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Phone className="w-4 h-4" /> Contact Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-slate-200 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Website
              </span>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} type="url" placeholder="https://yourcompany.com.au" className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100 placeholder:text-slate-500"/>
            </label>

            <label className="block">
              <span className="text-sm text-slate-200 flex items-center gap-1">
                <Mail className="w-3 h-3" /> HR Email
              </span>
              <input value={hrEmail} onChange={(e) => setHrEmail(e.target.value)} type="email" placeholder="hr@company.com.au" className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100 placeholder:text-slate-500"/>
            </label>

            <label className="block">
              <span className="text-sm text-slate-200 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 07 1234 5678" className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100 placeholder:text-slate-500"/>
            </label>
          </div>
        </div>

        {/* Location Section */}
        <div className="space-y-4 border-t border-slate-800 pt-6">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Location
          </h3>
          
          <label className="block">
            <span className="text-sm text-slate-200">Street Address</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main Street" className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100 placeholder:text-slate-500"/>
          </label>

          <div className="grid grid-cols-3 gap-4">
            <label className="block">
              <span className="text-sm text-slate-200">City</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Brisbane" className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100 placeholder:text-slate-500"/>
            </label>
            <label className="block">
              <span className="text-sm text-slate-200">State</span>
              <select 
                value={stateVal} 
                onChange={(e) => setStateVal(e.target.value)} 
                className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100"
              >
                <option value="">Select...</option>
                {STATES.map(s => (
                  <option key={s.code} value={s.code}>{s.code}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-slate-200">Postcode</span>
              <input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="4000" className="w-full mt-1 border border-slate-700 bg-slate-950/40 px-3 py-2 rounded text-slate-100 placeholder:text-slate-500"/>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center border-t border-slate-800 pt-6">
          <Link href="/company/dashboard" className="text-sm text-slate-400 hover:text-white">
            Skip for now
          </Link>
          <button 
            type="submit" 
            disabled={loading} 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Saving...' : (
              <>
                Save & Continue
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>);
}
