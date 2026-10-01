import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { branding } from "@/config/branding";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit-loaded",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "QueueSmart", template: "%s | QueueSmart" },
  description:
    "Join a service queue, keep track of your place, and plan your time. A COSC 4353 student project.",
  icons: {
    icon: branding.showUniversityLogo
      ? "/brand/uh-red.png"
      : "/brand/queuesmart.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} min-h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('queuesmart-theme')==='dark'){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}}catch{}",
          }}
        />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
