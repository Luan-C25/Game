// Minimal DOCX and ZIP writers for the template pack, run at build time in Node.
// Enough for headings, paragraphs, bullets, fill-in lines and simple tables.

import { deflateRawSync } from "node:zlib";

export type Block =
  | { type: "title" | "h1" | "h2" | "p" | "small"; text: string }
  | { type: "bullet"; text: string }
  | { type: "check"; text: string }
  | { type: "fill"; label: string; lines?: number }
  | { type: "table"; header: string[]; rows: string[][]; widths?: number[] };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function run(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}): string {
  const props = [opts.bold ? "<w:b/>" : "", opts.size ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : "", opts.color ? `<w:color w:val="${opts.color}"/>` : ""].join("");
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

function para(content: string, opts: { after?: number; before?: number; indent?: number; border?: boolean } = {}): string {
  const spacing = `<w:spacing w:before="${opts.before ?? 0}" w:after="${opts.after ?? 120}"/>`;
  const ind = opts.indent ? `<w:ind w:left="${opts.indent}" w:hanging="280"/>` : "";
  const border = opts.border ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="9AA4AE"/></w:pBdr>` : "";
  return `<w:p><w:pPr>${spacing}${ind}${border}</w:pPr>${content}</w:p>`;
}

function blockXml(b: Block): string {
  switch (b.type) {
    case "title":
      return para(run(b.text, { bold: true, size: 40, color: "0B5753" }), { after: 200 });
    case "h1":
      return para(run(b.text, { bold: true, size: 30, color: "16202A" }), { before: 240, after: 120 });
    case "h2":
      return para(run(b.text, { bold: true, size: 24, color: "16202A" }), { before: 200, after: 80 });
    case "p":
      return para(run(b.text, { size: 22 }));
    case "small":
      return para(run(b.text, { size: 18, color: "4D5966" }));
    case "bullet":
      return para(run(`•  ${b.text}`, { size: 22 }), { indent: 360, after: 60 });
    case "check":
      return para(run(`☐  ${b.text}`, { size: 22 }), { indent: 360, after: 80 });
    case "fill": {
      const label = para(run(b.label, { bold: true, size: 20 }), { before: 120, after: 0 });
      const lines = Array.from({ length: b.lines ?? 1 }, () => para(run(" ", { size: 22 }), { border: true, after: 60, before: 120 })).join("");
      return label + lines;
    }
    case "table": {
      const total = 9600;
      const widths = b.widths ?? b.header.map(() => Math.floor(total / b.header.length));
      const cell = (text: string, w: number, header: boolean) =>
        `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${header ? '<w:shd w:val="clear" w:color="auto" w:fill="E3F1EF"/>' : ""}</w:tcPr>${para(run(text || " ", { bold: header, size: 20 }), { after: 40, before: 40 })}</w:tc>`;
      const row = (cells: string[], header = false) => `<w:tr>${cells.map((c, i) => cell(c, widths[i] ?? 1000, header)).join("")}</w:tr>`;
      const borders = ["top", "left", "bottom", "right", "insideH", "insideV"].map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="9AA4AE"/>`).join("");
      return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders>${borders}</w:tblBorders></w:tblPr><w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${row(b.header, true)}${b.rows.map((r) => row(r)).join("")}</w:tbl>${para("", { after: 120 })}`;
    }
  }
}

export function docx(blocks: Block[], footer: string): Uint8Array {
  const body = blocks.map(blockXml).join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${para(run(footer, { size: 16, color: "4D5966" }))}</w:ftr>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:lang w:val="en-AU"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`;
  return zip([
    ["[Content_Types].xml", contentTypes],
    ["_rels/.rels", rels],
    ["word/document.xml", document],
    ["word/styles.xml", styles],
    ["word/footer1.xml", footerXml],
    ["word/_rels/document.xml.rels", docRels],
  ]);
}

// ---- ZIP (deflate) ----

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zip(files: [string, string | Uint8Array][]): Uint8Array {
  const enc = new TextEncoder();
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  // Fixed timestamp (1 Jan 2026) keeps builds reproducible.
  const dosTime = 0;
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;
  for (const [name, content] of files) {
    const data = typeof content === "string" ? enc.encode(content) : content;
    const compressed = deflateRawSync(data);
    const nameBytes = enc.encode(name);
    const crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6); // UTF-8 names
    header.writeUInt16LE(8, 8); // deflate
    header.writeUInt16LE(dosTime, 10);
    header.writeUInt16LE(dosDate, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(nameBytes.length, 26);
    header.writeUInt16LE(0, 28);
    local.push(header, Buffer.from(nameBytes), compressed);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(dosTime, 12);
    cd.writeUInt16LE(dosDate, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(compressed.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBytes.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, Buffer.from(nameBytes));
    offset += 30 + nameBytes.length + compressed.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, centralBuf, end]));
}
