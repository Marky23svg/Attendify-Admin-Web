import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, total, pageSize, onPage }) {
  const from = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div className="flex items-center justify-between mt-6 px-1">
      <p className="text-xs text-[#64748B]">
        Showing <span className="font-semibold text-[#0F1E36]">{from}–{to}</span> of{' '}
        <span className="font-semibold text-[#0F1E36]">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#E8EDF5] bg-white text-[#64748B] hover:bg-[#F8FAFD] disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e-${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-[#64748B]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-semibold transition ${
                p === page
                  ? 'bg-[#0066FF] text-white shadow-[0_4px_12px_rgba(0,102,255,0.25)]'
                  : 'border border-[#E8EDF5] bg-white text-[#64748B] hover:bg-[#F8FAFD]'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages || totalPages === 0}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#E8EDF5] bg-white text-[#64748B] hover:bg-[#F8FAFD] disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
