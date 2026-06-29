import { Routes, Route } from "react-router";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Mirror from "./pages/Mirror";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import Settings from "./pages/Settings";
import Live from "./pages/Live";
import AppLayout from "./components/AppLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/mirror" element={<AppLayout><Mirror /></AppLayout>} />
      <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
      <Route path="/leaderboard" element={<AppLayout><Leaderboard /></AppLayout>} />
      <Route path="/live" element={<AppLayout><Live /></AppLayout>} />
      <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
