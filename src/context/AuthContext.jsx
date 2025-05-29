// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Setting up auth state listener"); // Debug log
    const unsubscribe = onAuthStateChanged(auth, user => {
      console.log("Auth state changed:", user?.email); // Changed to show email instead of full user object
      setCurrentUser(user);
      setLoading(false);
    });

    return () => {
      console.log("Cleaning up auth state listener"); // Debug log
      unsubscribe();
    };
  }, []);

  // Debug log for loading state
  console.log("AuthProvider state:", { loading, hasUser: !!currentUser });

  const value = {
    currentUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
