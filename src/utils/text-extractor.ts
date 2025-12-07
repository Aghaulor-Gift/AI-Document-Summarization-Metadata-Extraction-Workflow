import { extname } from 'path';
import pdfParse from 'pdf-parse';

export async function extractTextFromBuffer(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  const ext = extname(originalName).toLowerCase();

  if (ext === '.pdf') {
    try {
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch {
      throw new Error('PDF is corrupt or unreadable.');
    }
  }

  if (ext === '.docx') {
    // TODO: implement real DOCX parsing using e.g. 'mammoth' or 'docx-parser'
    return 'DOCX extraction placeholder — implement with a proper library for full support.';
  }

  if (ext === '.txt') {
    return buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file type: ${ext}`);
}
