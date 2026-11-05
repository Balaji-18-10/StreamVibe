import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Video,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Trash2,
  Eye,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  MessageSquare,
  Shield,
  Flag,
} from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { adminService } from '../services/index.js';
import { formatTimeAgo, formatViews } from '../utils/formatters.js';

const STATUS_FILTERS = [
  { id: 'all', label: 'All Statuses' },
  { id: 'pending', label: 'Pending' },
  { id: 'reviewed', label: 'Under Review' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
];

const REASON_FILTERS = [
  { id: 'all', label: 'All Reasons' },
  { id: 'spam', label: 'Spam' },
  { id: 'misleading', label: 'Misleading' },
  { id: 'violence', label: 'Violence' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'copyright', label: 'Copyright' },
  { id: 'other', label: 'Other' },
];

const ENTITY_FILTERS = [
  { id: 'all', label: 'All Types' },
  { id: 'Video', label: 'Videos' },
  { id: 'Comment', label: 'Comments' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Reports state
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Detail / Action modal
  const [activeReport, setActiveReport] = useState(null);
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // ─── 1. Load Stats ──────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const res = await adminService.getStats();
      if (res.data?.success) {
        setStats(res.data.data.stats);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // ─── 2. Load Reports ────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const params = {
        page,
        limit: 10,
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (reasonFilter !== 'all') params.reason = reasonFilter;
      if (entityFilter !== 'all') params.entityType = entityFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await adminService.getReports(params);
      if (res.data?.success) {
        setReports(res.data.data.reports || []);
        if (res.data.data.pagination) {
          setPagination(res.data.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoadingReports(false);
    }
  }, [page, statusFilter, reasonFilter, entityFilter, searchQuery]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // ─── 3. Action Handlers ─────────────────────────────────────
  const handleUpdateStatus = async (reportId, newStatus, action = 'none') => {
    setIsProcessingAction(true);
    setActionError(null);
    try {
      await adminService.updateReport(reportId, {
        status: newStatus,
        moderationAction: action,
        moderatorNotes: moderatorNotes.trim(),
      });
      setActionSuccess(`Report updated to ${newStatus}.`);
      setTimeout(() => setActionSuccess(null), 3000);
      setActiveReport(null);
      setModeratorNotes('');
      fetchReports();
      fetchStats();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update report.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleTakedown = async (reportId) => {
    if (!window.confirm('Are you sure you want to take down this reported content? This action will disable or remove the content.')) {
      return;
    }

    setIsProcessingAction(true);
    setActionError(null);
    try {
      await adminService.takedown(reportId, {
        moderatorNotes: moderatorNotes.trim() || 'Content removed by administrator.',
      });
      setActionSuccess('Content successfully removed and report resolved.');
      setTimeout(() => setActionSuccess(null), 3000);
      setActiveReport(null);
      setModeratorNotes('');
      fetchReports();
      fetchStats();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to take down content.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#23232C]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FF3038]/10 border border-[#FF3038]/20 flex items-center justify-center text-[#FF3038]">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Admin & Moderation Dashboard
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#FF3038]/20 text-[#FF3038] border border-[#FF3038]/30">
                Admin Area
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Review flagged content, enforce community standards, and monitor platform health.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={RefreshCw}
            onClick={() => {
              fetchStats();
              fetchReports();
            }}
            className="rounded-xl font-semibold"
          >
            Refresh
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-[#17171D] border border-[#23232C] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Total Users</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-2xl font-black text-white">
            {isLoadingStats ? '...' : stats?.totalUsers || 0}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#17171D] border border-[#23232C] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Total Videos</span>
            <Video className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-2xl font-black text-white">
            {isLoadingStats ? '...' : stats?.totalVideos || 0}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#17171D] border border-[#23232C] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Total Reports</span>
            <FileText className="w-4 h-4 text-zinc-400" />
          </div>
          <span className="text-2xl font-black text-white">
            {isLoadingStats ? '...' : stats?.totalReports || 0}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#17171D] border border-[#23232C] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-medium">Pending Review</span>
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-amber-400">
            {isLoadingStats ? '...' : stats?.pendingReports || 0}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#17171D] border border-[#23232C] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-medium">Resolved</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-emerald-400">
            {isLoadingStats ? '...' : stats?.resolvedReports || 0}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#17171D] border border-[#23232C] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-medium">Dismissed</span>
            <XCircle className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-2xl font-black text-zinc-400">
            {isLoadingStats ? '...' : stats?.dismissedReports || 0}
          </span>
        </div>
      </div>

      {/* Reports Section */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#17171D] border border-[#23232C] flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Flag className="w-5 h-5 text-[#FF3038]" />
            <h2 className="text-base font-bold text-white">Reported Content Queue</h2>
            <span className="text-xs text-zinc-400 font-medium">
              ({pagination.total} reports)
            </span>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#0B0B0F] border border-[#23232C] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3038]"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-white/5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0B0B0F] border border-[#23232C] rounded-xl px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-[#FF3038]"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reason Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 font-medium">Reason:</span>
            <select
              value={reasonFilter}
              onChange={(e) => {
                setReasonFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0B0B0F] border border-[#23232C] rounded-xl px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-[#FF3038]"
            >
              {REASON_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500 font-medium">Type:</span>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#0B0B0F] border border-[#23232C] rounded-xl px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-[#FF3038]"
            >
              {ENTITY_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Reports Table / List */}
        <div className="overflow-x-auto">
          {isLoadingReports ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF3038]" />
              <span>Loading moderation queue...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mb-1" />
              <p className="text-sm font-bold text-white">No reports found</p>
              <p className="text-xs text-zinc-500 max-w-sm">
                The content moderation queue is currently clear for the selected filters.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#23232C] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Reporter</th>
                  <th className="py-3 px-3">Reported Item</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Reported At</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {reports.map((report) => {
                  const reporter = report.reporter || {};
                  const isVideo = report.entityType === 'Video';
                  const entity = report.entityId;

                  return (
                    <tr
                      key={report._id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Reporter Column */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={reporter.avatar?.url || reporter.avatar}
                            name={reporter.displayName || reporter.username || 'User'}
                            size="xs"
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">
                              {reporter.displayName || reporter.username || 'Anonymous'}
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              @{reporter.username || 'unknown'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Item Column */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                              isVideo
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {report.entityType}
                          </span>

                          {isVideo ? (
                            <Link
                              to={`/watch/${entity?._id || report.entityId}`}
                              target="_blank"
                              className="font-medium text-zinc-200 hover:text-[#FF3038] truncate flex items-center gap-1 group-hover:underline"
                            >
                              <span className="truncate">{entity?.title || 'Video #' + report.entityId}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 text-zinc-500" />
                            </Link>
                          ) : (
                            <p className="text-zinc-300 truncate max-w-[200px]">
                              {entity?.content || 'Comment #' + report.entityId}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Reason Column */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/5 text-zinc-300 border border-white/10 capitalize">
                          {report.reason}
                        </span>
                      </td>

                      {/* Status Column */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            report.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : report.status === 'reviewed'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : report.status === 'resolved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>

                      {/* Reported At Column */}
                      <td className="py-3 px-3 text-zinc-400 text-[11px] whitespace-nowrap">
                        {formatTimeAgo(report.createdAt)}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="secondary"
                          size="xs"
                          leftIcon={Eye}
                          onClick={() => {
                            setActiveReport(report);
                            setModeratorNotes(report.moderatorNotes || '');
                          }}
                          className="rounded-lg font-semibold"
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-zinc-400">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="xs"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </Button>
              <Button
                variant="secondary"
                size="xs"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="rounded-lg"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Review & Moderation Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-[#17171D] border border-[#23232C] rounded-2xl p-6 shadow-2xl relative flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FF3038]/10 flex items-center justify-center text-[#FF3038]">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Review Report #{activeReport._id.slice(-6)}
                  </h3>
                  <span className="text-xs text-zinc-400">
                    Target: {activeReport.entityType} • Reason: {activeReport.reason}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveReport(null)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Reporter Information */}
            <div className="p-3.5 rounded-xl bg-[#0B0B0F] border border-[#23232C] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Avatar
                  src={activeReport.reporter?.avatar?.url || activeReport.reporter?.avatar}
                  name={activeReport.reporter?.displayName || activeReport.reporter?.username}
                  size="sm"
                />
                <div>
                  <p className="font-bold text-white">
                    {activeReport.reporter?.displayName || activeReport.reporter?.username}
                  </p>
                  <p className="text-zinc-500">@{activeReport.reporter?.username}</p>
                </div>
              </div>
              <span className="text-zinc-500">
                Reported {formatTimeAgo(activeReport.createdAt)}
              </span>
            </div>

            {/* User description / context */}
            {activeReport.description && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-zinc-400">Reporter's Note:</span>
                <p className="text-xs text-zinc-200 bg-[#0B0B0F] border border-[#23232C] p-3 rounded-xl leading-relaxed">
                  "{activeReport.description}"
                </p>
              </div>
            )}

            {/* Target Content Overview */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-400">Flagged Content:</span>
              <div className="p-3.5 rounded-xl bg-[#0B0B0F] border border-[#23232C] flex items-center justify-between text-xs">
                {activeReport.entityType === 'Video' ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <Video className="w-5 h-5 text-purple-400 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-white truncate">
                        {activeReport.entityId?.title || 'Video Content'}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Status: {activeReport.entityId?.isPublished === false ? 'Unpublished / Removed' : 'Active'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageSquare className="w-5 h-5 text-blue-400 shrink-0" />
                    <p className="text-zinc-200 truncate">
                      {activeReport.entityId?.content || 'Comment Content'}
                    </p>
                  </div>
                )}

                {activeReport.entityType === 'Video' && (
                  <Link
                    to={`/watch/${activeReport.entityId?._id || activeReport.entityId}`}
                    target="_blank"
                    className="flex items-center gap-1 text-[#FF3038] hover:underline font-semibold shrink-0 ml-2"
                  >
                    <span>View Video</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {/* Moderator Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Moderator Resolution Notes:
              </label>
              <textarea
                value={moderatorNotes}
                onChange={(e) => setModeratorNotes(e.target.value)}
                placeholder="Document your moderation rationale here..."
                rows={2}
                className="w-full bg-[#0B0B0F] border border-[#23232C] rounded-xl p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF3038] resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
              <Button
                variant="danger"
                size="sm"
                leftIcon={Trash2}
                disabled={isProcessingAction}
                onClick={() => handleTakedown(activeReport._id)}
                className="font-bold"
              >
                Take Down Content
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isProcessingAction}
                  onClick={() => handleUpdateStatus(activeReport._id, 'dismissed', 'dismissed')}
                >
                  Dismiss
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isProcessingAction}
                  onClick={() => handleUpdateStatus(activeReport._id, 'reviewed')}
                >
                  Mark Under Review
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isProcessingAction}
                  onClick={() => handleUpdateStatus(activeReport._id, 'resolved', 'none')}
                  className="font-bold px-4"
                >
                  Resolve
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
