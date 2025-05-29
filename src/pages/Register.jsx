import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider, db } from "../firebase";
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

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-400 to-green-500">
      <div className="bg-gray-900 p-8 rounded shadow-md w-full max-w-sm text-white">
        <h1 className="text-3xl font-bold mb-4 text-center">Sign Up</h1>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className="mb-4 w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"/>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" className="mb-4 w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"/>
        <button onClick={handleRegister} className="w-full py-2 bg-green-600 hover:bg-green-700 rounded text-white font-bold mb-4">Register</button>
        <button onClick={handleGoogleSignUp} className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold mb-4">Sign up with Google</button>
        <p className="text-center text-sm">
          Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300">Login</Link>
        </p>
      </div>
    </div>
  );
}
