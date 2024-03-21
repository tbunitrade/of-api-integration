import { ApiProperty } from '@nestjs/swagger';

export class GroupRequestDto {
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
}
