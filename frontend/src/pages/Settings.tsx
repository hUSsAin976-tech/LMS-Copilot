import { useState, useEffect } from 'react';
import {
  User,
  Database,
  ShieldCheck,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Key,
  ExternalLink,
  Globe,
  Cpu
} from 'lucide-react';
import { api } from '../api/client';
import type { SettingsData, FreeApisGuide } from '../api/client';
import { Link } from 'react-router-dom';

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Gemini API Key config
  const [apiKey, setApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{ valid?: boolean; message?: string } | null>(null);
  const [freeApisGuide, setFreeApisGuide] = useState<FreeApisGuide | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [data, guide] = await Promise.all([
        api.getSettings(),
        api.getFreeApisGuide().catch(() => null),
      ]);
      setSettings(data);
      setName(data.user_name);
      setTimezone(data.timezone);
      if (guide) setFreeApisGuide(guide);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateSettings({ user_name: name, timezone });
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      await fetchSettings();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    try {
      setSavingKey(true);
      setKeyStatus(null);
      const res = await api.configureGeminiKey(apiKey);
      setKeyStatus({ valid: res.test.valid, message: res.test.message });
      if (res.test.valid) {
        setMessage({ type: 'success', text: 'Gemini API key configured and validated successfully!' });
      } else {
        setMessage({ type: 'error', text: res.test.message });
      }
      await fetchSettings();
    } catch (err: unknown) {
      setKeyStatus({ valid: false, message: err instanceof Error ? err.message : 'Configuration failed' });
    } finally {
      setSavingKey(false);
    }
  };

  const handleSyncLMS = async () => {
    try {
      setSyncing(true);
      setMessage(null);
      await api.syncPortalRealtime();
      setMessage({ type: 'success', text: 'Real-time portal data synchronized successfully!' });
      await fetchSettings();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const handleResetDemoData = async () => {
    if (!window.confirm('Are you sure you want to clear local cache? This will wipe your generated drafts and traces, allowing a clean re-sync from your LMS/AMS portal.')) {
      return;
    }
    try {
      setResetting(true);
      setMessage(null);
      await api.resetDemoData();
      setMessage({ type: 'success', text: 'Local cache cleared. Fresh LMS/AMS portal synchronization ready.' });
      await fetchSettings();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Reset failed' });
    } finally {
      setResetting(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-gray-200">
        <RefreshCw className="h-8 w-8 text-primary-600 animate-spin mb-3" />
        <p className="text-gray-500 font-medium text-sm">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Application Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your student profile, API keys, AI model providers, and LMS portal integrations.
          </p>
        </div>

        <Link
          to="/portal"
          className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition shadow-xs"
        >
          <Globe className="h-4 w-4 mr-1.5 text-blue-600" />
          Open LMS Portal Window
        </Link>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. AI Model API Keys & Free APIs Guide */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-purple-600" />
            <h2 className="text-base font-bold text-gray-900">AI Model API & Free Tier Providers</h2>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
              freeApisGuide?.current_status.gemini_configured
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {freeApisGuide?.current_status.mode || 'Heuristic / Offline Mode'}
          </span>
        </div>

        {/* Free API providers cards */}
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Rahnuma AI runs with 100% free AI models. We recommend getting a free <strong>Google AI Studio Gemini API Key</strong> for live reasoning and embeddings:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 bg-purple-50/50 border-2 border-purple-200 rounded-xl space-y-2 relative">
              <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-purple-600 text-white rounded">
                Recommended
              </span>
              <h4 className="text-xs font-bold text-purple-900">1. Google AI Studio</h4>
              <p className="text-[11px] text-purple-700">
                <strong>Gemini 2.0 Flash & text-embedding-004</strong>
              </p>
              <p className="text-[11px] text-gray-600 leading-snug">
                100% Free: 15 RPM, 1,500 requests/day, free vector embeddings.
              </p>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-[11px] font-bold text-purple-700 hover:text-purple-900 pt-1"
              >
                Get Free Gemini Key (30s) <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-gray-900">2. Groq Cloud</h4>
              <p className="text-[11px] text-gray-700">
                <strong>Llama 3.3 70B & Gemma 2 9B</strong>
              </p>
              <p className="text-[11px] text-gray-600 leading-snug">
                100% Free: Blazing fast LPUs, zero credit card required.
              </p>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-[11px] font-bold text-primary-600 hover:text-primary-700 pt-1"
              >
                Get Free Groq Key <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-gray-900">3. OpenRouter Free Tier</h4>
              <p className="text-[11px] text-gray-700">
                <strong>Llama 3.2, DeepSeek R1 (:free)</strong>
              </p>
              <p className="text-[11px] text-gray-600 leading-snug">
                Free open-weight access with generous rate limits.
              </p>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-[11px] font-bold text-primary-600 hover:text-primary-700 pt-1"
              >
                Get Free OpenRouter Key <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          </div>
        </div>

        {/* Enter API Key Form */}
        <form onSubmit={handleSaveApiKey} className="pt-2 border-t border-gray-100 space-y-3">
          <label className="block text-xs font-bold text-gray-800">
            Configure Google Gemini API Key:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Key className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                placeholder="AIzaSy... (Paste your free Gemini key here)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-primary-500 bg-gray-50 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={savingKey || !apiKey.trim()}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              {savingKey ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <span>Test & Save API Key</span>
              )}
            </button>
          </div>

          {keyStatus && (
            <p className={`text-xs font-semibold ${keyStatus.valid ? 'text-emerald-700' : 'text-red-600'}`}>
              {keyStatus.valid ? '✓ ' : '❌ '} {keyStatus.message}
            </p>
          )}
        </form>
      </div>

      {/* 2. Student Profile */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
          <User className="h-5 w-5 text-primary-600" />
          <h2 className="text-base font-bold text-gray-900">Student Profile & Academic Timezone</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Student Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={settings?.email || ''}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-xs bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Academic Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. LMS Integration Manager */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">LMS / AMS Real-Time Sync (Fahmly)</h2>
          </div>
          <Link
            to="/portal"
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center"
          >
            Launch Portal Window <Globe className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-gray-900">
                FAST-NUCES Flex / University AMS
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                Connected
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Read-only synchronization of courses, assignments, rubrics, and materials.
            </p>
            {settings?.last_sync && (
              <p className="text-[11px] text-gray-400 mt-0.5">
                Last synchronized: {new Date(settings.last_sync).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={handleSyncLMS}
              disabled={syncing}
              className="inline-flex items-center px-3.5 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 shadow-xs transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin text-primary-600' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync LMS Now'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Data Protection & Academic Integrity */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-bold text-gray-900">Data Protection & Privacy Safeguards</h2>
        </div>

        <div className="text-xs text-gray-600 space-y-2 leading-relaxed">
          <p>
            • <strong>Read-Only Access:</strong> Fahmly only ingests read-only course data. It can never submit assignments without human interaction.
          </p>
          <p>
            • <strong>Human-in-the-Loop Confirmation:</strong> Extracted deliverables, deadlines, and staged drafts must be manually verified.
          </p>
          <p>
            • <strong>Minimal Storage:</strong> Only necessary course metadata and chunked embeddings are stored.
          </p>
        </div>

        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-red-900">Clear Local Student Cache</h3>
            <p className="text-[11px] text-gray-500">
              Wipes local drafts and cached records, triggering fresh real-time portal synchronization.
            </p>
          </div>

          <button
            onClick={handleResetDemoData}
            disabled={resetting}
            className="inline-flex items-center px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded-xl transition disabled:opacity-50 flex-shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {resetting ? 'Clearing...' : 'Clear Local Cache'}
          </button>
        </div>
      </div>
    </div>
  );
}
