import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import AdminIdleGuard from "@/components/admin/AdminIdleGuard";

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
      {/* 자리를 비운 채 관리자 화면이 열려 있지 않도록 지킨다. */}
      <AdminIdleGuard />
      {children}
    </AdminAuthProvider>
  );
}
