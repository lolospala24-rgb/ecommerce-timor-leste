'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';

export interface WebsiteAudit {
  id: number;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt: string | null;
  completedAt: string | null;
  overallScore: number | null;
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  securityScore: number | null;
  device: string;
  baseUrl: string;
  auditEngineVersion: string;
  scoreVersion: string;
  errorMessage: string | null;
  createdAt: string;
  rating?: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' | null;
  issueCounts?: Record<string, number>;
  targets?: AuditTarget[];
}

export interface AuditTarget {
  id: number;
  url: string;
  route: string;
  pageType: string;
  durationMs: number | null;
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
}

export interface AuditIssue {
  id: number;
  auditId: number;
  targetId: number | null;
  category: 'PERFORMANCE' | 'ACCESSIBILITY' | 'BEST_PRACTICES' | 'SEO' | 'SECURITY';
  ruleId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  title: string;
  description: string;
  impact: string | null;
  recommendation: string;
  affectedUrl: string | null;
  selector: string | null;
  evidence: string | null;
  documentationUrl: string | null;
  createdAt: string;
}

export interface AuditMetric {
  id: number;
  targetId: number | null;
  category: string;
  metricName: string;
  value: number;
  unit: string;
  rating: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' | null;
}

export interface WebsiteHealthSettings {
  baseUrl: string;
  weightPerformance: number;
  weightAccessibility: number;
  weightBestPractices: number;
  weightSeo: number;
  weightSecurity: number;
  defaultScope: string[];
  timeoutSeconds: number;
  retentionDays: number;
}

export interface AuditProgressEvent {
  auditId: number;
  phase: 'starting' | 'running' | 'completed' | 'failed';
  message: string;
  completed: number;
  total: number;
}

export function useAuditList(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['website-health', 'audits', page, limit],
    queryFn: async () => {
      const response = await api.get(`/website-health/audits?page=${page}&limit=${limit}`);
      return response.data as { data: WebsiteAudit[]; pagination: any };
    },
  });
}

export function useAuditDetail(id: number | null) {
  return useQuery({
    queryKey: ['website-health', 'audits', id],
    queryFn: async () => {
      const response = await api.get(`/website-health/audits/${id}`);
      return unwrapApiData<WebsiteAudit>(response.data);
    },
    enabled: !!id,
    // Keep polling while the audit is still in flight — the socket
    // listener also drives live updates, but polling is the safe fallback
    // if a browser tab reconnects mid-audit (spec §30).
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'RUNNING' || status === 'QUEUED' ? 4000 : false;
    },
  });
}

export function useAuditIssues(
  id: number | null,
  filters: { category?: string; severity?: string; status?: string; search?: string; page?: number },
) {
  return useQuery({
    queryKey: ['website-health', 'audits', id, 'issues', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      const response = await api.get(`/website-health/audits/${id}/issues?${params.toString()}`);
      return response.data as { data: AuditIssue[]; pagination: any };
    },
    enabled: !!id,
  });
}

export function useAuditMetrics(id: number | null) {
  return useQuery({
    queryKey: ['website-health', 'audits', id, 'metrics'],
    queryFn: async () => {
      const response = await api.get(`/website-health/audits/${id}/metrics`);
      return unwrapApiData<AuditMetric[]>(response.data);
    },
    enabled: !!id,
  });
}

export function useWebsiteHealthHistory(limit = 30) {
  return useQuery({
    queryKey: ['website-health', 'history', limit],
    queryFn: async () => {
      const response = await api.get(`/website-health/history?limit=${limit}`);
      return unwrapApiData<WebsiteAudit[]>(response.data);
    },
  });
}

export function useWebsiteHealthSettings() {
  return useQuery({
    queryKey: ['website-health', 'settings'],
    queryFn: async () => {
      const response = await api.get('/website-health/settings');
      return unwrapApiData<WebsiteHealthSettings>(response.data);
    },
  });
}

export function useTargetTemplates() {
  return useQuery({
    queryKey: ['website-health', 'target-templates'],
    queryFn: async () => {
      const response = await api.get('/website-health/target-templates');
      return unwrapApiData<{ id: string; label: string; pageType: string }[]>(response.data);
    },
    staleTime: Infinity,
  });
}

export function useStartAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { scope?: string[]; device?: 'mobile' | 'desktop' }) => {
      const response = await api.post('/website-health/audits', payload);
      return unwrapApiData<WebsiteAudit>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-health', 'audits'] });
      toast.success('Audit started');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start audit');
    },
  });
}

export function useCancelAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/website-health/audits/${id}/cancel`);
      return unwrapApiData<WebsiteAudit>(response.data);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['website-health', 'audits', id] });
      toast.success('Audit cancelled');
    },
  });
}

export function useRetryAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/website-health/audits/${id}/retry`);
      return unwrapApiData<WebsiteAudit>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-health', 'audits'] });
      toast.success('Audit restarted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to retry audit');
    },
  });
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ issueId, status }: { issueId: number; status: 'OPEN' | 'RESOLVED' | 'IGNORED' }) => {
      const response = await api.patch(`/website-health/issues/${issueId}`, { status });
      return unwrapApiData<AuditIssue>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-health'] });
    },
  });
}

export function useUpdateWebsiteHealthSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<WebsiteHealthSettings>) => {
      const response = await api.put('/website-health/settings', payload);
      return unwrapApiData<WebsiteHealthSettings>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-health', 'settings'] });
      toast.success('Settings updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    },
  });
}

// Reuses the existing authenticated NotificationsGateway socket (the same
// one order-tracking/live-tracking already connect to) rather than a new
// connection — see backend's website-health.service.ts emitProgress.
export function useAuditProgress(auditId: number | null, onEvent?: (event: AuditProgressEvent) => void) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!auditId) return;
    const socket = getSocket();

    const handler = (event: AuditProgressEvent) => {
      if (event.auditId !== auditId) return;
      onEvent?.(event);
      if (event.phase === 'completed' || event.phase === 'failed') {
        queryClient.invalidateQueries({ queryKey: ['website-health', 'audits', auditId] });
        queryClient.invalidateQueries({ queryKey: ['website-health', 'history'] });
      }
    };

    socket.on('website-health:progress', handler);
    return () => {
      socket.off('website-health:progress', handler);
    };
  }, [auditId, onEvent, queryClient]);
}
