"use client";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "next-themes";

// internal components
import Navbar from "@/components/navbar/navbar";


type Props = {
  children?: React.ReactNode;
};


export default function Provider({ children }: Props) {

  return (
    <ThemeProvider attribute="class" defaultTheme="dark">

      <Toaster
        position="bottom-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#FFFFFF',
            color: '#333333',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            borderRadius: '8px',
            padding: '12px 16px',
          },
        }}
      />
      <div className="w-full h-screen flex flex-col overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <Navbar />
        <main className="grow overflow-y-auto">{children}</main>
      </div>

    </ThemeProvider>
  );
}