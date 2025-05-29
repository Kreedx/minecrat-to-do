import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function Navbar() {
  const { currentUser } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userStats, setUserStats] = useState({
    createdAt: null,
    lastLogin: null,
    collaborationCount: 0,
    ownedTabsCount: 0
  });
  const menuRef = useRef();

  // Get display name or extract username from email
  const getUserDisplayName = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName;
    }
    // Extract name from email (everything before @)
    return currentUser?.email ? currentUser.email.split('@')[0] : 'User';
  };

  const getInitial = () => {
    const displayName = getUserDisplayName();
    return displayName.charAt(0).toUpperCase();
  };

  // Handle clicking outside of profile menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch user stats
  useEffect(() => {
    if (!currentUser) return;

    // Get user data
    const userRef = ref(db, `users/${currentUser.uid}`);
    const unsubscribeUser = onValue(userRef, (snapshot) => {
      const userData = snapshot.val();
      if (userData) {
        setUserStats(prev => ({
          ...prev,
          createdAt: userData.createdAt,
          lastLogin: userData.lastLogin
        }));
      }
    });

    // Get tabs data to count collaborations and owned tabs
    const tabsRef = ref(db, 'tabs');
    const unsubscribeTabs = onValue(tabsRef, (snapshot) => {
      const tabsData = snapshot.val();
      if (tabsData) {
        let collaborationCount = 0;
        let ownedTabsCount = 0;

        Object.values(tabsData).forEach(tab => {
          if (!tab.deleted) {
            if (tab.owner?.id === currentUser.uid) {
              ownedTabsCount++;
            } else if (tab.members?.[currentUser.uid]) {
              collaborationCount++;
            }
          }
        });

        setUserStats(prev => ({
          ...prev,
          collaborationCount,
          ownedTabsCount
        }));
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeTabs();
    };
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      setShowProfileMenu(false);
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

return (
    <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 shadow-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
            {/* Logo & Title */}
            <div className="flex items-center space-x-3">
                <span className="bg-white bg-opacity-20 rounded-full p-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white">
                        <rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor" />
                        <rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor" />
                        <rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor" />
                        <rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor" />
                    </svg>
                </span>
                <span className="text-2xl font-black text-white tracking-tight drop-shadow-lg select-none">
                    BlockTasks
                </span>
            </div>
            {/* Profile */}
            <div className="flex items-center space-x-4">
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center bg-white/90 text-indigo-700 px-2 py-1.5 rounded-full shadow-lg hover:bg-indigo-50 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                        {currentUser?.photoURL ? (
                            <img
                                src={currentUser.photoURL}
                                alt="Profile"
                                className="w-9 h-9 rounded-full border-2 border-indigo-400 shadow"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg border-2 border-indigo-400 shadow">
                                {getInitial()}
                            </div>
                        )}
                        <span className="ml-2 text-indigo-700 font-semibold hidden sm:inline">
                            {getUserDisplayName()}
                        </span>
                        <svg className="ml-1 w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Profile Menu Dropdown */}
                    {showProfileMenu && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl py-2 text-gray-800 z-50 animate-fade-in">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center space-x-3">
                                {currentUser?.photoURL ? (
                                    <img
                                        src={currentUser.photoURL}
                                        alt="Profile"
                                        className="w-12 h-12 rounded-full border-2 border-indigo-400"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl border-2 border-indigo-400">
                                        {getInitial()}
                                    </div>
                                )}
                                <div>
                                    <div className="font-bold text-lg">{getUserDisplayName()}</div>
                                    <div className="text-sm text-gray-500">{currentUser.email}</div>
                                </div>
                            </div>
                            
                            <div className="px-5 py-4 border-b border-gray-100">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-indigo-50 rounded-lg p-3 text-center">
                                        <div className="text-xs text-gray-500">Created Tabs</div>
                                        <div className="font-bold text-indigo-700 text-lg">{userStats.ownedTabsCount}</div>
                                    </div>
                                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                                        <div className="text-xs text-gray-500">Collaborations</div>
                                        <div className="font-bold text-purple-700 text-lg">{userStats.collaborationCount}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-4 border-b border-gray-100 text-sm space-y-2">
                                <div>
                                    <span className="text-gray-500">Account created: </span>
                                    <span className="font-medium">
                                        {userStats.createdAt ? new Date(userStats.createdAt).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Last login: </span>
                                    <span className="font-medium">
                                        {userStats.lastLogin ? new Date(userStats.lastLogin).toLocaleString() : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="w-full px-5 py-3 text-left text-red-600 font-semibold hover:bg-red-50 rounded-b-2xl transition"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
        {/* Animation for dropdown */}
        <style>{`
            .animate-fade-in {
                animation: fadeIn 0.18s cubic-bezier(.4,0,.2,1);
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-8px);}
                to { opacity: 1; transform: translateY(0);}
            }
        `}</style>
    </header>
);
}
