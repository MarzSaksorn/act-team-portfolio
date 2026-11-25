import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { defaultSiteContent } from '../data/defaultSiteContent';
import { siteContentSnapshotSchema, type SiteContentSnapshot } from '../types/site-content';

const SiteContentContext = createContext<SiteContentSnapshot>(defaultSiteContent);

type ContentProviderProps = { snapshot: unknown; children: ReactNode };

export function ContentProvider({ snapshot, children }: ContentProviderProps) {
  const content = useMemo(() => siteContentSnapshotSchema.parse(snapshot), [snapshot]);
  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent(): SiteContentSnapshot {
  return useContext(SiteContentContext);
}
