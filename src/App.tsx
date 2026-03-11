import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import ChatPage from "./components/ChatPage";
import ConversationRecordsPage from "./components/ConversationRecordsPage";
import { useAuthStore } from "./store/authStore";
import type { ReactNode } from "react";

function PrivateRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <ChatPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/records"
        element={
          <PrivateRoute>
            <ConversationRecordsPage />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}

export default App;
