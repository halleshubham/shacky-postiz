import React, { FC } from 'react';
import clsx from 'clsx';

export const LogoTextComponent: FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <img
      src="/logo-full.png"
      alt="SocioBird"
      className={clsx('h-[48px] w-auto object-contain', className)}
    />
  );
};
