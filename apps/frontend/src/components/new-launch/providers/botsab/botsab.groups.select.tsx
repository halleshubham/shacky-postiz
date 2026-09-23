'use client';

import { FC, useEffect, useState } from 'react';
import { MultiSelect } from '@gitroom/react/form/multi.select';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';

// Loads the WhatsApp groups Botsab knows about for this instance and wires
// them into the shared MultiSelect primitive, the same way WordPress's
// category/tag pickers do.
export const BotsabGroupsSelect: FC<{
  name: string;
  onChange: (event: {
    target: {
      value: string[];
      name: string;
    };
  }) => void;
}> = (props) => {
  const { name, onChange } = props;
  const customFunc = useCustomProviderFunction();
  const form = useSettings();
  const { getValues } = form;
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [selected, setSelected] = useState<Array<string | number>>([]);

  useEffect(() => {
    customFunc.get('groups').then((data) => setGroups(data || []));
    const settings = getValues()[name];
    if (Array.isArray(settings)) {
      setSelected(settings);
    }
  }, []);

  const onChangeInner = (value: Array<string | number>) => {
    const ids = value.map((current) => String(current));
    setSelected(ids);
    form.setValue(name, ids, { shouldValidate: true });
    onChange?.({ target: { name, value: ids } });
  };

  if (!groups.length) {
    return null;
  }

  return (
    <MultiSelect
      name={name}
      label="Groups"
      value={selected}
      onChange={onChangeInner}
      options={groups.map((group) => ({
        label: group.name,
        value: group.id,
      }))}
    />
  );
};
