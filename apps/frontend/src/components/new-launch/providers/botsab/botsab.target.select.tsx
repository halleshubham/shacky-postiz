'use client';

import { FC, useEffect, useState } from 'react';
import { useCustomProviderFunction } from '@gitroom/frontend/components/launches/helpers/use.custom.provider.function';
import { Select } from '@gitroom/react/form/select';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

// Single-select target picker shared by all three list-backed Botsab target
// types (live groups, and group/contact lists already drafted in Botsab) -
// which list it loads is picked with `func`, same parameterization as
// WordpressTerms uses for categories vs tags.
export const BotsabTargetSelect: FC<{
  name: string;
  label: string;
  func: string;
  onChange: (event: { target: { value: string; name: string } }) => void;
}> = (props) => {
  const { name, label, func, onChange } = props;
  const t = useT();
  const customFunc = useCustomProviderFunction();
  const [options, setOptions] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const { getValues } = useSettings();
  const [currentValue, setCurrentValue] = useState<string | undefined>();

  const onChangeInner = (event: {
    target: { value: string; name: string };
  }) => {
    setCurrentValue(event.target.value);
    onChange(event);
  };

  useEffect(() => {
    customFunc.get(func).then((data) => setOptions(data || []));
    const settings = getValues()[name];
    if (settings) {
      setCurrentValue(settings);
    }
  }, [func]);

  if (!options.length) {
    return null;
  }

  return (
    <Select name={name} label={label} onChange={onChangeInner} value={currentValue}>
      <option value="">{t('select_1', '--Select--')}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </Select>
  );
};
