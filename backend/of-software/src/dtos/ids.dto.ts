import { ApiProperty } from '@nestjs/swagger';

export class IdsDto {
  @ApiProperty({
    type: 'array',
    required: true,
  })
  group_ids: number[];
}
