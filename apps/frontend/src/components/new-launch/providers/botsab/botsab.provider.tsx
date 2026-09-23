'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { FC } from 'react';
import { Input } from '@gitroom/react/form/input';
import { BotsabDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/botsab.dto';
import { BotsabGroupsSelect } from '@gitroom/frontend/components/new-launch/providers/botsab/botsab.groups.select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';

const BotsabComponent: FC = () => {
  const form = useSettings();
  return (
    <div className="flex flex-col gap-[8px]">
      <BotsabGroupsSelect {...form.register('groups')} />
      <Input
        label="People (comma separated phone numbers, with country code)"
        placeholder="14155550100, 447700900000"
        {...form.register('people')}
      />
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
