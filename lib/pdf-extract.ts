/**
 * PDF text extraction using pdfjs-dist (pure JS, works on Vercel serverless)
 */

export async function extractPdfText(buffer: Buffer | Uint8Array): Promise<string> {
  // Dynamic import to avoid issues with Next.js edge runtime
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as string)

  const data = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer
  const doc = await (pdfjsLib as any).getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise

  const pageTexts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (pageText.length > 10) pageTexts.push(pageText)
  }

  return pageTexts.join('\n\n').trim()
}
