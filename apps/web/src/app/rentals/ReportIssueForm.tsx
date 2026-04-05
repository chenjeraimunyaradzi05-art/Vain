import { useState } from "react";

export default function ReportIssueForm({ issue, onClose }: { issue: any; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!desc.trim()) {
      setError("Description is required.");
      return;
    }
    setSubmitting(true);
    try {
      // Simulate API call
      await new Promise((res) => setTimeout(res, 1000));
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit} aria-describedby="report-modal-desc">
      <input
        type="text"
        placeholder="Your Name (optional)"
        className="w-full px-4 py-2 rounded-xl text-white bg-white/10 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
        value={name}
        onChange={e => setName(e.target.value)}
        aria-label="Your Name"
      />
      <input
        type="email"
        placeholder="Your Email (optional)"
        className="w-full px-4 py-2 rounded-xl text-white bg-white/10 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
        value={email}
        onChange={e => setEmail(e.target.value)}
        aria-label="Your Email"
      />
      <textarea
        placeholder="Describe the issue... (required)"
        rows={4}
        className="w-full px-4 py-2 rounded-xl text-white bg-white/10 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/50"
        value={desc}
        onChange={e => setDesc(e.target.value)}
        aria-label="Describe the issue"
        required
      />
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {success && <div className="text-emerald-400 text-sm">Report submitted! Thank you.</div>}
      <button
        type="submit"
        className="w-full py-2 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-60"
        style={{background: 'linear-gradient(135deg, #8B5CF6, #E91E8C)'}}
        disabled={submitting}
        aria-busy={submitting}
      >
        {submitting ? "Submitting..." : "Submit Report"}
      </button>
    </form>
  );
}
