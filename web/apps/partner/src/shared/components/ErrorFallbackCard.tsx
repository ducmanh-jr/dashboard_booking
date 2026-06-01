type ErrorFallbackCardProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorFallbackCard({
  title = "Hệ thống đang bận",
  description = "Đã có lỗi xảy ra từ phía máy chủ, vui lòng thử lại sau vài phút.",
  onRetry = () => window.location.reload(),
  retryLabel = "Tải lại trang",
}: ErrorFallbackCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-950">
      <div className="w-full max-w-[420px] rounded-2xl border border-rose-100 bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
          <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" aria-hidden="true">
            <path
              d="M24 5.5 43 38.2a3 3 0 0 1-2.6 4.5H7.6A3 3 0 0 1 5 38.2L24 5.5Z"
              fill="currentColor"
              opacity="0.16"
            />
            <path
              d="M24 8 41.1 37.4a2 2 0 0 1-1.7 3H8.6a2 2 0 0 1-1.7-3L24 8Z"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            <path d="M24 18v10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M24 34h.01" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="mt-5 text-xl font-black tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-[320px] text-sm leading-6 text-slate-500">{description}</p>

        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 active:scale-[0.99]"
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}
