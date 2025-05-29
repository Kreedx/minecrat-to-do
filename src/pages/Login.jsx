// src/pages/Login.jsx
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useState } from "react";
import { auth, googleProvider, db } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import { ref, set, get } from "firebase/database";
import { motion } from "framer-motion";

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
        duration: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 via-green-400 to-yellow-300">
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="bg-white/90 backdrop-blur-md p-10 rounded-2xl shadow-2xl w-full max-w-md text-gray-900"
      >
        <motion.h1 
          variants={itemVariants}
          className="text-4xl font-extrabold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500 drop-shadow-lg"
        >
          Welcome Back
        </motion.h1>
        
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm border border-red-300"
          >
            {error}
          </motion.div>
        )}

        <motion.div className="space-y-4" variants={itemVariants}>
          <motion.input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          <motion.input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 transition"
          />
          <motion.button
            onClick={handleLogin}
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`w-full py-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 rounded-lg text-white font-bold shadow-md transition ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </motion.button>

          <motion.div className="flex items-center my-2">
            <div className="flex-grow h-px bg-gray-300" />
            <span className="mx-2 text-gray-400 text-xs">or</span>
            <div className="flex-grow h-px bg-gray-300" />
          </motion.div>

          <motion.button
            onClick={handleGoogleLogin}
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`w-full flex items-center justify-center gap-2 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-gray-700 font-semibold shadow transition ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
              <g>
                <path fill="#4285F4" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.3-5.7 7-10.3 7-6.1 0-11-4.9-11-11s4.9-11 11-11c2.6 0 5 .9 6.9 2.6l6.1-6.1C34.5 7.1 29.5 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z"/>
                <path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.5 16.1 18.9 13 24 13c2.6 0 5 .9 6.9 2.6l6.1-6.1C34.5 7.1 29.5 5 24 5c-7.2 0-13.4 4.1-16.7 10.2z"/>
                <path fill="#FBBC05" d="M24 45c5.3 0 10.2-1.8 14-4.9l-6.5-5.3c-2 1.4-4.5 2.2-7.5 2.2-4.6 0-8.7-2.7-10.3-7H6.3C9.6 40.9 16.1 45 24 45z"/>
                <path fill="#EA4335" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.1 3-3.3 5.4-6.1 6.8l6.5 5.3C41.7 36.2 44 31.1 44 25c0-1.3-.1-2.7-.4-4z"/>
              </g>
            </svg>
            {loading ? 'Connecting...' : 'Sign in with Google'}
          </motion.button>
        </motion.div>

        <motion.p 
          variants={itemVariants}
          className="text-center text-sm mt-6"
        >
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-500 hover:underline font-medium">
            Register
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
