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
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Documents')
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('summarize')
  @ApiOperation({ summary: 'Upload a document to generate AI summary and metadata' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        desiredLength: { type: 'string', enum: ['short', 'medium', 'long'] },
        maxKeywords: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Summary generated successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async summarize(
    @UploadedFile() file: any,            // <-- IMPORTANT, THIS FIXES YOUR ERROR
    @Body() options: SummarizeOptionsDto, // <-- Must end with a closing parenthesis below
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
