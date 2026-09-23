'use client';

import { withContinueProvider } from '../with-continue-provider';

interface BotsabListItem {
  id: string;
  name: string;
}

export const BotsabContinue = withContinueProvider<BotsabListItem, string>({
  endpoint: 'pages',
  swrKey: 'load-botsab-lists',
  titleKey: 'select_botsab_list',
  titleDefault: 'Select Group List or Contact List:',
  emptyStateMessages: [
    {
      key: 'botsab_no_lists_found',
      text: "We couldn't find any group list or contact list drafted in Botsab for this instance.",
    },
    {
      key: 'botsab_draft_a_list',
      text: 'Draft a group list or contact list in Botsab first, then add this channel again.',
    },
  ],
  getItemId: (item) => item.id,
  getSelectionValue: (item) => item.id,
  transformSaveData: (selection) => ({ page: selection }),
  isSelected: (item, selection) => selection === item.id,
  renderItem: (item) => <div>{item.name}</div>,
});
