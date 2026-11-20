/**
 * Utilities for Digital Signature generation, verification, and canvas drawing.
 */

export interface DigitalSignatureRecord {
  id: string;
  dataUrl: string; // Base64 PNG image from canvas
  signerName: string;
  signerNip?: string;
  signerRole?: string;
  signedAt: string;
  verificationCode: string;
  method: 'draw' | 'type' | 'saved';
}

/**
 * Generates an enterprise verification hash for a signed document.
 * Format: NX-SIG-XXXX-YYYY (deterministic format for verification badges)
 */
export function generateSignatureVerificationCode(
  documentId: string,
  signerName: string,
  timestampMs?: number
): string {
  const seed = `${documentId}:${signerName}:${timestampMs || Date.now()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  const part1 = hex.slice(0, 4);
  const part2 = hex.slice(4, 8);
  return `NX-SIG-${part1}-${part2}`;
}

/**
 * Format timestamp in Indonesian locale with WIB indicator.
 */
export function formatSignatureTimestamp(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const day = d.getDate();
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day} ${monthName} ${year}, ${hours}:${minutes} WIB`;
}

/**
 * Validates whether a signature data URL string is valid and non-empty.
 */
export function isValidSignatureDataUrl(dataUrl: string | null | undefined): boolean {
  if (!dataUrl || typeof dataUrl !== 'string') return false;
  return dataUrl.startsWith('data:image/png;base64,') && dataUrl.length > 50;
}

/**
 * Converts text into an elegant SVG data URL representation for rendering to canvas.
 */
export function createCursiveSignatureSvg(
  name: string,
  fontStyle: 'script' | 'cursive' | 'formal' = 'script',
  color: string = '#1e3a8a'
): string {
  const cleanName = name.trim() || 'Tanda Tangan';
  let fontFamily = "'Brush Script MT', 'Dancing Script', 'Caveat', cursive";
  let fontStyleCss = 'italic';
  let letterSpacing = '1px';

  if (fontStyle === 'cursive') {
    fontFamily = "'Segoe Script', 'Great Vibes', cursive";
    fontStyleCss = 'italic';
    letterSpacing = '2px';
  } else if (fontStyle === 'formal') {
    fontFamily = "'Times New Roman', 'Palatino', serif";
    fontStyleCss = 'italic';
    letterSpacing = '3px';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="160" viewBox="0 0 500 160">
    <style>
      .sig-text {
        font-family: ${fontFamily};
        font-style: ${fontStyleCss};
        font-size: 52px;
        fill: ${color};
        letter-spacing: ${letterSpacing};
        text-anchor: middle;
        dominant-baseline: middle;
      }
      .flourish {
        stroke: ${color};
        stroke-width: 2.2;
        fill: none;
        stroke-linecap: round;
      }
    </style>
    <path class="flourish" d="M 40 120 Q 180 145, 300 115 T 460 125" opacity="0.6"/>
    <text x="250" y="80" class="sig-text">${cleanName}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
