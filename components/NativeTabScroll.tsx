import type { ReactElement } from 'react';

// Android/web keep the original scroll view and layout.
export default function NativeTabScroll({ children }: { children: ReactElement }) {
    return children;
}
