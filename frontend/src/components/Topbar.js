"use client";

import Logo from "./Logo";

export default function Topbar({ children, rightContent }) {
  return (
    <div className="topbar">
      <Logo size={20} />
      {children}
      {rightContent && (
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {rightContent}
        </div>
      )}
    </div>
  );
}
