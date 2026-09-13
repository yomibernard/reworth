import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { NlSearchDto, SearchQueryDto } from './dto/search.dto';
import { SearchService } from './search.service';

@Controller('search')
@Throttle({ search: { limit: 60, ttl: 60_000 } })
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  keyword(@Query() query: SearchQueryDto) {
    return this.search.search(query);
  }

  @Post('nl')
  nl(@Body() dto: NlSearchDto) {
    return this.search.searchNl(dto);
  }
}
