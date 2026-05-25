import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0, display: "block" }}>
      <path fill="#EA4335" d="M24 9.5c3.13 0 5.94 1.08 8.14 2.86l6.08-6.08C34.58 2.98 29.67 1 24 1 14.62 1 6.54 6.4 2.69 14.2l7.15 5.55C11.63 14.12 17.32 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.3 24.5c0-1.57-.14-2.88-.44-4.23H24v8h12.52c-.25 2.04-1.63 5.1-4.66 7.16l7.17 5.55c4.2-3.88 7.27-9.59 7.27-16.48z" />
      <path fill="#FBBC05" d="M9.84 28.75c-.46-1.38-.73-2.85-.73-4.25s.27-2.87.7-4.25L2.69 14.2C1.61 16.38 1 18.83 1 21.5c0 2.67.61 5.12 1.69 7.3l7.15-5.55z" />
      <path fill="#34A853" d="M24 44c5.67 0 10.58-1.87 14.1-5.1l-7.17-5.55c-1.92 1.33-4.52 2.26-6.93 2.26-6.68 0-12.37-4.62-14.16-10.25l-7.15 5.55C6.54 41.6 14.62 44 24 44z" />
      <path fill="none" d="M1 1h46v46H1z" />
    </svg>
  );
}

/** Tải Google Identity Services script một lần duy nhất */
function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (document.getElementById("gis-script")) {
    // Script đang tải — chờ nó tải xong
    return new Promise((resolve) => {
      const el = document.getElementById("gis-script") as HTMLScriptElement;
      if (el.dataset.loaded === "1") { resolve(); return; }
      el.addEventListener("load", () => resolve(), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => { script.dataset.loaded = "1"; resolve(); };
    script.onerror = () => reject(new Error("Failed to load Google Identity Services script"));
    document.head.appendChild(script);
  });
}

export function GoogleButton({
  clientId,
  onCredential,
  label = "Sign in with Google",
}: {
  clientId: string;
  onCredential: (credential: string) => void;
  label?: string;
}) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!clientId || initializedRef.current) return;
    initializedRef.current = true;

    loadGisScript().then(() => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            onCredential(response.credential);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    }).catch((err) => {
      console.error("[GoogleButton] GIS script load error:", err);
    });
  }, [clientId, onCredential]);

  function handleClick() {
    if (!window.google?.accounts?.id) {
      loadGisScript().then(() => window.google?.accounts.id.prompt());
      return;
    }
    // Re-initialize để cập nhật callback mới nhất trước khi prompt
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) onCredential(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    window.google.accounts.id.prompt();
  }

  return (
    <button
      type="button"
      id="google-signin-btn"
      onClick={handleClick}
      style={{
        width: "100%",
        height: 48,
        borderRadius: 100,
        border: "1px solid #e2e8f0",
        background: "#fff",
        color: "#0f172a",
        fontSize: 14,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s",
      }}
      onMouseOver={(e) => {
        const target = e.currentTarget as HTMLButtonElement;
        target.style.background = "#f8fafc";
        target.style.borderColor = "#cbd5e1";
      }}
      onMouseOut={(e) => {
        const target = e.currentTarget as HTMLButtonElement;
        target.style.background = "#fff";
        target.style.borderColor = "#e2e8f0";
      }}
    >
      <GoogleIcon />
      {label}
    </button>
  );
}
