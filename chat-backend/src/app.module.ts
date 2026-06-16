import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { WikiModule } from './wiki/wiki.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { Conversation } from './chat/entities/conversation.entity';
import { Message } from './chat/entities/message.entity';
import { User } from './auth/entities/user.entity';
import { Document } from './wiki/entities/document.entity';
import { KnowledgeDocument } from './knowledge/entities/knowledge-document.entity';
import { KnowledgeChunk } from './knowledge/entities/knowledge-chunk.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE'),
        entities: [User, Conversation, Message, Document, KnowledgeDocument, KnowledgeChunk],
        synchronize: true,
        dropSchema: false,
      }),
    }),
    AuthModule,
    ChatModule,
    WikiModule,
    KnowledgeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true, // 自动剔除 DTO 之外的属性
        transform: true, // 自动类型转换
      }),
    },
  ],
})
export class AppModule {}
