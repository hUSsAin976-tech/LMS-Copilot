import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Sparkles, RefreshCw, Globe, LogOut } from 'lucide-react';
import { api } from '../api/client';
import NotificationDropdown from './NotificationDropdown';

export default function TopNav({ setSidebarOpen }: { setSidebarOpen: (val: boolean) => void }) {
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; student_id?: string; portal_name?: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('rahnuma_user');
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const handleQuickSync = async () => {
    try {
      setSyncing(true);
      await api.syncPortalRealtime();
      window.location.reload();
    } catch {
      alert('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    navigate('/');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ST';

  return (
    <header className="relative z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
      <button
        type="button"
        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex-1 px-4 sm:px-6 flex justify-between items-center">
        {/* Left Side Status */}
        <div className="flex items-center space-x-3">
          <Link
            to="/portal"
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition shadow-xs"
          >
            <Globe className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
            <span className="truncate max-w-[150px] sm:max-w-[220px]">
              {user?.portal_name || 'AMS Portal Active'}
            </span>
          </Link>
          <button
            onClick={handleQuickSync}
            disabled={syncing}
            className="text-xs text-gray-600 hover:text-primary-600 font-semibold flex items-center transition px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
            title="Trigger real-time LMS/AMS sync"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin text-primary-600' : ''}`} />
            {syncing ? 'Syncing...' : 'Real-Time Sync'}
          </button>
        </div>

        {/* Right Side Shortcuts */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Link
            to="/portal"
            className="hidden sm:inline-flex items-center px-3 py-1.5 border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition"
          >
            <Globe className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
            Portal Window
          </Link>
          <Link
            to="/coach"
            className="hidden sm:inline-flex items-center px-3 py-1.5 border border-primary-200 bg-primary-50 text-primary-700 text-xs font-semibold rounded-lg hover:bg-primary-100 transition"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 text-primary-600" />
            Ask Coach
          </Link>

          {/* Interactive Notifications Bell & Dropdown */}
          <NotificationDropdown />

          {/* Student Profile Badge */}
          <Link
            to="/settings"
            className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-bold text-gray-900 block leading-tight">
                {user?.name || 'Logged-In Student'}
              </span>
              <span className="text-[10px] text-gray-500 block leading-tight">
                {user?.student_id || user?.email || 'Live Session'}
              </span>
            </div>
          </Link>

          {/* Logout / Switch LMS button */}
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Disconnect & Switch LMS / AMS Account"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
