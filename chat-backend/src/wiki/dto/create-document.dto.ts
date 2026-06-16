import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(200)
  title: string;

  @IsString()
  content: string;
}

export class UpdateDocumentDto {
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  content?: string;
}
