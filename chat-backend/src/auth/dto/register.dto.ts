import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(50)
  password: string;

  @IsString()
  @MinLength(2, { message: '用户名至少 2 个字符' })
  @MaxLength(50)
  username: string;
}
