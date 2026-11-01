import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Printer,
  Download,
  Upload,
  AlertCircle,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { WeddingPlan } from '../../types/plan';
import { formatFamilySummaryText, validateImportedPlanJson } from '../../lib/summaryFormatter';

interface FamilySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: WeddingPlan;
  onImportPlan: (importedPlan: WeddingPlan) => void;
}

export const FamilySummaryModal: React.FC<FamilySummaryModalProps> = ({
  isOpen,
  onClose,
  plan,
  onImportPlan,
}) => {
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const summaryText = formatFamilySummaryText(plan, todayStr);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = summaryText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadBackup = () => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const sanitizedCity = plan.city.toLowerCase().replace(/[^a-z0-9]/g, '-');
    a.download = `celebration-plan-${sanitizedCity}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = validateImportedPlanJson(content);
      if (result.ok) {
        onImportPlan(result.plan);
        setImportSuccess(`Loaded plan: "${result.plan.title}"`);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setImportError(result.error);
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file from disk.');
    };
    reader.readAsText(file);

    // Reset input value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="family-summary-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn print:hidden"
    >
      <div className="relative w-full max-w-3xl glass-panel rounded-2xl border border-stone-800 bg-stone-900 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
              <Share2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="family-summary-title" className="text-base font-serif font-bold text-stone-100">
                Share & Export Celebration Summary
              </h2>
              <p className="text-xs text-stone-400">
                Send plain-text briefs to family WhatsApp, print PDF summaries, or back up full JSON plans.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close family summary modal"
            className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Action 1: Copy WhatsApp Brief */}
          <button
            type="button"
            onClick={handleCopyText}
            aria-label="Copy plain text summary for WhatsApp"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-gold-500 hover:bg-gold-400 text-stone-950 font-bold'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                <span>Copy WhatsApp Brief</span>
              </>
            )}
          </button>

          {/* Action 2: Print / Save as PDF */}
          <button
            type="button"
            onClick={handlePrint}
            aria-label="Print or save as PDF"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-all"
          >
            <Printer className="w-4 h-4 text-stone-300" aria-hidden="true" />
            <span>Print / Save PDF</span>
          </button>

          {/* Action 3: Download JSON Backup */}
          <button
            type="button"
            onClick={handleDownloadBackup}
            aria-label="Download full celebration plan as JSON backup file"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-all"
          >
            <Download className="w-4 h-4 text-stone-300" aria-hidden="true" />
            <span>Download Plan (.json)</span>
          </button>

          {/* Action 4: Import JSON Backup */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import celebration plan from JSON file"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition-all"
          >
            <Upload className="w-4 h-4 text-stone-300" aria-hidden="true" />
            <span>Import Plan (.json)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            className="hidden"
            aria-label="Upload plan JSON file"
          />
        </div>

        {/* Feedback Banners */}
        {importError && (
          <div className="m-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="font-semibold block">Import Validation Failed:</strong>
              <span>{importError}</span>
            </div>
          </div>
        )}

        {importSuccess && (
          <div className="m-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>{importSuccess}</span>
          </div>
        )}

        {/* Live Formatted Text Preview */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <div className="flex items-center gap-1.5 font-semibold text-stone-300">
              <FileText className="w-4 h-4 text-gold-400" aria-hidden="true" />
              <span>WhatsApp & Text Brief Preview</span>
            </div>
            <span className="text-[11px] text-stone-500 font-mono">
              Ready to paste in family groups
            </span>
          </div>

          <div className="relative rounded-xl bg-stone-950 border border-stone-800 p-4 font-mono text-xs text-stone-300 leading-relaxed overflow-x-auto whitespace-pre selection:bg-gold-500 selection:text-stone-950">
            {summaryText}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-950/80 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400 shrink-0">
          <span className="flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
            Non-destructive: imported plans are verified against all 8 core categories.
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
