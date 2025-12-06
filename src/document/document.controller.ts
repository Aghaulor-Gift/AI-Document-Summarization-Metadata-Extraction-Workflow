import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import { SummarizeOptionsDto } from './dto/summarize-options.dto';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { extname } from 'path';
import type { Express } from 'express-serve-static-core';


@ApiTags('Documents')
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('summarize')
  @ApiOperation({ summary: 'Upload a document to generate AI summary + metadata' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        desiredLength: {
          type: 'string',
          enum: ['short', 'medium', 'long'],
        },
        maxKeywords: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Summary generated successfully' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.docx', '.txt'];
        const ext = extname(file.originalname).toLowerCase();

        if (!allowed.includes(ext)) {
          return cb(
            new BadRequestException(
              'Unsupported file type. Only PDF, DOCX, or TXT are allowed.',
            ),
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  async summarize(
   @UploadedFile() file: any
    @Body() options: SummarizeOptionsDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.documentService.summarizeAndExtract(
      file.buffer,
      file.originalname,
      file.mimetype,
      options,
    );
  }
}
