// Erzeugt einfache einfarbige PNG-Icons (keine externen Deps), damit das Manifest installierbar ist.
import { writeFileSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";
import { Buffer } from "node:buffer";

function crc(buf) {
  // node:zlib exposes crc32 since v22? Fallback: eigene Implementierung
  if (typeof crc32 === "function") {
    return crc32(buf) >>> 0;
  }
  let table = crc.table;
  if (!table) {
    table = crc.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(size, rgb) {
  const raw = Buffer.alloc(size * (1 + size * 3));
  // Hintergrund + grüner Kreis grob (Play-Button-Anmutung)
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * (1 + size * 3) + 1 + x * 3;
      const cx = size / 2, cy = size * 0.42, r = size * 0.24;
      const inCircle = (x - cx) ** 2 + (y - cy) ** 2 < r * r;
      if (inCircle) {
        raw[o] = 0x34; raw[o + 1] = 0xd3; raw[o + 2] = 0x99;
      } else {
        raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2];
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

for (const [file, size] of [["public/icon-192.png", 192], ["public/icon-512.png", 512], ["public/icon-maskable-512.png", 512]]) {
  writeFileSync(file, png(size, [0x10, 0x1c, 0x3d]));
  console.log("wrote", file);
}
