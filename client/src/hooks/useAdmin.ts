import { useState, useCallback, useEffect } from 'react';
import {
  getAdminDashboard,
  getAdminAudit,
  getAdminUsers,
  type AdminStats,
  type AuditEntry,
  type AdminUser,
} from '../api/client.js';

export type AdminTab = 'overview' | 'audit' | 'users';

export function useAdmin() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDashboard();
      setStats(data.stats);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async (filters?: {
    action?: string;
    limit?: number;
    offset?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminAudit({
        limit: filters?.limit ?? 20,
        offset: filters?.offset ?? 0,
        action: filters?.action,
      });
      setAuditEntries(data.entries);
      setAuditTotal(data.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async (filters?: {
    role?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers({
        limit: filters?.limit ?? 20,
        offset: filters?.offset ?? 0,
        role: filters?.role,
        search: filters?.search,
      });
      setUsers(data.users);
      setUsersTotal(data.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load dashboard on mount
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    stats,
    auditEntries,
    auditTotal,
    users,
    usersTotal,
    loading,
    error,
    activeTab,
    setActiveTab,
    loadDashboard,
    loadAudit,
    loadUsers,
  };
}
