// src/app/layout.tsx
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  // สำคัญที่สุด! ใช้ getUser() แทน getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 font-sans antialiased min-h-screen">
        <Navbar initialUser={user} />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
