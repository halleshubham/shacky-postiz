import {
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  IsString,
  Matches,
} from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';

// WhatsApp flags/bans a number that fans out to too many chats from a single
// send, so a post's targets (groups + free-typed numbers combined) are capped
// well below what Botsab itself allows per call.
export const BOTSAB_MAX_RECIPIENTS = 25;

@ValidatorConstraint({ name: 'botsabHasValidTargets', async: false })
class HasValidTargets implements ValidatorConstraintInterface {
  validate(groups: unknown, args: ValidationArguments) {
    const object = args.object as BotsabDto;

    if (groups !== undefined) {
      if (
        !Array.isArray(groups) ||
        !groups.every((group) => typeof group === 'string')
      ) {
        return false;
      }
    }

    const groupsCount = (groups as string[] | undefined)?.length || 0;
    const peopleCount = (object.people || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean).length;
    const total = groupsCount + peopleCount;

    return total > 0 && total <= BOTSAB_MAX_RECIPIENTS;
  }

  defaultMessage() {
    return `Select at least one person or group, up to ${BOTSAB_MAX_RECIPIENTS} in total`;
  }
}

export class BotsabDto {
  @Validate(HasValidTargets)
  @JSONSchema({
    description: 'WhatsApp group ids (from Botsab) to send this post to',
  })
  groups?: string[];

  @ValidateIf((o) => !!o.people)
  @IsString()
  @Matches(/^[0-9+,\s]+$/, {
    message: 'Use phone numbers with country code, separated by commas',
  })
  @JSONSchema({
    description:
      'Comma separated WhatsApp phone numbers (with country code) to send this post to',
  })
  people?: string;
}
