import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock3,
  Check,
  X,
  ArrowRight,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/useAuth';
import { CARD, CARD_SHADOW } from '../../lib/design';
import { getInitials } from '../../lib/format';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 8;

/* ── Toast ─────────────────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold shadow-lg pointer-events-auto ${
            t.type === 'error'
              ? 'bg-[#FEE9EB] text-[#DC2626]'
              : 'bg-[#EAF8F0] text-[#16834A]'
          }`}
        >
          {t.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ── Employee Avatar ────────────────────────────────────────────────── */
function EmployeeAvatar({ profile }) {
  const name = profile?.full_name || profile?.email || 'Unknown';
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={name}
        className="w-10 h-10 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[#EAF2FF] flex items-center justify-center text-[#0066FF] font-bold text-sm shrink-0">
      {getInitials(name)}
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className={`${CARD} p-4 mb-3`} style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-[#F8FAFD] animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 rounded-lg bg-[#F8FAFD] animate-pulse" />
          <div className="h-3 w-52 rounded-lg bg-[#F8FAFD] animate-pulse" />
          <div className="h-3 w-44 rounded-lg bg-[#F8FAFD] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/* ── Modal ──────────────────────────────────────────────────────────── */
function ActionModal({ type, correction, onClose, onSuccess }) {
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const isApprove = type === 'approve';

  const handleSubmit = async () => {
    if (!isApprove && !note.trim()) {
      setError('A note is required when rejecting.');
      return;
    }
    setProcessing(true);
    setError(null);
    const rpc = isApprove ? 'approve_time_correction' : 'reject_time_correction';
    const { error: rpcError } = await supabase.rpc(rpc, {
      p_correction_id: correction.id,
      p_admin_note: note.trim() || null,
    });
    setProcessing(false);
    if (rpcError) { setError(rpcError.message); return; }
    onSuccess(isApprove ? 'approved' : 'rejected');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={onClose} />
      <div
        className={`relative ${CARD} w-full max-w-md p-6`}
        style={{ boxShadow: CARD_SHADOW }}
      >
        <h2 className="font-bold text-[#0F1E36] text-lg mb-1">
          {isApprove ? 'Approve Time Correction' : 'Reject Time Correction'}
        </h2>
        <p className="text-sm text-[#64748B] mb-4">
          {isApprove
            ? 'Optionally add a note before approving.'
            : 'Please provide a reason for rejection.'}
        </p>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isApprove ? 'Admin note (optional)…' : 'Reason for rejection (required)…'}
          rows={3}
          disabled={processing}
          className="w-full bg-white border border-[#E8EDF5] rounded-2xl p-3 text-sm text-[#0F1E36] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 resize-none mb-3"
        />

        {error && (
          <div className="flex items-start gap-2 bg-[#FEE9EB] text-[#DC2626] text-sm rounded-xl px-3 py-2 mb-3">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={processing}
            className="bg-white border border-[#E8EDF5] text-[#0F1E36] font-semibold rounded-2xl px-4 py-2 hover:bg-[#F8FAFD] transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={processing}
            className={`font-bold rounded-2xl px-4 py-2 flex items-center gap-2 transition disabled:opacity-50 ${
              isApprove
                ? 'bg-[#16834A] text-white hover:bg-[#126B3C]'
                : 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
            }`}
          >
            {processing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isApprove ? (
              <Check size={16} />
            ) : (
              <X size={16} />
            )}
            {isApprove ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Correction Card ────────────────────────────────────────────────── */
function CorrectionCard({ correction, onApprove, onReject }) {
  const profile = correction.profiles;
  const name = profile?.full_name || profile?.email || 'Unknown';
  const att = correction.attendance;

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const fmtTime = (iso) =>
    iso
      ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      : '—';

  const displayOriginal = fmtTime(correction.original_time);
  const displayCorrected = fmtTime(correction.corrected_time);

  const isPending = correction.status === 'pending';

  const StatusBadge = () => (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        correction.status === 'approved'
          ? 'bg-[#EAF8F0] text-[#16834A]'
          : correction.status === 'rejected'
          ? 'bg-[#FEE9EB] text-[#DC2626]'
          : 'bg-[#FEF3C7] text-[#D97706]'
      }`}
    >
      {correction.status === 'approved' ? (
        <CheckCircle2 size={13} />
      ) : correction.status === 'rejected' ? (
        <XCircle size={13} />
      ) : (
        <Clock3 size={13} />
      )}
      {correction.status.charAt(0).toUpperCase() + correction.status.slice(1)}
    </span>
  );

  return (
    <div className={`${CARD} p-4 mb-3`} style={{ boxShadow: CARD_SHADOW }}>
      {/* Header row — mirrors Attendance card pattern */}
      <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB]">
        <EmployeeAvatar profile={profile} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#0F1E36] text-sm truncate">{name}</p>
          <p className="text-xs text-[#64748B] truncate">
            {profile?.employee_id && <span className="mr-2">{profile.employee_id}</span>}
            {profile?.email}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge />
        </div>
      </div>

      {/* Body */}
      <div className="mt-3 flex flex-col sm:flex-row gap-4">
        {/* Detail grid */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-[#64748B] mb-0.5">Field</p>
              <p className="font-semibold text-[#0F1E36] capitalize">
                {correction.field ? correction.field.replace(/_/g, ' ') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-0.5">Date</p>
              <p className="font-semibold text-[#0F1E36]">{fmtDate(att?.date)}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-0.5">Original</p>
              <p className="text-[#64748B] text-sm">{displayOriginal}</p>
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-0.5">Corrected</p>
              <div className="flex items-center gap-1">
                <ArrowRight size={12} className="text-[#0066FF] shrink-0" />
                <p className="font-bold text-[#0F1E36] text-sm">{displayCorrected}</p>
              </div>
            </div>
          </div>

          {correction.message && (
            <div className="mt-3 bg-[#F8FAFD] rounded-xl p-3 flex items-start gap-2 border border-[#E8EDF5]">
              <MessageSquare size={14} className="text-[#64748B] shrink-0 mt-0.5" />
              <p className="text-xs text-[#64748B] leading-5">{correction.message}</p>
            </div>
          )}
        </div>

        {/* Actions / reviewed info */}
        <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0">
          {isPending ? (
            <>
              <button
                onClick={() => onApprove(correction)}
                className="bg-[#16834A] text-white font-bold rounded-2xl px-4 py-2 flex items-center gap-1.5 text-sm hover:bg-[#126B3C] transition"
              >
                <Check size={15} />
                Approve
              </button>
              <button
                onClick={() => onReject(correction)}
                className="bg-white border border-[#E8EDF5] text-[#DC2626] rounded-2xl px-4 py-2 flex items-center gap-1.5 text-sm hover:bg-[#FEE9EB] transition"
              >
                <X size={15} />
                Reject
              </button>
            </>
          ) : (
            correction.reviewed_at && (
              <p className="text-[10px] text-[#64748B] text-right">
                Reviewed on<br />{fmtDate(correction.reviewed_at)}
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────── */
const TABS = ['pending', 'approved', 'rejected'];

export default function TimeCorrections() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('pending');
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [page, setPage] = useState(1);

  // Admin guard
  useEffect(() => {
    if (profile && profile.role !== 'admin') navigate('/dashboard');
  }, [profile, navigate]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchCorrections = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('time_corrections')
      .select(
        `*, profiles!user_id (id, full_name, email, employee_id, avatar_url), attendance (id, date, time_in, time_out)`
      )
      .eq('status', activeTab)
      .order('created_at', { ascending: false });

    setLoading(false);
    if (err) { setError(err.message); return; }
    setCorrections(data || []);
  }, [activeTab]);

  useEffect(() => { fetchCorrections(); }, [fetchCorrections]);

  // Reset page when tab changes
  useEffect(() => { setPage(1); }, [activeTab]);

  const totalPages = Math.ceil(corrections.length / PAGE_SIZE);
  const paginated = corrections.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSuccess = (status) => {
    setModal(null);
    addToast(`Request ${status} successfully.`);
    fetchCorrections();
  };

  const pendingCount = activeTab === 'pending' ? corrections.length : null;

  return (
    <div className="bg-[#F5F7FB] min-h-screen">
      <Toast toasts={toasts} />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0F1E36]">Time Corrections</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Review and action employee time correction requests
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition ${
                  active
                    ? 'bg-[#0066FF] text-white shadow-[0_4px_12px_rgba(0,102,255,0.25)]'
                    : 'bg-white text-[#64748B] border border-[#E8EDF5] hover:bg-[#F8FAFD]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-[#FEE9EB] text-[#DC2626] text-sm rounded-2xl px-4 py-3 mb-4">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : corrections.length === 0 ? (
          <div className={`${CARD} p-10 flex flex-col items-center text-center`} style={{ boxShadow: CARD_SHADOW }}>
            <div className="w-14 h-14 rounded-xl bg-[#EAF2FF] flex items-center justify-center mb-4">
              <Inbox size={26} color="#0066FF" />
            </div>
            <h3 className="font-bold text-[#0F1E36] text-base">No {activeTab} corrections</h3>
            <p className="text-sm text-[#64748B] mt-1">Time correction requests will appear here.</p>
          </div>
        ) : (
          <>
            {paginated.map((c) => (
              <CorrectionCard
                key={c.id}
                correction={c}
                onApprove={(corr) => setModal({ type: 'approve', correction: corr })}
                onReject={(corr) => setModal({ type: 'reject', correction: corr })}
              />
            ))}
            <Pagination page={page} totalPages={totalPages} total={corrections.length} pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>

      {modal && (
        <ActionModal
          type={modal.type}
          correction={modal.correction}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
