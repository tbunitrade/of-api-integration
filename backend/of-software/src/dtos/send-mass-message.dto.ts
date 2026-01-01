export class SendMassMessageDto {
  modelPlatformId: number;
  text: string;

  userLists?: string[];
  excludedLists?: string[];
  userIds?: number[];
}
