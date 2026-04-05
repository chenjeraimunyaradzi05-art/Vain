'use client';

import api from '@/lib/apiClient';
/**
 * Bulk Import Page
 */

import { useState } from 'react';
import Link from 'next/link';
export default function NewImportPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  
  const [importType, setImportType] = useState('jobs');
  const [csvData, setCsvData] = useState('');
  const [fileName, setFileName] = useState('');

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvData(event.target?.result);
    };
    reader.readAsText(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!csvData) {
      setError('Please upload a CSV file');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const res = await api(`/bulk-import/${importType}`, {
        method: 'POST',
        body: { csvData, fileName },
      });

      if (!res.ok) throw new Error(res.data?.error || res.error || 'Failed to start import');

      setResult(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-5xl mb-4">📤</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">
              Import Started
            </h1>
            <p className="text-gray-600 mb-4">
              Your import is being processed.
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-6 text-left">
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Import ID:</dt>
                  <dd className="font-mono">{result.importId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Total Rows:</dt>
                  <dd>{result.totalRows}</dd>
                </div>
              </dl>
            </div>
            <Link
              href="/dashboard/company/integrations"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Integrations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Bulk Import</h1>
          <Link
            href="/dashboard/company/integrations"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Import Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What are you importing?
            </label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'jobs', label: 'Jobs', icon: '💼', desc: 'Job listings' },
                { id: 'candidates', label: 'Candidates', icon: '👥', desc: 'Member profiles' },
                { id: 'courses', label: 'Courses', icon: '📚', desc: 'Training courses' }
              ].map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setImportType(type.id)}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    importType === type.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="font-semibold">{type.label}</div>
                  <div className="text-xs text-gray-500">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Template Download */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Download Template</h4>
            <p className="text-sm text-blue-700 mb-3">
              Use our CSV template to ensure your data is formatted correctly.
            </p>
            <a
              href={`/api/bulk-import/templates/${importType}`}
              download={`${importType}-template.csv`}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              📄 Download {importType} Template
            </a>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload CSV File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                {fileName ? (
                  <div>
                    <div className="text-2xl mb-2">📄</div>
                    <div className="font-medium">{fileName}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Click to choose a different file
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl mb-2">📤</div>
                    <div className="font-medium text-gray-700">
                      Click to upload CSV
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Maximum 1,000 rows per import
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Preview */}
          {csvData && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preview (first 5 lines)
              </label>
              <pre className="bg-gray-100 p-3 rounded-lg text-xs overflow-x-auto max-h-40">
                {csvData.split('\n').slice(0, 5).join('\n')}
              </pre>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !csvData}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting Import...' : 'Start Import'}
            </button>
            <Link
              href="/dashboard/company/integrations"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
