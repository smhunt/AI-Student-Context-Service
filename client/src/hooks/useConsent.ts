import { useState, useCallback, useEffect } from 'react';
import {
  getConsentChildren,
  grantConsent as apiGrantConsent,
  revokeConsent as apiRevokeConsent,
  type ConsentChild,
} from '../api/client.js';

export function useConsent() {
  const [children, setChildren] = useState<ConsentChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getConsentChildren();
      setChildren(data.children);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const grant = useCallback(async (studentId: string, sources: string[]) => {
    setActionLoading(true);
    setError(null);
    try {
      await apiGrantConsent(studentId, sources);
      // Reload children to get updated consent status
      await loadChildren();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }, [loadChildren]);

  const revoke = useCallback(async (studentId: string) => {
    setActionLoading(true);
    setError(null);
    try {
      await apiRevokeConsent(studentId);
      // Reload children to get updated consent status
      await loadChildren();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }, [loadChildren]);

  const selectedChild = children.find(c => c.id === selectedChildId) ?? null;

  return {
    children,
    loading,
    error,
    selectedChildId,
    setSelectedChildId,
    selectedChild,
    actionLoading,
    grant,
    revoke,
    loadChildren,
  };
}
