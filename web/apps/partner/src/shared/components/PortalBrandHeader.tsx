import { Link } from "react-router-dom";

type PortalBrandHeaderProps = {
  onCloseMobile?: () => void;
};

export function PortalBrandHeader({ onCloseMobile }: PortalBrandHeaderProps) {
  return (
    <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
      <Link to="/" className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm ring-1 ring-white/40">
          <svg viewBox="0 0 36 36" className="h-7 w-7" fill="none" aria-hidden="true">
            <path
              d="M8 17.2 18 8l10 9.2v9.1a1.7 1.7 0 0 1-1.7 1.7h-4.8v-8.1h-7V28H9.7A1.7 1.7 0 0 1 8 26.3v-9.1Z"
              fill="currentColor"
              opacity="0.95"
            />
            <path
              d="M13.1 25.8V15.2h2.4l7 7.1v-7.1h2.4v10.6h-2.2l-7.2-7.3v7.3h-2.4Z"
              fill="#ECFDF5"
            />
            <path
              d="M6.8 17.7 18 7.4l11.2 10.3"
              stroke="#A7F3D0"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="min-w-0">
          <div className="truncate text-[14px] font-black leading-5 tracking-tight text-slate-950">
            NoWayHome
          </div>
          <div className="mt-0.5 inline-flex max-w-full items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase leading-none tracking-wide text-emerald-700 ring-1 ring-emerald-100">
            Partner Portal
          </div>
        </div>
      </Link>

      {onCloseMobile && (
        <button
          type="button"
          onClick={onCloseMobile}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 lg:hidden"
          aria-label="Đóng menu"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18 18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
