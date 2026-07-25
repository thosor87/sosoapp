import QRCode from 'qrcode'

export interface QrPdfEntry {
  label: string
  sub: string
  url: string
  /** Akzentfarbe als RGB. */
  accent: [number, number, number]
  small?: boolean
}

const GRAY_BORDER: [number, number, number] = [231, 229, 228]
const INK: [number, number, number] = [28, 25, 23]
const MUTED: [number, number, number] = [120, 113, 108]
const LIGHT: [number, number, number] = [168, 162, 158]

/** Normalisiert Typografie-Zeichen und entfernt, was die Standard-PDF-Schrift
 *  (Latin-1) nicht darstellen kann (z. B. Emoji). */
function pdfSafe(s: string): string {
  const normalized = s
    .replace(/→/g, '->')
    .replace(/[–—]/g, '-')
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
  let out = ''
  for (const ch of normalized) {
    if (ch.charCodeAt(0) <= 0xff) out += ch
  }
  return out.trim()
}

async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#1c1917', light: '#ffffff' },
  })
}

/**
 * Erzeugt ein A4-PDF mit allen QR-Codes auf einer Seite und lädt es herunter.
 * jsPDF wird dynamisch importiert, damit es das Haupt-Bundle nicht belastet.
 */
export async function generateQrSheetPdf(entries: QrPdfEntry[]): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const pageW = 210
  const margin = 10
  const contentW = pageW - 2 * margin
  const centerX = pageW / 2

  // QR-Bilder vorab erzeugen
  const images = await Promise.all(entries.map((e) => qrDataUrl(e.url)))

  // ── Kopf ──────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...INK)
  doc.text('Ja?Wort — QR-Codes für die Rätsel-Rallye', centerX, 18, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...MUTED)
  doc.text('Birgit & Thomas · zwei Teams · drei Lösungswörter → what3words', centerX, 24, {
    align: 'center',
  })

  const sectionHeading = (text: string, y: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text(pdfSafe(text.toUpperCase()), margin, y)
    doc.setDrawColor(...GRAY_BORDER)
    doc.setLineWidth(0.3)
    doc.line(margin, y + 1.5, pageW - margin, y + 1.5)
  }

  const drawTile = (
    e: QrPdfEntry,
    img: string,
    x: number,
    yTop: number,
    w: number,
    qrSize: number
  ) => {
    const h = qrSize + 24
    // Rahmen
    doc.setDrawColor(...GRAY_BORDER)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, yTop, w, h, 2, 2, 'S')
    // Akzentlinie oben
    doc.setDrawColor(...e.accent)
    doc.setLineWidth(1.2)
    doc.line(x + 2, yTop + 1, x + w - 2, yTop + 1)

    const cx = x + w / 2
    // Tag (Team/Beide)
    // (Beschriftung steckt in sub/label – hier nur QR + Texte)
    // QR
    const qx = x + (w - qrSize) / 2
    doc.addImage(img, 'PNG', qx, yTop + 5, qrSize, qrSize, undefined, 'SLOW')
    let ty = yTop + 5 + qrSize + 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(e.small ? 11 : 9.5)
    doc.setTextColor(...INK)
    doc.text(pdfSafe(e.label), cx, ty, { align: 'center' })
    ty += 4.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(pdfSafe(e.sub), cx, ty, { align: 'center' })
    ty += 3.8
    doc.setFontSize(6.5)
    doc.setTextColor(...LIGHT)
    const shortUrl = e.url.replace(/^https?:\/\//, '')
    doc.text(pdfSafe(shortUrl), cx, ty, { align: 'center' })
    return h
  }

  const smalls = entries.map((e, i) => ({ e, img: images[i] })).filter((x) => x.e.small)
  const bigs = entries.map((e, i) => ({ e, img: images[i] })).filter((x) => !x.e.small)

  let y = 34
  // ── Lichterkette (kleine Kacheln) ─────────────────────
  if (smalls.length) {
    sectionHeading('Start · an der Lichterkette (zwei QR-Codes)', y)
    y += 5
    const gap = 6
    const w = (contentW - gap * (smalls.length - 1)) / smalls.length
    let maxH = 0
    smalls.forEach((s, i) => {
      const h = drawTile(s.e, s.img, margin + i * (w + gap), y, w, 30)
      maxH = Math.max(maxH, h)
    })
    y += maxH + 6
  }

  // ── Weitere Stationen (3 Spalten) ─────────────────────
  if (bigs.length) {
    sectionHeading('Weitere Stationen', y)
    y += 5
    const cols = 3
    const gap = 5
    const w = (contentW - gap * (cols - 1)) / cols
    const rowStartY = y
    bigs.forEach((b, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const tx = margin + col * (w + gap)
      const ty = rowStartY + row * (34 + 24 + 6)
      drawTile(b.e, b.img, tx, ty, w, 34)
    })
    const rows = Math.ceil(bigs.length / cols)
    y = rowStartY + rows * (34 + 24 + 6)
  }

  // ── Fuß ───────────────────────────────────────────────
  doc.setDrawColor(...GRAY_BORDER)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...LIGHT)
  doc.text(
    pdfSafe('Ausschneiden und an der jeweiligen Station platzieren.'),
    centerX,
    y + 5,
    { align: 'center' }
  )

  doc.save('qr-codes-raetsel-rallye.pdf')
}
