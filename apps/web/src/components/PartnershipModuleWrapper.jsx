'use client';

import PartnershipModule from './PartnershipModule';
import { usePathname } from 'next/navigation';

export default function PartnershipModuleWrapper() {
  const pathname = usePathname();

  // Keep auth flows focused (no global marketing modules on sign-in/sign-up pages).
  const authPaths = ['/signin', '/signup', '/sign-in', '/sign-up', '/login', '/register', '/forgot-password', '/reset-password'];
  if (authPaths.some(path => pathname?.startsWith(path))) {
    return null;
  }

  return <PartnershipModule />;
}

