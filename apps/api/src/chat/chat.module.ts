import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatGateway } from './chat.gateway';
import { ChatScanProcessor } from './chat-scan.processor';
import { ChatScanService } from './chat-scan.service';
import { ConversationsController } from './conversations.controller';
import { MessagesService } from './messages.service';
import { NotificationStub } from './notification.stub';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ConversationsController],
  providers: [
    MessagesService,
    ChatScanService,
    ChatScanProcessor,
    ChatGateway,
    NotificationStub,
  ],
  exports: [MessagesService, ChatGateway, NotificationStub, ChatScanService],
})
export class ChatModule {}
