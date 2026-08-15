// Pure Node.js script to generate valid PNG icon files without external dependencies.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size, primaryColor = [16, 185, 129], accentColor = [255, 255, 255]) {
  // Create RGBA buffer
  const width = size;
  const height = size;
  const buffer = Buffer.alloc(width * height * 4);

  const radius = Math.floor(size * 0.22);
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Rounded rectangle background
      const dx = Math.max(0, Math.abs(x - cx) - (cx - radius - 1));
      const dy = Math.max(0, Math.abs(y - cy) - (cy - radius - 1));
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Modern cyan-blue to indigo-teal gradient
        const factor = y / height;
        const r = Math.round(14 * (1 - factor) + 6 * factor);
        const g = Math.round(165 * (1 - factor) + 95 * factor);
        const b = Math.round(233 * (1 - factor) + 160 * factor);
        buffer[idx] = r;
        buffer[idx + 1] = g;
        buffer[idx + 2] = b;
        buffer[idx + 3] = 255; // Alpha
      } else {
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0; // Transparent
      }

      // Draw stylized bracket / crop-grab icon inside
      const nx = x / width;
      const ny = y / height;

      const pad = 0.25;
      const thick = size < 32 ? 0.14 : 0.09;

      // Top-left bracket
      const inTLH = ny >= pad && ny <= pad + thick && nx >= pad && nx <= 0.48;
      const inTLV = nx >= pad && nx <= pad + thick && ny >= pad && ny <= 0.48;

      // Bottom-right bracket
      const inBRH = ny >= 1 - pad - thick && ny <= 1 - pad && nx >= 0.52 && nx <= 1 - pad;
      const inBRV = nx >= 1 - pad - thick && nx <= 1 - pad && ny >= 0.52 && ny <= 1 - pad;

      // Center dot / data pill
      const inDot = nx >= 0.40 && nx <= 0.60 && ny >= 0.42 && ny <= 0.58;

      if (inTLH || inTLV || inBRH || inBRV || inDot) {
        buffer[idx] = accentColor[0];
        buffer[idx + 1] = accentColor[1];
        buffer[idx + 2] = accentColor[2];
        buffer[idx + 3] = 255;
      }
    }
  }

  // Convert RGBA to PNG format
  // Row data with filter byte (0) prepended to each row
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0; // Filter: None
    buffer.copy(rawData, y * rowSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // Deflate compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // No interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.slice(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const png = createPNG(size);
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated: ${filePath} (${png.length} bytes)`);
});
