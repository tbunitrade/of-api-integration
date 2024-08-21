// src/dto/search-request.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class SearchRequestDto {
  @ApiProperty({
    type: 'string',
    required: false,
  })
  searchStr?: string;
}
