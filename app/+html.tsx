import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
export default function Root({ children }: PropsWithChildren) {
  return <html lang="en"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="theme-color" content="#102c28" /><meta name="description" content="Spin three reels to discover a fresh project idea. One domain, one approach, one audience." /><title>Lucky Idea — Find your next possibility</title><link rel="icon" href="/favicon.svg" type="image/svg+xml" /><ScrollViewStyleReset /><style dangerouslySetInnerHTML={{ __html: `body{background:#102c28}::selection{background:#efd18d;color:#263228}:focus-visible{outline:3px solid #d79c46!important;outline-offset:4px}*{scrollbar-color:#688478 #102c28;scrollbar-width:thin}` }} /></head><body>{children}</body></html>;
}
