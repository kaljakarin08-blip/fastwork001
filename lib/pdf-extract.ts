/**
 * PDF text extraction using unpdf (serverless-safe, no worker required)
 * https://github.com/unjs/unpdf
 */

export async function extractPdfText(buffer: Buffer | Uint8Array): Promise<string> {
  const { extractText } = await import('unpdf')
  const data = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer
  const { text } = await extractText(data, { mergePages: true })
  return text?.trim() ?? ''
}
