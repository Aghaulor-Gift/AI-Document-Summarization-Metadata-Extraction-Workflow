import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Documents')
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload a PDF or DOCX document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Document uploaded and stored' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async upload(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.documentService.uploadDocument(file);
  }

  @Post(':id/analyze')
  @HttpCode(200)
  @ApiOperation({ summary: 'Analyze a previously uploaded document with LLM' })
  @ApiParam({ name: 'id', type: 'string' })
  async analyze(@Param('id') id: string) {
    return this.documentService.analyzeDocument(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stored document info, text, summary, and metadata' })
  @ApiParam({ name: 'id', type: 'string' })
  async getOne(@Param('id') id: string) {
    return this.documentService.getDocument(id);
  }
}
