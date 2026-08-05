import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { lazy, Suspense } from "react";
import Login from "./components/Login";
import { useAuthStore } from "./store/authStore";
import type { ReactNode } from "react";
import { CONFIG } from "./config";
import { pathChat, pathLogin, pathRecords } from "./paths";
import { pathCharacters } from "./paths";
import { useCharacterStore } from "./store/characterStore";

const ChatPage = lazy(() => import("./components/ChatPage"));
const ConversationRecordsPage = lazy(
  () => import("./components/ConversationRecordsPage")
);
const CharacterSelectionPage = lazy(
  () => import("./components/CharacterSelectionPage")
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

function CharacterRoute({ children }: { children: ReactNode }) {
  const { unitUri } = useParams<{ unitUri: string }>();
  const uri = unitUri ?? CONFIG.DEFAULT_UNIT_URI;
  const selectedCharacter = useCharacterStore((state) => state.selectedCharacter);
  return selectedCharacter ? children : (
    <Navigate to={pathCharacters(uri)} replace />
  );
}

function App() {
  const d = CONFIG.DEFAULT_UNIT_URI;
  const legacyLogin = d ? <Navigate to={pathLogin(d)} replace /> : <Login />;
  const legacyChat = d ? (
    <Navigate to={pathChat(d)} replace />
  ) : (
    <PrivateRoute>
      <CharacterRoute>
        <Suspense fallback={null}>
          <ChatPage />
        </Suspense>
      </CharacterRoute>
    </PrivateRoute>
  );
  const legacyRecords = d ? (
    <Navigate to={pathRecords(d)} replace />
  ) : (
    <PrivateRoute>
      <Suspense fallback={null}>
        <ConversationRecordsPage />
      </Suspense>
    </PrivateRoute>
  );

  return (
    <Routes>
      <Route path="/:unitUri/login" element={<Login />} />
      <Route
        path="/:unitUri/characters-preview"
        element={
          import.meta.env.DEV ? (
            <Suspense fallback={null}>
              <CharacterSelectionPage previewMode />
            </Suspense>
          ) : (
            <Navigate to={pathLogin(d)} replace />
          )
        }
      />
      <Route
        path="/:unitUri/characters"
        element={
          <PrivateRoute>
            <Suspense fallback={null}>
              <CharacterSelectionPage />
            </Suspense>
          </PrivateRoute>
        }
      />
      <Route
        path="/:unitUri/chat"
        element={
          <PrivateRoute>
            <CharacterRoute>
              <Suspense fallback={null}>
                <ChatPage />
              </Suspense>
            </CharacterRoute>
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
      <Route path="/login" element={legacyLogin} />
      <Route
        path="/characters"
        element={
          d ? (
            <Navigate to={pathCharacters(d)} replace />
          ) : (
            <PrivateRoute>
              <Suspense fallback={null}>
                <CharacterSelectionPage />
              </Suspense>
            </PrivateRoute>
          )
        }
      />
      <Route path="/chat" element={legacyChat} />
      <Route path="/records" element={legacyRecords} />
      <Route path="/" element={<Navigate to={pathChat(d)} replace />} />
    </Routes>
  );
}

export default App;
