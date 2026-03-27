import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Login from "./components/Login";
import { useAuthStore } from "./store/authStore";
import type { ReactNode } from "react";

const ChatPage = lazy(() => import("./components/ChatPage"));
const ConversationRecordsPage = lazy(
  () => import("./components/ConversationRecordsPage")
);

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
            <Suspense fallback={null}>
              <ChatPage />
            </Suspense>
          </PrivateRoute>
        }
      />
      <Route
        path="/records"
        element={
          <PrivateRoute>
            <Suspense fallback={null}>
              <ConversationRecordsPage />
            </Suspense>
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}

export default App;
