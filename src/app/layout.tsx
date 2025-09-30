import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';
import Layout from '@/components/layout/layout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HFL Admin',
  description: 'Admin panel for HFL mobile app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body className={inter.className}>
        <Providers>
          <Layout>
            {children}
          </Layout>
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}

