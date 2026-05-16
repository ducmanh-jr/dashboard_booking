import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { api } from "@nowayhome/api-client";
import { User, Room } from "../shared/types";
import { PartnerLayout } from "../pages/layouts/PartnerLayout";
import { RoomsTab } from "../features/rooms/components/tabs/RoomsTab";
import { BookingsTab } from "../features/rooms/components/tabs/BookingsTab";
import { NotificationsTab } from "../features/rooms/components/tabs/NotificationsTab";
import { RoomEditorForm } from "../features/rooms/components/RoomEditorForm";
import { RoomDetailModal } from "../features/rooms/components/modals/RoomDetailModal";
import { Login } from "../features/auth/components/Login";

function PartnerDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [viewingRoom, setViewingRoom] = useState<Room | null>(null);
  
  return (
    <PartnerLayout user={user} onLogout={onLogout}>
      <RoomsTab onDetail={setViewingRoom} />
      {viewingRoom && (
        <RoomDetailModal room={viewingRoom} onClose={() => setViewingRoom(null)} />
      )}
    </PartnerLayout>
  );
}

function CreateRoomPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const navigate = useNavigate();
  return (
    <PartnerLayout user={user} onLogout={onLogout}>
      <RoomEditorForm 
        mode="create" 
        onDone={(msg) => {
          navigate("/", { state: { message: msg } });
        }}
        onCancel={() => navigate("/")}
      />
    </PartnerLayout>
  );
}

function EditRoomPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api(`/rooms/${id}`);
        setRoom(res.room);
      } catch (err: any) {
        // Error handled by !room check below
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <PartnerLayout user={user} onLogout={onLogout}><div className="text-center py-10 text-gray-500">Đang tải dữ liệu phòng...</div></PartnerLayout>;
  if (!room) return <PartnerLayout user={user} onLogout={onLogout}><div className="text-center py-10 text-red-600 font-bold">Không tìm thấy phòng!</div></PartnerLayout>;

  return (
    <PartnerLayout user={user} onLogout={onLogout}>
      <RoomEditorForm 
        mode="edit" 
        room={room}
        onDone={(msg) => {
          navigate("/", { state: { message: msg } });
        }}
        onCancel={() => navigate("/")}
      />
    </PartnerLayout>
  );
}

function NotificationsPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <PartnerLayout user={user} onLogout={onLogout}>
      <NotificationsTab />
    </PartnerLayout>
  );
}

function BookingsPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <PartnerLayout user={user} onLogout={onLogout}>
      <BookingsTab />
    </PartnerLayout>
  );
}

function Root() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  async function check() {
    try {
      const result = await api("/auth/me");
      if (result.user?.role === "partner") {
        setUser(result.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    check();
  }, []);

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      navigate("/login");
    } catch (error: any) {
      alert(error.message);
    }
  }

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Đang tải...</div>;

  function handleLogout() {
    setUser(null);
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={(u) => { setUser(u); navigate("/"); }} />} />
      <Route path="/" element={user ? <PartnerDashboard user={user} onLogout={handleLogout} /> : <Login onLogin={(u) => { setUser(u); navigate("/"); }} />} />
      <Route path="/bookings" element={user ? <BookingsPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
      <Route path="/create" element={user ? <CreateRoomPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
      <Route path="/edit/:id" element={user ? <EditRoomPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
      <Route path="/notifications" element={user ? <NotificationsPage user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  );
}



