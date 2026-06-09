(function attachPacePetsPaceStateArt(root) {
  "use strict";

  const SINGULARITY_ICON_DATA_URL = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs>
        <radialGradient id="core" cx="50%" cy="45%" r="62%">
          <stop offset="0%" stop-color="#111827"/>
          <stop offset="62%" stop-color="#020617"/>
          <stop offset="100%" stop-color="#000000"/>
        </radialGradient>
        <linearGradient id="ring" x1="7" y1="28" x2="57" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#67e8f9"/>
          <stop offset="48%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#fbbf24"/>
        </linearGradient>
        <filter id="glow" x="-30%" y="-45%" width="160%" height="190%">
          <feGaussianBlur stdDeviation="2.1" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="48" cy="15" r="1.8" fill="#fbbf24"/>
      <circle cx="15" cy="21" r="1.5" fill="#67e8f9"/>
      <circle cx="48.5" cy="49" r="1.2" fill="#f8fafc"/>
      <ellipse cx="32" cy="32" rx="25" ry="9.5" fill="none" stroke="url(#ring)" stroke-width="5.5" stroke-linecap="round" filter="url(#glow)" transform="rotate(-18 32 32)"/>
      <circle cx="32" cy="32" r="13.5" fill="url(#core)" stroke="#f8fafc" stroke-opacity="0.88" stroke-width="2.6"/>
      <path d="M13.2 35.8c8.6 8 28.4 9.2 39.1.1" fill="none" stroke="#67e8f9" stroke-width="3.6" stroke-linecap="round" opacity="0.92" transform="rotate(-18 32 32)"/>
    </svg>`,
  )}`;

  root.PacePetsPaceStateArt = Object.freeze({
    SINGULARITY_ICON_DATA_URL,
  });
})(globalThis);
