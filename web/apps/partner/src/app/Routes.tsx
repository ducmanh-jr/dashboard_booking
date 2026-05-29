import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { fetchRoomDetail } from "../api/roomsApi";

import { User, Room } from "../shared/types";
import { PartnerLayout } from "../shared/layouts/PartnerLayout";
import { RoomsTab } from "../features/rooms/components/tabs/RoomsTab";
import { BookingsTab } from "../features/rooms/components/tabs/BookingsTab";
import { NotificationsTab } from "../features/rooms/components/tabs/NotificationsTab";
import { RoomEditorForm } from "../features/rooms/components/RoomEditorForm";
import { RoomDetailModal } from "../features/rooms/components/modals/RoomDetailModal";
import { Login } from "../features/auth/components/Login";
import { API_PATHS } from "../constants/apiPaths";
import { DashboardTab } from "../features/rooms/components/tabs/DashboardTab";
import { AccountSettingsPage } from "../features/account/components/AccountSettingsPage";

function RoomsPage({ onDetail }: { onDetail: (room: Room) => void }) {
  const [viewingRoom, setViewingRoom] = useState<Room | null>(null);
  
  return (
    <>
      <RoomsTab onDetail={(room) => { setViewingRoom(room); if (onDetail) onDetail(room); }} />
      {viewingRoom && (
        <RoomDetailModal room={viewingRoom} onClose={() => setViewingRoom(null)} />
      )}
    </>
  );
}

function CreateRoomPage() {
  const navigate = useNavigate();
  return (
    <RoomEditorForm 
      mode="create" 
      onDone={(msg) => {
        navigate("/", { state: { message: msg } });
      }}
      onCancel={() => navigate("/")}
    />
  );
}

function EditRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchRoomDetail(id!);
        setRoom(res.room);
      } catch (err: any) {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="text-center py-10 text-gray-500">Đang tải dữ liệu phòng...</div>;
  if (!room) return <div className="text-center py-10 text-red-600 font-bold">Không tìm thấy phòng!</div>;

  return (
    <RoomEditorForm 
      mode="edit" 
      room={room}
      onDone={(msg) => {
        navigate("/", { state: { message: msg } });
      }}
      onCancel={() => navigate("/")}
    />
  );
}

function NotificationsPage() {
  return <NotificationsTab />;
}

function BookingsPage() {
  return <BookingsTab />;
}

interface AppRoutesProps {
  user: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
}

export function AppRoutes({ user, onLogin, onLogout }: AppRoutesProps) {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={(u) => { onLogin(u); navigate("/"); }} />} />
      
      {/* Persistent Layout Wrapper */}
      <Route element={user ? <PartnerLayout user={user} onLogout={onLogout} /> : <Navigate to="/login" />}>
        <Route path="/" element={<DashboardTab />} />
        <Route path="/rooms" element={<RoomsPage onDetail={() => {}} />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path="/edit/:id" element={<EditRoomPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/account" element={<AccountSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
