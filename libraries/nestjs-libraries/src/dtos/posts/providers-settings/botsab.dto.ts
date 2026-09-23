import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';

export class BotsabDto {
  @IsIn(['group', 'person', 'groupList', 'contactList'])
  @JSONSchema({
    description:
      'Where to send: a single WhatsApp group, a single person, or a group/contact list already drafted in Botsab',
  })
  targetType: 'group' | 'person' | 'groupList' | 'contactList';

  @ValidateIf((o) => o.targetType !== 'person')
  @MinLength(1)
  @IsString()
  @JSONSchema({
    description:
      'The selected group id, group list id or contact list id, depending on targetType',
  })
  @IsOptional()
  targetId?: string;

  @ValidateIf((o) => o.targetType === 'person')
  @Matches(/^[0-9+]+$/, {
    message: 'Use a phone number with country code',
  })
  @JSONSchema({
    description: 'Phone number (with country code) to message directly',
  })
  @IsOptional()
  phoneNumber?: string;
}
