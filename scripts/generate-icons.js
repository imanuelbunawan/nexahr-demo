import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function createPng(width, height, pixelFn) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // No interlace
  const ihdrChunk = writeChunk('IHDR', ihdr);

  // Raw Scanlines: [filterByte(0), R, G, B, A, R, G, B, A...] per row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = writeChunk('IDAT', compressed);
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// NexaHR brand icon renderer: rounded rectangle gradient (#4f46e5 to #0284c7) with shield and 'N' mark
function nexaIconPixel(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;

  // Background rounded rect
  const cornerRadius = isMaskable ? 0 : 0.22;
  const dx = Math.max(Math.abs(nx - 0.5) - (0.5 - cornerRadius), 0);
  const dy = Math.max(Math.abs(ny - 0.5) - (0.5 - cornerRadius), 0);
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (!isMaskable && dist > cornerRadius) {
    return [0, 0, 0, 0]; // transparent outside rounded rect
  }

  // Base background gradient: Indigo #4f46e5 (79, 70, 229) to Sky #0284c7 (2, 132, 199)
  const gradT = (nx + ny) * 0.5;
  let bgR = Math.round(79 + (2 - 79) * gradT);
  let bgG = Math.round(70 + (132 - 70) * gradT);
  let bgB = Math.round(229 + (199 - 229) * gradT);

  // Center Shield / Crest
  // Shield coordinates: top apex (0.5, 0.18), top-right (0.76, 0.28), bottom apex (0.5, 0.82), top-left (0.24, 0.28)
  const cx = 0.5;
  const inShieldY = ny >= 0.18 && ny <= 0.82;
  let inShield = false;
  if (inShieldY) {
    let halfWidth;
    if (ny < 0.32) {
      halfWidth = 0.26 * ((ny - 0.18) / 0.14);
    } else {
      const prog = (ny - 0.32) / 0.50;
      halfWidth = 0.26 * Math.sqrt(Math.max(0, 1 - prog * prog));
    }
    if (Math.abs(nx - cx) <= halfWidth) {
      inShield = true;
    }
  }

  if (inShield) {
    // Shield color: Crisp white/ice indigo with subtle gradient
    let sR = 255;
    let sG = 255;
    let sB = 255;

    // Stylized "N" inside the shield
    // N columns: Left vertical x around [0.40, 0.44], Right vertical x around [0.56, 0.60], y in [0.38, 0.65]
    // Diagonal connects (0.42, 0.38) to (0.58, 0.65)
    const inLeftBar = nx >= 0.39 && nx <= 0.44 && ny >= 0.36 && ny <= 0.66;
    const inRightBar = nx >= 0.56 && nx <= 0.61 && ny >= 0.36 && ny <= 0.66;
    
    // Diagonal bar calculation
    const diagT = (nx - 0.41) / (0.59 - 0.41);
    const expectedDiagY = 0.38 + diagT * (0.64 - 0.38);
    const inDiag = nx >= 0.41 && nx <= 0.59 && Math.abs(ny - expectedDiagY) <= 0.045;

    // Security Dot above right bar (0.63, 0.36)
    const dotDist = Math.hypot(nx - 0.61, ny - 0.34);
    const inDot = dotDist <= 0.032;

    if (inLeftBar || inRightBar || inDiag || inDot) {
      // Deep Indigo #312e81
      return [49, 46, 129, 255];
    }

    return [sR, sG, sB, 245];
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve('public');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, (x, y, w, h) => nexaIconPixel(x, y, w, h, false)));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, (x, y, w, h) => nexaIconPixel(x, y, w, h, false)));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, (x, y, w, h) => nexaIconPixel(x, y, w, h, true)));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, (x, y, w, h) => nexaIconPixel(x, y, w, h, false)));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(64, 64, (x, y, w, h) => nexaIconPixel(x, y, w, h, false)));

console.log('Successfully generated all PWA icons in /public:');
console.log(fs.readdirSync(publicDir));
