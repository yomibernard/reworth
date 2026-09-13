import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.orders.listForUser(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.getById(id, user.id);
  }

  @Post(':id/handed-over')
  handedOver(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.markHandedOver(id, user.id);
  }

  @Post(':id/confirm-receipt')
  confirmReceipt(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.confirmReceipt(id, user.id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.cancel(id, user.id);
  }
}
