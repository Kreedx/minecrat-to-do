// src/pages/Login.jsx
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useState } from "react";
import { auth, googleProvider, db } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import { ref, set, get } from "firebase/database";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await updateUserData(userCredential.user);
      navigate("/tasks");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await updateUserData(result.user);
      navigate("/tasks");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = async (user) => {
    const userRef = ref(db, `users/${user.uid}`);
    
    // Check if user data already exists
    const snapshot = await get(userRef);
    const userData = snapshot.val();
    
    // Only update last login if data exists, otherwise create new user data
    if (userData) {
      await set(userRef, {
        ...userData,
        lastLogin: Date.now(),
      });
    } else {
      await set(userRef, {
        email: user.email,
        createdAt: Date.now(),
        lastLogin: Date.now(),
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-400 to-green-500">
      <div className="bg-gray-900 p-8 rounded shadow-md w-full max-w-sm text-white">
        <h1 className="text-3xl font-bold mb-4 text-center">Log In</h1>
        {error && (
          <div className="bg-red-500 text-white p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          disabled={loading}
          className="mb-4 w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
        />
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          disabled={loading}
          className="mb-4 w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full py-2 bg-green-600 hover:bg-green-700 rounded text-white font-bold mb-4 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold mb-4 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Connecting...' : 'Sign in with Google'}
        </button>
        <p className="text-center text-sm">
          Don't have an account? <Link to="/register" className="text-blue-400 hover:text-blue-300">Register</Link>
        </p>
      </div>
    </div>
  );
}
