import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { extractTextFromBuffer } from '../utils/text-extractor';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as crypto from 'crypto';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly gemini: GoogleGenerativeAI;
  private readonly modelName: string;
  private readonly uploadDir: string;
  private readonly maxFileSizeBytes: number;
  private readonly allowedExtensions: string[];
  private readonly aiTimeoutMs: number;
  private readonly aiMaxRetries: number;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('Missing GEMINI_API_KEY — AI engine cannot run.');
    }

    this.gemini = new GoogleGenerativeAI(apiKey);
    this.modelName = this.config.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';

    // Configurable limits
    this.maxFileSizeBytes =
      Number(this.config.get('MAX_FILE_SIZE')) || 5 * 1024 * 1024; // default 5MB

    const allowed = this.config.get<string>('ALLOWED_FILE_TYPES') || '.pdf,.docx';
    this.allowedExtensions = allowed.split(',').map((ext) => ext.trim().toLowerCase());

    this.aiTimeoutMs = Number(this.config.get('GEMINI_TIMEOUT_MS')) || 25_000; // 25s
    this.aiMaxRetries = Number(this.config.get('GEMINI_MAX_RETRIES')) || 2;

    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private sanitizeFileName(originalName: string): string {
    const base = path.basename(originalName);
    const safe = base.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const truncated = safe.slice(-80); // keep last 80 chars max
    return truncated || `file_${Date.now()}`;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`AI request timed out after ${ms}ms`));
      }, ms);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private extractFirstJsonBlock(text: string): string {
    // Handle ```json ... ``` or plain text with JSON inside
    const codeBlockMatch = text.match(/```json([\s\S]*?)```/i);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Fallback: grab first {...} block
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return text.slice(firstBrace, lastBrace + 1);
    }
    return text.trim();
  }

  private async failDocument(id: string, reason?: string) {
    if (reason) {
      this.logger.warn(`Marking document ${id} as failed: ${reason}`);
    }
    await this.prisma.document.update({
      where: { id },
      data: { status: 'failed' },
    });
  }

  // ------------------------------------------------------------------
  // POST /documents/upload
  // ------------------------------------------------------------------
  async uploadDocument(file: any) {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    // Extra safety: validate buffer length too
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty or unreadable.');
    }

    const size = file.size ?? file.buffer.length;
    if (size > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `File too large. Max allowed size is ${Math.round(this.maxFileSizeBytes / (1024 * 1024))}MB.`,
      );
    }

    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `Unsupported file type. Allowed types: ${this.allowedExtensions.join(', ')}`,
      );
    }

    // Sanitize filename and avoid directory traversal
    const safeName = this.sanitizeFileName(file.originalname || 'document');
    const uniquePrefix = crypto.randomBytes(6).toString('hex');
    const filename = `${Date.now()}-${uniquePrefix}-${safeName}`;
    const storagePath = path.join(this.uploadDir, filename);

    try {
      await fs.promises.writeFile(storagePath, file.buffer);
    } catch (err) {
      this.logger.error('Failed to store file on disk', err as Error);
      throw new InternalServerErrorException('Failed to store uploaded file.');
    }

    // Extract text
    let text: string;
    try {
      text = await extractTextFromBuffer(file.buffer, file.originalname, file.mimetype);
    } catch (err) {
      this.logger.error('Text extraction failed', err as Error);
      // Optional: cleanup stored file when extraction fails
      try {
        await fs.promises.unlink(storagePath);
      } catch {
        // ignore cleanup errors
      }
      throw new InternalServerErrorException(
        'We could not read text from this document. If it is scanned or image-only, OCR is not supported yet.',
      );
    }

    if (!text || text.trim().length < 5) {
      try {
        await fs.promises.unlink(storagePath);
      } catch {
        // ignore
      }
      throw new BadRequestException(
        'The uploaded document contains no readable text. Please upload a text-based PDF/DOCX.',
      );
    }

    // Save document record in DB
    const doc = await this.prisma.document.create({
      data: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size,
        storagePath,
        extractedText: text,
        status: 'uploaded',
      },
    });

    return {
      id: doc.id,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      status: doc.status,
      createdAt: doc.createdAt,
    };
  }

  // ------------------------------------------------------------------
  // POST /documents/:id/analyze
  // ------------------------------------------------------------------
  async analyzeDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });

    if (!doc) {
      throw new NotFoundException('Document not found.');
    }

    if (!doc.extractedText || doc.extractedText.trim().length < 5) {
      throw new InternalServerErrorException(
        'Document has no extracted text to analyze. Try re-uploading a clearer document.',
      );
    }

    // Idempotency: if already analyzed, just return
    if (doc.status === 'analyzed') {
      return {
        id: doc.id,
        status: doc.status,
        summary: doc.summary,
        docType: doc.docType,
        metadata: doc.metadata,
      };
    }

    if (doc.status === 'processing') {
      throw new ConflictException('Document analysis is already in progress.');
    }

    // Mark as processing
    await this.prisma.document.update({
      where: { id },
      data: { status: 'processing' },
    });

    const text = doc.extractedText.slice(0, 8000);

    const prompt = `
You are an expert document analyst.
Return ONLY valid minified JSON. No explanation. No markdown. No backticks.

Analyze the following text and produce an object with:
- "summary": concise human-readable summary
- "docType": one of ["invoice", "cv", "report", "letter", "contract", "other"]
- "metadata": an object containing relevant attributes such as:
   - "date"
   - "sender"
   - "recipient"
   - "totalAmount"
   - "subject"
   - "additionalDetails"

Text:
${text}
`;

    try {
      const model = this.gemini.getGenerativeModel({ model: this.modelName });

      const runGeminiOnce = async () => {
        const result = await model.generateContent(prompt);
        return result.response.text();
      };

      // Retry with timeout
      let responseText: string | null = null;
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= this.aiMaxRetries; attempt++) {
        try {
          this.logger.debug(`Calling Gemini (attempt ${attempt}) for document ${id}`);
          responseText = await this.withTimeout(runGeminiOnce(), this.aiTimeoutMs);
          break;
        } catch (err) {
          lastError = err;
          this.logger.warn(`Gemini attempt ${attempt} failed: ${(err as Error).message}`);
          if (attempt === this.aiMaxRetries) {
            throw err;
          }
        }
      }

      if (!responseText || responseText.trim().length === 0) {
        await this.failDocument(id, 'Gemini returned empty response');
        throw new InternalServerErrorException('AI returned an empty response.');
      }

      const jsonCandidate = this.extractFirstJsonBlock(responseText);

      let parsed: any;
      try {
        parsed = JSON.parse(jsonCandidate);
      } catch (err) {
        this.logger.error('Failed to parse Gemini JSON', err as Error);
        this.logger.debug(`Raw AI output: ${responseText}`);
        await this.failDocument(id, 'Invalid JSON from AI');
        throw new InternalServerErrorException(
          'AI generated an invalid response. Please try again with a clearer document.',
        );
      }

      if (!parsed.summary || !parsed.docType) {
        await this.failDocument(id, 'Missing required fields in AI output');
        throw new InternalServerErrorException(
          'AI response was incomplete. Please try again or use a simpler document.',
        );
      }

      // Optional: constrain metadata size to avoid insane payloads
      if (parsed.metadata && JSON.stringify(parsed.metadata).length > 10_000) {
        this.logger.warn(`Metadata too large for document ${id}, truncating.`);
        parsed.metadata = { notice: 'Metadata truncated due to size.' };
      }

      const updated = await this.prisma.document.update({
        where: { id },
        data: {
          summary: parsed.summary,
          docType: parsed.docType,
          metadata: parsed.metadata ?? {},
          status: 'analyzed',
        },
      });

      return {
        id: updated.id,
        status: updated.status,
        summary: updated.summary,
        docType: updated.docType,
        metadata: updated.metadata,
      };
    } catch (err) {
      this.logger.error('Gemini analysis failed', err as Error);
      await this.failDocument(id, (err as Error).message);
      throw new InternalServerErrorException(
        'AI summarization failed. Please try again later or with a smaller document.',
      );
    }
  }

  // ------------------------------------------------------------------
  // GET /documents/:id
  // ------------------------------------------------------------------
  async getDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });

    if (!doc) {
      throw new NotFoundException('Document not found.');
    }

    return {
      id: doc.id,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      storagePath: doc.storagePath,
      status: doc.status,
      summary: doc.summary,
      docType: doc.docType,
      metadata: doc.metadata,
      extractedText: doc.extractedText,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
