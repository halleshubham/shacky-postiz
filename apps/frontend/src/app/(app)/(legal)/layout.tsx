import { ReactNode } from 'react';
import Link from 'next/link';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';

export const dynamic = 'force-dynamic';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-newBgColor text-newTextColor">
      <div className="max-w-[860px] mx-auto px-[20px] py-[40px]">
        <Link href="/" className="inline-block mb-[32px]">
          <LogoTextComponent />
        </Link>
        <div className="bg-newBgColorInner rounded-[12px] p-[32px] lg:p-[48px]">
          {children}
        </div>
      </div>
    </div>
  );
}
