import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Calendar,
  Globe,
  Sparkles,
  BookOpen,
  Info,
  Clock,
  ArrowRight
} from 'lucide-react';
import { api, type NotificationItem } from '../api/client';

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch {
      // Graceful fallback if offline or backend rebooting
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll every 60 seconds for fresh updates
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // optimistic update fallback
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleClearAll = async () => {
    try {
      setLoading(true);
      await api.clearNotifications();
      setNotifications([]);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      try {
        await api.markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      } catch {
        // ignore
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'deadline':
        return <Calendar className="h-4 w-4 text-amber-600" />;
      case 'portal':
        return <Globe className="h-4 w-4 text-blue-600" />;
      case 'agent':
        return <Sparkles className="h-4 w-4 text-purple-600" />;
      case 'quiz':
        return <BookOpen className="h-4 w-4 text-rose-600" />;
      default:
        return <Info className="h-4 w-4 text-primary-600" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'deadline':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'portal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'agent':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'quiz':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary-500"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-gray-900">Notifications</span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  {unreadCount} new
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                  0 new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center transition cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="divide-y divide-gray-100 overflow-y-auto max-h-[380px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="h-10 w-10 mx-auto rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mb-2">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-gray-800">All caught up!</p>
                <p className="text-xs text-gray-500 mt-0.5">No notifications right now.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 flex items-start space-x-3 transition cursor-pointer hover:bg-gray-50 ${
                    !notif.read ? 'bg-primary-50/30' : 'bg-white'
                  }`}
                >
                  {/* Icon */}
                  <div className="p-2 rounded-xl bg-gray-100/80 flex-shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getBadgeColor(
                          notif.type
                        )}`}
                      >
                        {notif.type}
                      </span>
                      <span className="text-[11px] text-gray-400 flex items-center flex-shrink-0">
                        <Clock className="h-3 w-3 mr-0.5" />
                        {formatTimestamp(notif.created_at)}
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-semibold mt-1 truncate ${
                        !notif.read ? 'text-gray-900 font-bold' : 'text-gray-700'
                      }`}
                    >
                      {notif.title}
                    </h4>

                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.link && (
                      <span className="inline-flex items-center text-[11px] font-semibold text-primary-600 mt-1 hover:underline">
                        View details
                        <ArrowRight className="h-2.5 w-2.5 ml-1" />
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-center space-y-1 flex-shrink-0 ml-1">
                    {!notif.read && (
                      <button
                        onClick={(e) => handleMarkAsRead(e, notif.id)}
                        className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                      title="Dismiss"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
              <button
                onClick={handleClearAll}
                className="text-gray-500 hover:text-red-600 transition px-2 py-1 rounded font-medium"
              >
                Clear all
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/assignments');
                }}
                className="text-primary-600 hover:text-primary-700 font-semibold px-2 py-1 rounded"
              >
                View Deadlines →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
