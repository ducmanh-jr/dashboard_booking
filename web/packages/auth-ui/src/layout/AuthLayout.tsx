import React from "react";

export function AuthLayout({
  title,
  subtitle = "Please enter your details",
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  heroTitle?: string;
  heroDescription?: string;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Blobs */}
      <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "40%", height: "40%", background: "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(236, 72, 153, 0.05) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "20%", right: "10%", width: "30%", height: "30%", background: "radial-gradient(circle, rgba(245, 158, 11, 0.04) 0%, transparent 70%)", filter: "blur(40px)", pointerEvents: "none" }} />

      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "32px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.08)",
          padding: "48px 40px",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ width: "100%" }}>
          <p style={{ margin: 0, color: "#64748b", fontSize: 12, lineHeight: "16px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {subtitle}
          </p>
          <h1
            style={{
              margin: "6px 0 0",
              color: "#0f172a",
              fontSize: 22,
              lineHeight: 1.2,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>
          <div style={{ marginTop: 36, display: "grid", gap: 20 }}>
            {children}
            {footer ? <div style={{ marginTop: 8 }}>{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
