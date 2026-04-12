import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import Login from "./components/Login";
import { useAuthStore } from "./store/authStore";
import type { ReactNode } from "react";
import { CONFIG } from "./config";
import { pathLogin } from "./paths";

const ChatPage = lazy(() => import("./components/ChatPage"));
const ConversationRecordsPage = lazy(
  () => import("./components/ConversationRecordsPage")
);

function PrivateRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const { unitUri } = useParams<{ unitUri: string }>();
  const uri = unitUri ?? CONFIG.DEFAULT_UNIT_URI;
  return isAuthenticated ? (
    children
  ) : (
    <Navigate to={pathLogin(uri)} replace />
  );
}

function App() {
  const d = CONFIG.DEFAULT_UNIT_URI;
  return (
    <Routes>
      <Route path="/:unitUri/login" element={<Login />} />
      <Route
        path="/:unitUri/chat"
        element={
          <PrivateRoute>
            <Suspense fallback={null}>
              <ChatPage />
            </Suspense>
          </PrivateRoute>
        }
      />
      <Route
        path="/:unitUri/records"
        element={
          <PrivateRoute>
            <Suspense fallback={null}>
              <ConversationRecordsPage />
            </Suspense>
          </PrivateRoute>
        }
      />
      <Route path="/login" element={<Navigate to={`/${d}/login`} replace />} />
      <Route path="/chat" element={<Navigate to={`/${d}/chat`} replace />} />
      <Route path="/records" element={<Navigate to={`/${d}/records`} replace />} />
      <Route path="/" element={<Navigate to={`/${d}/chat`} replace />} />
    </Routes>
  );
}

export default App;
