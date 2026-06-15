import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // 允许 Angular 开发服务器跨域访问
  await app.listen(3000);
  console.log('后端服务已启动: http://localhost:3000');
}
bootstrap();
