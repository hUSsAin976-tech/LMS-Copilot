import { useState, useEffect, useCallback } from 'react';
import { api, type NotificationItem } from '../api/client';

export function useNotifications(pollIntervalMs: number = 60000) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    if (pollIntervalMs > 0) {
      const interval = setInterval(fetchNotifications, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, pollIntervalMs]);

  const markAsRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const clearAll = async () => {
    try {
      await api.clearNotifications();
      setNotifications([]);
    } catch {
      setNotifications([]);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
