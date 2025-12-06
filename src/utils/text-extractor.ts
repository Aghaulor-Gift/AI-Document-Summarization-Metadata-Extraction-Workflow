import { extname } from 'path';
import pdfParse from 'pdf-parse';

export async function extractTextFromBuffer(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  const ext = extname(originalName).toLowerCase();

  // PDF HANDLING
  if (ext === '.pdf') {
    try {
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (error) {
      throw new Error('PDF is corrupt or unreadable.');
    }
  }

  // DOCX HANDLING — simplified fallback
  if (ext === '.docx') {
    return 'DOCX content extraction placeholder (extend if needed).';
  }

  // TXT HANDLING
  if (ext === '.txt') {
    return buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file extension: ${ext}`);
}
