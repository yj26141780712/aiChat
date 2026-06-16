import { IsString, IsOptional, IsIn } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;
}

export class IndexWikiDto {
  @IsString()
  @IsOptional()
  documentId?: string;
}
