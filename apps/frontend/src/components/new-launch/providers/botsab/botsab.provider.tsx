'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { FC } from 'react';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { BotsabDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/botsab.dto';
import { BotsabTargetSelect } from '@gitroom/frontend/components/new-launch/providers/botsab/botsab.target.select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useWatch } from 'react-hook-form';

const BotsabComponent: FC = () => {
  const form = useSettings();
  const targetType = useWatch({ control: form.control, name: 'targetType' });

  return (
    <div className="flex flex-col gap-[8px]">
      <Select label="Send To" {...form.register('targetType')}>
        <option value="group">Group</option>
        <option value="person">Person</option>
        <option value="groupList">Group List (drafted in Botsab)</option>
        <option value="contactList">Contact List (drafted in Botsab)</option>
      </Select>
      {targetType === 'group' && (
        <BotsabTargetSelect
          label="Group"
          func="groups"
          {...form.register('targetId')}
        />
      )}
      {targetType === 'groupList' && (
        <BotsabTargetSelect
          label="Group List"
          func="groupLists"
          {...form.register('targetId')}
        />
      )}
      {targetType === 'contactList' && (
        <BotsabTargetSelect
          label="Contact List"
          func="contactLists"
          {...form.register('targetId')}
        />
      )}
      {targetType === 'person' && (
        <Input
          label="Phone number (with country code)"
          placeholder="14155550100"
          {...form.register('phoneNumber')}
        />
      )}
    </div>
  );
};

export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: BotsabComponent,
  CustomPreviewComponent: undefined,
  dto: BotsabDto,
  maximumCharacters: 4096,
});
