import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Tasks from '../pages/Tasks';
import { useAuth } from '../context/AuthContext';

export default function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/tasks" />} />
      <Route path="/register" element={!currentUser ? <Register /> : <Navigate to="/tasks" />} />
      <Route path="/tasks" element={currentUser ? <Tasks /> : <Navigate to="/login" />} />
      <Route path="/" element={<Navigate to={currentUser ? "/tasks" : "/login"} />} />
    </Routes>
  );
}
