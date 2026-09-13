import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { NlSearchDto, SearchQueryDto } from './dto/search.dto';
import { SearchService } from './search.service';

@Controller('search')
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
