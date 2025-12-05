// แนะนำให้ใช้แบบนี้ (สวย + ใช้งานจริง)
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
