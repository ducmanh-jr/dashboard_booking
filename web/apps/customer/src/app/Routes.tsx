import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "@/features/home/pages/HomePage";
import { SearchPage } from "@/features/search/pages/SearchPage";
import { DetailPage } from "@/features/hotel-detail/pages/DetailPage";
import { CheckoutPage } from "@/features/checkout/pages/CheckoutPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { TripsPage } from "@/features/trips/pages/TripsPage";
import { User } from "@/shared/types";

interface AppRoutesProps {
  user: User | null;
  onLogin: (user: User) => void;
}

export function AppRoutes({ user, onLogin }: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/hotels/:id" element={<DetailPage />} />
      <Route path="/checkout/:id" element={<CheckoutPage user={user} />} />
      <Route path="/login" element={<LoginPage onLogin={onLogin} />} />
      <Route path="/trips" element={<TripsPage user={user} />} />
      <Route path="/account" element={user ? <Navigate to="/trips" /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
