import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, User]),
    AuthModule,
  ],
  providers: [ChatGateway, ChatService, HistoryService],
  controllers: [HistoryController],
})
export class ChatModule {}
