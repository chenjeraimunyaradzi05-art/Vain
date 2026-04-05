'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';

/**
 * Elder Verification UI Component
 * Handles the verification process for Elders in the community
 */
export default function ElderVerification({ userId }) {
    const { user } = useAuth();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Form state
    const [formData, setFormData] = useState({
        communityName: '',
        mobNation: '',
        verifierName: '',
        verifierContact: '',
        statement: '',
        additionalInfo: '',
    });
    
    // Fetch current verification status
    const fetchStatus = useCallback(async () => {
        try {
            const { ok, data } = await api('/badges/elder-verification/status');
            
            if (!ok) throw new Error('Failed to fetch status');
            
            setStatus(data.verification);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);
    
    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        
        try {
            const { ok, data, error: apiError } = await api('/badges/elder-verification/submit', {
                method: 'POST',
                body: formData,
            });
            
            if (!ok) {
                throw new Error(apiError || 'Submission failed');
            }
            
            setSuccess('Verification request submitted successfully. We will contact your community verifier.');
            await fetchStatus();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    // Already verified
    if (status?.status === 'approved') {
        return (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <div className="bg-green-100 rounded-full p-3">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-green-900">Elder Status Verified</h3>
                        <p className="text-green-700 mt-1">
                            Your Elder status has been verified by the community.
                        </p>
                        <p className="text-green-600 text-sm mt-2">
                            Verified: {new Date(status.verifiedAt).toLocaleDateString()}
                        </p>
                        {status.communityName && (
                            <p className="text-green-600 text-sm">
                                Community: {status.communityName}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    
    // Pending verification
    if (status?.status === 'pending') {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <div className="bg-yellow-100 rounded-full p-3">
                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-yellow-900">Verification Pending</h3>
                        <p className="text-yellow-700 mt-1">
                            Your Elder verification request is being reviewed.
                        </p>
                        <p className="text-yellow-600 text-sm mt-2">
                            Submitted: {new Date(status.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-yellow-600 text-sm">
                            We will contact your community verifier to confirm your status.
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    
    // Rejected - can resubmit
    if (status?.status === 'rejected') {
        return (
            <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-red-100 rounded-full p-3">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-red-900">Verification Not Approved</h3>
                            <p className="text-red-700 mt-1">
                                Your previous verification request was not approved.
                            </p>
                            {status.rejectionReason && (
                                <p className="text-red-600 text-sm mt-2">
                                    Reason: {status.rejectionReason}
                                </p>
                            )}
                            <p className="text-red-600 text-sm mt-2">
                                You can submit a new request below with updated information.
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Show form for resubmission */}
                <VerificationForm 
                    formData={formData}
                    handleChange={handleChange}
                    handleSubmit={handleSubmit}
                    submitting={submitting}
                    error={error}
                    success={success}
                />
            </div>
        );
    }
    
    // No verification - show form
    return (
        <div className="space-y-6">
            <div className="bg-ochre-50 border border-ochre-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-ochre-900">Elder Verification</h3>
                <p className="text-ochre-700 mt-2">
                    Elder verification recognizes your standing in your community. Once verified, 
                    you'll receive an Elder badge on your profile and access to Elder-specific features.
                </p>
                <p className="text-ochre-600 text-sm mt-2">
                    This process involves confirmation from a community member who can vouch for your Elder status.
                </p>
            </div>
            
            <VerificationForm 
                formData={formData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                submitting={submitting}
                error={error}
                success={success}
            />
        </div>
    );
}

/**
 * Verification form component
 */
function VerificationForm({ formData, handleChange, handleSubmit, submitting, error, success }) {
    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
            <h4 className="text-lg font-semibold text-gray-900">Request Verification</h4>
            
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Community/Region Name *
                    </label>
                    <input
                        type="text"
                        name="communityName"
                        value={formData.communityName}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g., Redfern, Sydney"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mob/Nation *
                    </label>
                    <input
                        type="text"
                        name="mobNation"
                        value={formData.mobNation}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g., Noongar, Wiradjuri"
                    />
                </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Community Verifier Name *
                    </label>
                    <input
                        type="text"
                        name="verifierName"
                        value={formData.verifierName}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Name of person who can verify your status"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        A community member, organization leader, or other Elder who can confirm your status.
                    </p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Verifier Contact *
                    </label>
                    <input
                        type="text"
                        name="verifierContact"
                        value={formData.verifierContact}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Email or phone number"
                    />
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statement *
                </label>
                <textarea
                    name="statement"
                    value={formData.statement}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Please share about your role as an Elder in your community..."
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Information (Optional)
                </label>
                <textarea
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Any other information that may help with verification..."
                />
            </div>
            
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Submitting...' : 'Submit Verification Request'}
                </button>
            </div>
        </form>
    );
}
