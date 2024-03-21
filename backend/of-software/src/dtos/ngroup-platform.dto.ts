import { ApiProperty } from '@nestjs/swagger';

export class NGroupPlatformRequestDto {
  @ApiProperty({
    type: 'number',
    required: true,
  })
  group_id: number;

  @ApiProperty({
    type: 'number',
    required: true,
  })
  model_id: number;

  @ApiProperty({
    type: 'number',
    required: true,
  })
  platform_id: number;

  @ApiProperty({
    type: 'number',
    required: true,
  })
  count: number;
}
