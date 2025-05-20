// src/dtos/delete-many.dto,ts

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty,IsInt} from 'class-validator';

export class DeleteManyDto {
  @ApiProperty({ type: [Number]})
  @IsArray()
  @ArrayNotEmpty()
  @IsInt( {each:true})
  ids: number[]
}
