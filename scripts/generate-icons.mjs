/**
 * SUBTRACK // ASSET FORGE
 *
 * Draws the app icon set and the grain texture with zero dependencies:
 * a ~40-line PNG encoder (zlib is in Node) plus a rect rasteriser.
 * The mark is built from the same language as the UI — hard rectangles,
 * a chamfered crop, a baseline rail and one signal LED.
 *
 *   node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/* ------------------------------------------------------------------ PNG ---- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(
      raw,
      y * (width * 4 + 1) + 1,
    )
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ------------------------------------------------------------- rasteriser -- */
function makeCanvas(size, scale = 1) {
  const px = new Uint8Array(size * size * 4) // transparent
  const sx = (x) => 0.5 + (x - 0.5) * scale
  const sw = (w) => w * scale
  const put = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    const sa = a / 255
    const da = px[i + 3] / 255
    const oa = sa + da * (1 - sa)
    if (oa === 0) return
    px[i] = Math.round((r * sa + px[i] * da * (1 - sa)) / oa)
    px[i + 1] = Math.round((g * sa + px[i + 1] * da * (1 - sa)) / oa)
    px[i + 2] = Math.round((b * sa + px[i + 2] * da * (1 - sa)) / oa)
    px[i + 3] = Math.round(oa * 255)
  }
  return {
    px,
    /** Axis-aligned rectangle in 0..1 unit space, scaled by canvas + scale. */
    rect(x, y, w, h, color, a = 255) {
      const x0 = Math.round(sx(x) * size)
      const y0 = Math.round(sx(y) * size)
      const x1 = Math.round((sx(x) + sw(w)) * size)
      const y1 = Math.round((sx(y) + sw(h)) * size)
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) put(xx, yy, color, a)
    },
    /** Hard 45deg chamfer, like the UI's clip-cut corners. */
    chamfer(corner, cut, color, a = 255) {
      const c = Math.round(cut * size)
      for (let i = 0; i < c; i++)
        for (let j = 0; j < c - i; j++) {
          if (corner === 'tr') put(size - 1 - j, i, color, a)
          else put(j, size - 1 - i, color, a)
        }
    },
  }
}

const VOID = [0x05, 0x05, 0x05]
const ACID = [0xb7, 0xff, 0x00]
const INK = [0xf4, 0xf4, 0xf4]
const GRID = [0xf4, 0xf4, 0xf4]

/** The SUBTRACK mark: an ascending load register over a deposit rail. */
function drawMark(canvas, { plate = true, grid = true } = {}) {
  if (plate) canvas.rect(0, 0, 1, 1, VOID)

  if (grid) {
    for (let i = 1; i < 8; i++) {
      canvas.rect(0, i / 8 - 0.0009, 1, 0.0018, GRID, 26)
      canvas.rect(i / 8 - 0.0009, 0, 0.0018, 1, GRID, 26)
    }
  }

  // margin brackets — the exposed structure of the system frame
  canvas.rect(0.08, 0.08, 0.16, 0.014, GRID, 90)
  canvas.rect(0.08, 0.08, 0.014, 0.16, GRID, 90)
  canvas.rect(0.76, 0.906, 0.16, 0.014, GRID, 90)
  canvas.rect(0.906, 0.76, 0.014, 0.16, GRID, 90)

  // three load bars: the burn, ascending
  canvas.rect(0.26, 0.56, 0.108, 0.2, ACID)
  canvas.rect(0.446, 0.44, 0.108, 0.32, ACID)
  canvas.rect(0.632, 0.24, 0.108, 0.52, ACID)

  // signal LED on the tallest bar
  canvas.rect(0.84, 0.24, 0.045, 0.045, INK)

  // deposit rail
  canvas.rect(0.26, 0.8, 0.48, 0.05, INK)
}

function writeIcon(relPath, size, opts) {
  const canvas = makeCanvas(size, opts.scale ?? 1)
  drawMark(canvas, opts)
  if (opts.chamfer) canvas.chamfer('tr', 0.14, VOID)
  const out = join(ROOT, relPath)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, encodePNG(size, size, canvas.px))
  return `${relPath} (${size}x${size})`
}

/* ------------------------------------------------------------- grain ------ */
function mulberry32(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function writeNoise(size = 96) {
  const rand = mulberry32(0x5eed)
  const canvas = makeCanvas(size)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const v = rand()
      const lum = v < 0.5 ? 0 : 255
      canvas.rect(x / size, y / size, 1 / size, 1 / size, [lum, lum, lum], 120)
    }
  const out = join(ROOT, 'public/textures/noise.png')
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, encodePNG(size, size, canvas.px))
  return `public/textures/noise.png (${size}x${size})`
}

/* ----------------------------------------------------------------- main --- */
const report = [
  writeIcon('public/icons/icon-192.png', 192, { plate: true, grid: true }),
  writeIcon('public/icons/icon-512.png', 512, { plate: true, grid: true }),
  writeIcon('public/icons/maskable-512.png', 512, { plate: true, grid: false, scale: 0.72 }),
  writeIcon('public/icons/apple-touch-icon.png', 180, { plate: true, grid: false, scale: 0.9 }),
  writeNoise(),
]
console.log('[SUBTRACK] assets forged:\n  ' + report.join('\n  '))
