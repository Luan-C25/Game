// A small, dependency-free PDF writer: A4 pages, the built-in Helvetica fonts,
// text, filled rectangles and lines. It is enough for a clean invoice and keeps
// the generator page light (no 300 KB PDF library).

export type FontName = "regular" | "bold";
export type Rgb = [number, number, number];

// Advance widths (1/1000 em) for character codes 32..126, from the standard Adobe AFM metrics.
// prettier-ignore
const HELVETICA = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
// prettier-ignore
const HELVETICA_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

const WIN_ANSI_EXTRAS: Record<string, number> = {
  "€": 0x80, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94,
  "•": 0x95, "–": 0x96, "—": 0x97,
};

/** Map a JS string to WinAnsi byte values. Unsupported characters become "?". */
export function toWinAnsi(text: string): number[] {
  const out: number[] = [];
  for (const ch of text.normalize("NFC")) {
    const code = ch.codePointAt(0) ?? 63;
    if (code >= 32 && code <= 126) out.push(code);
    else if (code >= 160 && code <= 255) out.push(code);
    else if (WIN_ANSI_EXTRAS[ch] !== undefined) out.push(WIN_ANSI_EXTRAS[ch]!);
    else if (ch === "\t" || ch === "\n" || ch === "\r") out.push(32);
    else {
      // Try stripping accents (e.g. a combining form), otherwise fall back to "?".
      const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      const b = base.codePointAt(0) ?? 63;
      out.push(base.length === 1 && b >= 32 && b <= 126 ? b : 63);
    }
  }
  return out;
}

export function textWidth(text: string, size: number, font: FontName = "regular"): number {
  const table = font === "bold" ? HELVETICA_BOLD : HELVETICA;
  let units = 0;
  for (const b of toWinAnsi(text)) units += b >= 32 && b <= 126 ? table[b - 32]! : 556;
  return (units * size) / 1000;
}

/** Greedy word wrap to a maximum width. Long words are broken by character. */
export function wrapText(text: string, size: number, maxWidth: number, font: FontName = "regular"): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (textWidth(candidate, size, font) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (textWidth(word, size, font) <= maxWidth) {
        current = word;
      } else {
        let chunk = "";
        for (const ch of word) {
          if (textWidth(chunk + ch, size, font) > maxWidth && chunk) {
            lines.push(chunk);
            chunk = ch;
          } else chunk += ch;
        }
        current = chunk;
      }
    }
    lines.push(current);
  }
  return lines;
}

function pdfString(text: string): string {
  let s = "(";
  for (const b of toWinAnsi(text)) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) s += "\\" + String.fromCharCode(b);
    else if (b < 32 || b > 126) s += "\\" + b.toString(8).padStart(3, "0");
    else s += String.fromCharCode(b);
  }
  return s + ")";
}

const n = (v: number) => (Math.round(v * 100) / 100).toString();
const rgb = (c: Rgb) => c.map((v) => n(v)).join(" ");

export class PdfPage {
  readonly width: number;
  readonly height: number;
  private ops: string[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /** Coordinates are measured from the top-left corner, like a screen. */
  text(x: number, top: number, text: string, opts: { size?: number; font?: FontName; color?: Rgb; align?: "left" | "right" | "center" } = {}): void {
    const size = opts.size ?? 10;
    const font = opts.font ?? "regular";
    let left = x;
    if (opts.align === "right") left = x - textWidth(text, size, font);
    else if (opts.align === "center") left = x - textWidth(text, size, font) / 2;
    const y = this.height - top - size * 0.8;
    this.ops.push(`BT /${font === "bold" ? "F2" : "F1"} ${n(size)} Tf ${rgb(opts.color ?? [0, 0, 0])} rg ${n(left)} ${n(y)} Td ${pdfString(text)} Tj ET`);
  }

  rect(x: number, top: number, w: number, h: number, color: Rgb): void {
    this.ops.push(`${rgb(color)} rg ${n(x)} ${n(this.height - top - h)} ${n(w)} ${n(h)} re f`);
  }

  line(x1: number, top1: number, x2: number, top2: number, color: Rgb = [0.8, 0.8, 0.8], width = 0.75): void {
    this.ops.push(`${rgb(color)} RG ${n(width)} w ${n(x1)} ${n(this.height - top1)} m ${n(x2)} ${n(this.height - top2)} l S`);
  }

  /** Draw a QR code (or any boolean grid) as filled squares. Runs in a row are merged. */
  modules(x: number, top: number, grid: boolean[][], cell: number, color: Rgb = [0, 0, 0]): void {
    const parts: string[] = [`${rgb(color)} rg`];
    grid.forEach((row, r) => {
      let c = 0;
      while (c < row.length) {
        if (!row[c]) {
          c++;
          continue;
        }
        const start = c;
        while (c < row.length && row[c]) c++;
        parts.push(`${n(x + start * cell)} ${n(this.height - top - (r + 1) * cell)} ${n((c - start) * cell)} ${n(cell)} re`);
      }
    });
    parts.push("f");
    this.ops.push(parts.join("\n"));
  }

  content(): string {
    return this.ops.join("\n");
  }
}

export const A4: [number, number] = [595.28, 841.89];

export class PdfDocument {
  readonly pages: PdfPage[] = [];
  title = "";

  addPage(size: [number, number] = A4): PdfPage {
    const page = new PdfPage(size[0], size[1]);
    this.pages.push(page);
    return page;
  }

  toBytes(): Uint8Array {
    // Object numbers: 1 catalog, 2 pages, 3 F1, 4 F2, 5 info, then per page: page + content.
    const objects: string[] = [];
    const pageIds = this.pages.map((_, i) => 6 + i * 2);
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${this.pages.length} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    objects[5] = `<< /Title ${pdfString(this.title)} /Producer (ShiftBill) >>`;
    this.pages.forEach((page, i) => {
      const pageId = pageIds[i]!;
      const stream = page.content();
      objects[pageId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(page.width)} ${n(page.height)}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
      objects[pageId + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });

    // Every byte written below is ASCII, so string length equals byte length.
    let out = "%PDF-1.4\n%âãÏÓ\n";
    const offsets: number[] = [];
    for (let id = 1; id < objects.length; id++) {
      offsets[id] = byteLength(out);
      out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }
    const xrefOffset = byteLength(out);
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objects.length; id++) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    out += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return latin1Bytes(out);
  }
}

function byteLength(s: string): number {
  return s.length; // every character is written as a single byte by latin1Bytes
}

function latin1Bytes(s: string): Uint8Array {
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
  return bytes;
}
