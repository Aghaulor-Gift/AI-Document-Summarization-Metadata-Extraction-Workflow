import { extname } from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractTextFromBuffer(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  const ext = extname(originalName).toLowerCase();

  // -------------------------
  // PDF EXTRACTION
  // -------------------------
  if (ext === '.pdf') {
    try {
      const data = await pdfParse(buffer);
      return data.text?.trim() || '';
    } catch (err) {
      throw new Error('PDF is corrupt or unreadable.');
    }
  }

  // -------------------------
  // DOCX EXTRACTION
  // -------------------------
  if (ext === '.docx') {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value?.trim() || '';
    } catch (err) {
      throw new Error('Failed to extract DOCX content.');
    }
  }

  // -------------------------
  // TEXT FILES
  // -------------------------
  if (ext === '.txt') {
    return buffer.toString('utf-8');
  }

  // -------------------------
  // UNSUPPORTED TYPES
  // -------------------------
  throw new Error(`Unsupported file type: ${ext}`);
}
