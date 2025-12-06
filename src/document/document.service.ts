import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SummarizeOptionsDto } from './dto/summarize-options.dto';
import { extractTextFromBuffer } from '../utils/text-extractor';
import { SummaryResult } from './types/summary-result.type';
import OpenAI from 'openai';

@Injectable()
export class DocumentService {
  private readonly openai: OpenAI;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Missing OPENAI_API_KEY — AI engine cannot run.',
      );
    }

    this.openai = new OpenAI({ apiKey });
  }

  async summarizeAndExtract(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options: SummarizeOptionsDto,
  ): Promise<SummaryResult> {
    // -----------------------------
    // 1. Extract Text Safely
    // -----------------------------
    let text: string;

    try {
      text = await extractTextFromBuffer(buffer, originalName, mimeType);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to extract text: ${(error as Error).message}`,
      );
    }

    if (!text || text.trim().length < 5) {
      throw new InternalServerErrorException(
        'The uploaded document contains no readable or valid text.',
      );
    }

    // -----------------------------
    // 2. Trim Document to Avoid Token Overflow
    // -----------------------------
    const trimmed = text.length > 8000 ? text.slice(0, 8000) : text;

    // -----------------------------
    // 3. Prepare the Prompt for LLM
    // -----------------------------
    const prompt = `
Return ONLY valid JSON. No explanations. No markdown.

Summarize the following text and extract metadata into this structure:

{
  "summary": "",
  "title": "",
  "keywords": [],
  "language": "",
  "domain": "",
  "sentiment": ""
}

Text:
${trimmed}
`;

    // -----------------------------
    // 4. Call OpenAI Chat Completion API (Correct way)
    // -----------------------------
    let completion;

    try {
      completion = await this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });
    } catch (error) {
      console.error("OpenAI Error:", error);
      throw new InternalServerErrorException(
        'AI summarization request failed. Try again later.',
      );
    }

    // -----------------------------
    // 5. Extract Raw AI Output
    // -----------------------------
    const raw = completion.choices[0]?.message?.content ?? "";

    if (!raw || raw.trim().length === 0) {
      throw new InternalServerErrorException(
        'AI returned an empty or invalid response.',
      );
    }

    // -----------------------------
    // 6. Parse the JSON Response Safely
    // -----------------------------
    let parsed: SummaryResult;

    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Invalid JSON from AI:", raw);
      throw new InternalServerErrorException(
        'AI returned malformed JSON. Try a shorter or clearer document.',
      );
    }

    // -----------------------------
    // 7. Validate Required Fields
    // -----------------------------
    const requiredFields = [
      'summary',
      'title',
      'keywords',
      'language',
      'domain',
      'sentiment',
    ];

    for (const field of requiredFields) {
      if (!(field in parsed)) {
        throw new InternalServerErrorException(
          `AI response missing required field: ${field}`,
        );
      }
    }

    return parsed;
  }
}
