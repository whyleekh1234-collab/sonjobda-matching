import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MainContent from "@/components/layout/MainContent";
import ChatWidget from "@/components/chat/ChatWidget";
import { AuthProvider } from "@/contexts/AuthContext";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <Header />
      <MainContent>{children}</MainContent>
      <Footer />
      <ChatWidget />
    </AuthProvider>
  );
}
