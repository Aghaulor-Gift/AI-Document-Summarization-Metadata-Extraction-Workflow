import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SummarizeOptionsDto {
  @IsOptional()
  @IsString()
  desiredLength?: 'short' | 'medium' | 'long';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxKeywords?: number;
}
