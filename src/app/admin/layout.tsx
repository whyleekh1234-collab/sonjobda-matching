import { AdminAuthProvider } from "@/contexts/AdminAuthContext";

export const metadata = {
  title: "관리자 대시보드 | 손잡다매칭",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      {children}
    </AdminAuthProvider>
  );
}
