'use client';

/**
 * Admin Email Templates Page
 * 
 * Visual editor for managing email templates with live preview.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  ChevronLeft,
  Save,
  Eye,
  Send,
  Code,
  FileText,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Palette,
  Variable,
} from 'lucide-react';
import api from '@/lib/apiClient';
import { useUIStore } from '@/stores/uiStore';

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  category: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
  isActive: boolean;
  version: number;
}

export default function EmailTemplatesPage() {
  const router = useRouter();
  const { showToast } = useUIStore();
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [editMode, setEditMode] = useState<'html' | 'text'>('html');
  const [testEmail, setTestEmail] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const { ok, data } = await api<{ templates: EmailTemplate[] }>('/admin/email-templates');
      if (ok && data) {
        setTemplates(data.templates || []);
        if (data.templates?.length > 0 && !selectedTemplate) {
          setSelectedTemplate(data.templates[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSelectTemplate = async (template: EmailTemplate) => {
    setSelectedTemplate(template);
    await loadPreview(template.slug);
  };

  const loadPreview = async (slug: string) => {
    try {
      const { ok, data } = await api<{ html: string }>(`/admin/email-templates/${slug}/preview`, {
        method: 'POST',
        body: {},
      });
      if (ok && data) {
        setPreviewHtml(data.html);
      }
    } catch (err) {
      console.error('Failed to load preview:', err);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setIsSaving(true);
    try {
      const { ok } = await api(`/admin/email-templates/${selectedTemplate.slug}`, {
        method: 'PUT',
        body: {
          name: selectedTemplate.name,
          subject: selectedTemplate.subject,
          htmlTemplate: selectedTemplate.htmlTemplate,
          textTemplate: selectedTemplate.textTemplate,
          variables: selectedTemplate.variables,
          isActive: selectedTemplate.isActive,
        },
      });

      if (ok) {
        showToast({
          type: 'success',
          title: 'Saved',
          message: 'Template saved successfully',
        });
        await loadPreview(selectedTemplate.slug);
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save template',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!selectedTemplate || !testEmail) return;

    try {
      const { ok } = await api(`/admin/email-templates/${selectedTemplate.slug}/send-test`, {
        method: 'POST',
        body: { toEmail: testEmail },
      });

      if (ok) {
        showToast({
          type: 'success',
          title: 'Sent',
          message: `Test email sent to ${testEmail}`,
        });
        setShowTestModal(false);
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to send test email',
      });
    }
  };

  const updateTemplate = (field: keyof EmailTemplate, value: any) => {
    if (!selectedTemplate) return;
    setSelectedTemplate({ ...selectedTemplate, [field]: value });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      onboarding: 'bg-green-900/50 text-green-400',
      security: 'bg-red-900/50 text-red-400',
      billing: 'bg-yellow-900/50 text-yellow-400',
      jobs: 'bg-blue-900/50 text-blue-400',
      mentorship: 'bg-purple-900/50 text-purple-400',
    };
    return colors[category] || 'bg-slate-700 text-slate-300';
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar - Template List */}
      <div className="w-72 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-2 text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-white">Email Templates</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-4 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
            </div>
          ) : (
            templates.map((template) => (
              <button
                key={template.slug}
                onClick={() => handleSelectTemplate(template)}
                className={`w-full p-3 rounded-lg text-left mb-1 transition-colors ${
                  selectedTemplate?.slug === template.slug
                    ? 'bg-purple-600 text-white'
                    : 'hover:bg-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4" />
                  <span className="font-medium text-sm">{template.name}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(template.category)}`}>
                  {template.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedTemplate ? (
          <>
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedTemplate.name}</h2>
                  <p className="text-sm text-slate-400">
                    Version {selectedTemplate.version} • {selectedTemplate.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTestModal(true)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Test
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    viewMode === 'edit'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Code className="w-4 h-4 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setViewMode('preview');
                    loadPreview(selectedTemplate.slug);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    viewMode === 'preview'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Eye className="w-4 h-4 inline mr-1" />
                  Preview
                </button>
              </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {viewMode === 'edit' ? (
                <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                  {/* Subject Line */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={selectedTemplate.subject}
                      onChange={(e) => updateTemplate('subject', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>

                  {/* Variables */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Variable className="w-4 h-4 inline mr-1" />
                      Available Variables
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables?.map((v) => (
                        <span
                          key={v}
                          className="px-2 py-1 text-xs bg-slate-700 text-purple-300 rounded font-mono cursor-pointer hover:bg-slate-600"
                          onClick={() => {
                            navigator.clipboard.writeText(`{{${v}}}`);
                            showToast({ type: 'info', title: 'Copied', message: `{{${v}}} copied to clipboard` });
                          }}
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* HTML/Text Toggle */}
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setEditMode('html')}
                      className={`px-3 py-1 rounded text-sm ${
                        editMode === 'html'
                          ? 'bg-slate-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      HTML
                    </button>
                    <button
                      onClick={() => setEditMode('text')}
                      className={`px-3 py-1 rounded text-sm ${
                        editMode === 'text'
                          ? 'bg-slate-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Plain Text
                    </button>
                  </div>

                  {/* Editor */}
                  <div className="flex-1">
                    <textarea
                      value={editMode === 'html' ? selectedTemplate.htmlTemplate : selectedTemplate.textTemplate}
                      onChange={(e) =>
                        updateTemplate(
                          editMode === 'html' ? 'htmlTemplate' : 'textTemplate',
                          e.target.value
                        )
                      }
                      className="w-full h-full min-h-[400px] px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 font-mono text-sm resize-none"
                      spellCheck={false}
                    />
                  </div>
                </div>
              ) : (
                /* Preview */
                <div className="flex-1 bg-slate-700 p-6 overflow-y-auto">
                  <div className="max-w-2xl mx-auto bg-white rounded-lg overflow-hidden shadow-xl">
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-[600px] border-0"
                      title="Email Preview"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Mail className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Select a template to edit</p>
            </div>
          </div>
        )}
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Send Test Email</h3>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Send Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
