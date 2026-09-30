import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'CommUnity - Realtime Hub & AI Chat',
  description: 'Full-stack community chat platform with Firebase Authentication, Firebase Realtime Database, Google Drive link sharing, and Google Gemini AI.',
  openGraph: {
    title: 'CommUnity - Realtime Hub & AI Chat',
    description: 'Full-stack community chat platform with Firebase Authentication, Firebase Realtime Database, Google Drive link sharing, and Google Gemini AI.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CommUnity - Realtime Hub & AI Chat',
    description: 'Full-stack community chat platform with Firebase Authentication, Firebase Realtime Database, Google Drive link sharing, and Google Gemini AI.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
