import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  FileText,
  AlertCircle,
  Loader2,
  Search,
  Inbox,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import {
  CARD_SHADOW,
  CARD,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  ICON_BADGE,
} from '../lib/design';
import { getInitials, formatDate } from '../lib/format';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 8;

function SkeletonCard() {
  return (
    <div className={`${CARD} p-5`} style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-[#F8FAFD] animate-pulse" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-40 rounded-lg bg-[#F8FAFD] animate-pulse" />
          <div className="h-3 w-64 rounded-lg bg-[#F8FAFD] animate-pulse" />
          <div className="h-3 w-52 rounded-lg bg-[#F8FAFD] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const config = {
    approved: { label: 'Approved', bg: '#EAF8F0', text: '#16834A', Icon: CheckCircle2 },
    rejected: { label: 'Rejected', bg: '#FEE9EB', text: '#DC2626', Icon: XCircle },
    pending: { label: 'Pending', bg: '#FEF3C7', text: '#D97706', Icon: Clock },
  };
  const c = config[status] || config.pending;
  const Icon = c.Icon;
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <Icon size={14} className="mr-1" />
      {c.label}
    </span>
  );
}

export default function LeaveApprovals() {
  const { profile: adminProfile } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (leaveError) {
        setError(leaveError.message);
        setRequests([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set((leaveData || []).map((r) => r.user_id))];

      let profileMap = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, employee_id, department, position, avatar_url')
          .in('id', userIds);

        (profiles || []).forEach((p) => {
          profileMap[p.id] = p;
        });
      }

      const merged = (leaveData || []).map((r) => ({
        ...r,
        profile: profileMap[r.user_id] || null,
      }));

      setRequests(merged);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const counts = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    };
  }, [requests]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests.filter((r) => {
      if (r.status !== activeTab) return false;

      if (!term) return true;

      const name = r.profile?.full_name?.toLowerCase() || '';
      const email = r.profile?.email?.toLowerCase() || '';
      const empId = r.profile?.employee_id?.toLowerCase() || '';

      return name.includes(term) || email.includes(term) || empId.includes(term);
    });
  }, [requests, activeTab, search]);

  // Reset page when tab or search changes
  useEffect(() => { setPage(1); }, [activeTab, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openReview = (req) => {
    setSelected(req);
    setReviewNotes('');
    setActionError(null);
  };

  const closeReview = () => {
    if (processing) return;
    setSelected(null);
    setReviewNotes('');
    setActionError(null);
  };

  const handleDecision = async (decision) => {
    if (!selected) return;
    if (!adminProfile?.id) {
      setActionError('Could not identify your admin account.');
      return;
    }

    setProcessing(true);
    setActionError(null);

    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: decision,
        review_notes: reviewNotes.trim() || null,
        reviewed_by: adminProfile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', selected.id);

    setProcessing(false);

    if (updateError) {
      setActionError(updateError.message);
      return;
    }

    setRequests((prev) =>
      prev.map((r) =>
        r.id === selected.id
          ? {
              ...r,
              status: decision,
              review_notes: reviewNotes.trim() || null,
              reviewed_by: adminProfile.id,
              reviewed_at: new Date().toISOString(),
            }
          : r
      )
    );

    setSelected(null);
    setReviewNotes('');
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getLeaveLabel = (req) => {
    if (req.leave_type === 'other') {
      return req.custom_type || 'Other';
    }
    return req.leave_type.charAt(0).toUpperCase() + req.leave_type.slice(1);
  };

  const getDayCount = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-2xl font-extrabold text-[#0F1E36] tracking-tight">
            Leave Approvals
          </h2>
          <p className="text-sm text-[#64748B] mt-1">
            Review and approve employee leave requests
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className={`${SECONDARY_BUTTON} flex items-center justify-center gap-2 py-3 text-sm`}
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'pending', label: 'Pending', Icon: Clock, color: '#D97706' },
          { key: 'approved', label: 'Approved', Icon: CheckCircle2, color: '#16834A' },
          { key: 'rejected', label: 'Rejected', Icon: XCircle, color: '#DC2626' },
        ].map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.Icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition ${
                active
                  ? 'bg-[#0066FF] text-white'
                  : 'bg-white text-[#64748B] border border-[#E8EDF5] hover:bg-[#F8FAFD]'
              }`}
              style={active ? { boxShadow: '0 4px 12px rgba(0,102,255,0.25)' } : {}}
            >
              <Icon size={16} color={active ? '#FFFFFF' : tab.color} />
              {tab.label}
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  active ? 'bg-white/20 text-white' : 'bg-[#F8FAFD] text-[#64748B]'
                }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className={`${CARD} p-4 mb-6`} style={{ boxShadow: CARD_SHADOW }}>
        <div className="relative flex items-center bg-white rounded-2xl border border-[#E8EDF5] focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-[#0066FF]/20 transition">
          <Search
            size={18}
            color="#9CA3AF"
            className="absolute left-4 shrink-0 pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or employee ID"
            className="w-full bg-transparent text-sm text-[#0F1E36] outline-none placeholder-gray-400 py-3 pl-11 pr-4"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-[#FEE9EB] text-[#DC2626] text-sm rounded-2xl px-4 py-3 mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`${CARD} p-10`} style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex flex-col items-center text-center">
            <div className={ICON_BADGE} style={{ backgroundColor: '#EAF2FF', width: 64, height: 64 }}>
              <Inbox size={28} color="#0066FF" />
            </div>
            <h3 className="font-bold text-[#0F1E36] text-lg mt-4">
              {search
                ? 'No matching requests'
                : activeTab === 'pending'
                ? 'No pending requests'
                : activeTab === 'approved'
                ? 'No approved requests'
                : 'No rejected requests'}
            </h3>
            <p className="text-sm text-[#64748B] mt-1 max-w-sm">
              {search
                ? 'Try a different search term.'
                : 'Leave requests submitted by employees will appear here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((req) => {
            const name = req.profile?.full_name || req.profile?.email || 'Unknown';
            const initials = getInitials(name);
            const days = getDayCount(req.start_date, req.end_date);

            return (
              <div
                key={req.id}
                className={`${CARD} p-5 hover:border-[#0066FF] transition cursor-pointer`}
                style={{ boxShadow: CARD_SHADOW }}
                onClick={() => openReview(req)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {req.profile?.avatar_url ? (
                    <img src={req.profile.avatar_url} alt={name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#EAF2FF] flex items-center justify-center text-[#0066FF] font-bold shrink-0">
                      {initials}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[#0F1E36] text-base truncate">
                        {name}
                      </p>
                      <StatusPill status={req.status} />
                    </div>
                    <p className="text-xs text-[#64748B] mt-1">
                      {req.profile?.employee_id && (
                        <span className="mr-3">
                          ID: {req.profile.employee_id}
                        </span>
                      )}
                      {req.profile?.department && (
                        <span>{req.profile.department}</span>
                      )}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm">
                      <div className="flex items-center gap-1.5 text-[#0F1E36]">
                        <FileText size={14} className="text-[#0066FF]" />
                        <span className="font-semibold">{getLeaveLabel(req)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#64748B]">
                        <Calendar size={14} />
                        <span>
                          {formatDisplayDate(req.start_date)} –{' '}
                          {formatDisplayDate(req.end_date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#64748B]">
                        <Clock size={14} />
                        <span>{days} day{days === 1 ? '' : 's'}</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#64748B] mt-2 line-clamp-2">
                      {req.reason}
                    </p>
                  </div>

                  <div className="text-[#0066FF] text-sm font-semibold shrink-0">
                    {req.status === 'pending' ? 'Review →' : 'View →'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
      )}

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 cursor-pointer"
            onClick={closeReview}
          />

          <div
            className={`relative ${CARD} w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-none p-6 sm:p-8`}
            style={{ boxShadow: CARD_SHADOW }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={ICON_BADGE} style={{ backgroundColor: '#EAF2FF' }}>
                  <FileText size={18} color="#0066FF" />
                </div>
                <div>
                  <h2 className="font-bold text-[#0F1E36] text-xl">
                    Leave Request
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Submitted {formatDate(selected.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={closeReview}
                disabled={processing}
                className="p-2 rounded-xl text-gray-400 hover:text-[#0F1E36] hover:bg-[#F8FAFD] transition disabled:opacity-50"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="mb-6">
              <StatusPill status={selected.status} />
            </div>

            <div className="bg-[#F8FAFD] rounded-2xl p-4 border border-[#E8EDF5] mb-5">
              <div className="flex items-center gap-3">
                {selected.profile?.avatar_url ? (
                  <img src={selected.profile.avatar_url} alt={selected.profile?.full_name || ''} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#EAF2FF] flex items-center justify-center text-[#0066FF] font-bold">
                    {getInitials(selected.profile?.full_name || 'Unknown')}
                  </div>
                )}
                <div>
                  <p className="font-bold text-[#0F1E36]">
                    {selected.profile?.full_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {selected.profile?.email}
                  </p>
                  {selected.profile?.employee_id && (
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {selected.profile.employee_id}
                      {selected.profile.department &&
                        ` · ${selected.profile.department}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#F8FAFD] rounded-2xl p-4 border border-[#E8EDF5] mb-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                  Leave Type
                </p>
                <p className="text-[#0F1E36] font-semibold capitalize">
                  {getLeaveLabel(selected)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                  Duration
                </p>
                <p className="text-[#0F1E36] font-semibold">
                  {formatDisplayDate(selected.start_date)} –{' '}
                  {formatDisplayDate(selected.end_date)}
                  <span className="text-[#64748B] font-normal ml-2">
                    ({getDayCount(selected.start_date, selected.end_date)} day
                    {getDayCount(selected.start_date, selected.end_date) === 1
                      ? ''
                      : 's'})
                  </span>
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                  Reason
                </p>
                <p className="text-[#0F1E36] leading-6">{selected.reason}</p>
              </div>

              {selected.review_notes && (
                <div>
                  <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Previous Review Notes
                  </p>
                  <p className="text-[#0F1E36] leading-6">{selected.review_notes}</p>
                </div>
              )}
            </div>

            {selected.status === 'pending' && (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-[#64748B] mb-2">
                    Review notes (optional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add a note for the employee…"
                    rows={3}
                    disabled={processing}
                    className="w-full bg-white border border-[#E8EDF5] rounded-2xl p-4 text-sm text-[#0F1E36] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 resize-none"
                  />
                </div>

                {actionError && (
                  <div className="flex items-start gap-2 bg-[#FEE9EB] text-[#DC2626] text-sm rounded-2xl px-4 py-3 mb-4">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{actionError}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
                  <button
                    onClick={closeReview}
                    disabled={processing}
                    className={`${SECONDARY_BUTTON} flex items-center justify-center gap-2`}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => handleDecision('rejected')}
                    disabled={processing}
                    className="bg-[#DC2626] text-white font-bold rounded-2xl py-4 px-6 shadow-[0_4px_12px_rgba(220,38,38,0.25)] hover:bg-[#B91C1C] active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <XCircle size={18} />
                    )}
                    Reject
                  </button>

                  <button
                    onClick={() => handleDecision('approved')}
                    disabled={processing}
                    className={`${PRIMARY_BUTTON} flex items-center justify-center gap-2`}
                  >
                    {processing ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    Approve
                  </button>
                </div>
              </>
            )}

            {selected.status !== 'pending' && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={closeReview}
                  className={`${SECONDARY_BUTTON} flex items-center justify-center gap-2`}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}