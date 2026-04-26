import React from 'react';

export const ForwardedLabel = ({ isSent = false }) => {
  const color = isSent ? 'rgba(221,214,254,0.9)' : 'var(--color-text-tertiary)';

  return (
    <div className="flex items-center gap-1 mb-1 select-none" style={{ color }}>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          d="M15 7l6 5-6 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21 12H9a6 6 0 0 0-6 6v1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-xs font-medium">Forwarded</span>
    </div>
  );
};

