import { AuthProvider } from "./context/AuthContext"
import Header from "./components/header" 
import Footer from "./components/footer" // 1. Added Footer import
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Utah Golf Series", 
  description: "Official Member Portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body 
        className={`${geistSans.variable} ${geistMono.variable}`}
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: '100vh', // Sets the height to the full viewport
          margin: 0,
          boxSizing: 'border-box'
        }}
      >
        <AuthProvider>
          <Header /> 
          
          {/* flex: 1 makes the main content expand to fill available space */}
          <main style={{ flex: 1, width: '100%' }}>
            {children}
          </main>

          <Footer /> 
        </AuthProvider>
      </body>
    </html>
  );
}