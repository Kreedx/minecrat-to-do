import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider, appleProvider, db } from "../firebase";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ref, set } from "firebase/database";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Store user email in database
      await set(ref(db, `users/${userCredential.user.uid}`), {
        email: email,
        createdAt: Date.now()
      });
      navigate("/tasks");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Store user email in database
      await set(ref(db, `users/${result.user.uid}`), {
        email: result.user.email,
        createdAt: Date.now()
      });
      navigate("/tasks");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAppleSignUp = async () => {
    try {
      const result = await signInWithPopup(auth, appleProvider);
      await set(ref(db, `users/${result.user.uid}`), {
        email: result.user.email,
        createdAt: Date.now()
      });
      navigate("/tasks");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-400 to-green-500">
      <div className="bg-gray-900 p-8 rounded shadow-md w-full max-w-sm text-white">
        <h1 className="text-3xl font-bold mb-4 text-center">Sign Up</h1>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className="mb-4 w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"/>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" className="mb-4 w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"/>
        <button onClick={handleRegister} className="w-full py-2 bg-green-600 hover:bg-green-700 rounded text-white font-bold mb-4">Register</button>
        <button onClick={handleGoogleSignUp} className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold mb-4 flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5"><g><path fill="#4285F4" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.3-5.7 7-10.3 7-6.1 0-11-4.9-11-11s4.9-11 11-11c2.6 0 5 .9 6.9 2.6l6.1-6.1C34.5 7.1 29.5 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z"/><path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.5 16.1 18.9 13 24 13c2.6 0 5 .9 6.9 2.6l6.1-6.1C34.5 7.1 29.5 5 24 5c-7.2 0-13.4 4.1-16.7 10.2z"/><path fill="#FBBC05" d="M24 45c5.3 0 10.2-1.8 14-4.9l-6.5-5.3c-2 1.4-4.5 2.2-7.5 2.2-4.6 0-8.7-2.7-10.3-7H6.3C9.6 40.9 16.1 45 24 45z"/><path fill="#EA4335" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.1 3-3.3 5.4-6.1 6.8l6.5 5.3C41.7 36.2 44 31.1 44 25c0-1.3-.1-2.7-.4-4z"/></g></svg>
          Sign up with Google
        </button>
        <button onClick={handleAppleSignUp} className="w-full py-2 bg-gray-600 hover:bg-gray-700 rounded text-white font-bold mb-4 flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M16.365 1.43c0 1.14-.93 2.07-2.07 2.07-.03-1.18.96-2.07 2.07-2.07zm2.87 6.13c-1.57-.09-2.89.9-3.65.9-.77 0-1.95-.87-3.21-.85-1.65.03-3.18.96-4.03 2.44-1.72 2.98-.44 7.38 1.23 9.79.81 1.17 1.77 2.48 3.04 2.43 1.23-.05 1.7-.79 3.19-.79 1.48 0 1.91.79 3.2.77 1.33-.02 2.16-1.18 2.96-2.36.52-.76.73-1.16 1.14-2.03-3-.99-3.47-4.66.66-5.41-.13-1.56-.62-2.77-1.23-3.69-.72-1.09-1.87-1.54-2.3-1.56zm-2.46-4.13c.38-.47.64-1.13.57-1.8-.55.02-1.22.37-1.61.84-.35.41-.66 1.09-.54 1.74.6.05 1.2-.3 1.58-.78z"/></svg>
          Sign up with Apple
        </button>
        <p className="text-center text-sm">
          Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300">Login</Link>
        </p>
      </div>
    </div>
  );
}
