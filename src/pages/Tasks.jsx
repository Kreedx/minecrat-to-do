import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import TaskList from "../components/taskList";
import TabList from "../components/TabList";

export default function Tasks() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabs, setTabs] = useState([]);

  console.log("Tasks component state:", { currentUser: !!currentUser, loading, error }); // Debug log

  const handleLogout = async () => {
    console.log("Attempting to log out"); // Debug log
    try {
      // Clear local state before logout
      setActiveTab(null);
      setTabs([]);
      await signOut(auth);
      console.log("Successfully logged out"); // Debug log
    } catch (error) {
      console.error("Logout error:", error); // Debug log
      setError("Failed to log out");
    }
  };

  const handleTabSelect = (tab) => {
    // Store selected tab ID in localStorage
    if (tab) {
      localStorage.setItem('lastSelectedTabId', tab.id);
    } else {
      localStorage.removeItem('lastSelectedTabId');
    }
    setActiveTab(tab);
  };

  useEffect(() => {
    console.log("Tasks useEffect running, currentUser:", !!currentUser); // Debug log
    
    if (!currentUser) {
      console.log("No current user, resetting state"); // Debug log
      setLoading(false);
      setTabs([]);
      setActiveTab(null);
      return;
    }

    // Subscribe to all tabs where the current user is a member
    const tabsRef = ref(db, 'tabs');
    console.log("Setting up tabs listener"); // Debug log
      const unsubscribe = onValue(tabsRef, (snapshot) => {
      console.log("Received tabs update"); // Debug log
      try {
        const data = snapshot.val();
        console.log("Tabs data:", { 
          hasData: !!data, 
          tabsCount: data ? Object.keys(data).length : 0,
          currentUserId: currentUser.uid,
        });
        
        // Debug log for each tab's members
        if (data) {
          Object.entries(data).forEach(([tabId, tabData]) => {
            console.log(`Tab ${tabId} members:`, tabData.members);
          });
        }
        if (data) {
          const tabsArray = Object.entries(data)
            .map(([id, value]) => ({
              id,
              ...value,
              // Check if current user is the owner
              isOwner: value.owner?.id === currentUser.uid,
              // Add role from members
              userRole: value.members?.[currentUser.uid]?.role || 'none'
            }))
            // Only include tabs where the user is a member
            .filter((tab) => tab.members?.[currentUser.uid] && !tab.deleted)
            .sort((a, b) => {
              // Sort by ownership first, then creation date
              if (a.isOwner && !b.isOwner) return -1;
              if (!a.isOwner && b.isOwner) return 1;
              return b.createdAt - a.createdAt;
            });

          setTabs(tabsArray);

          // Restore previously selected tab or select the first tab
          const lastSelectedTabId = localStorage.getItem('lastSelectedTabId');
          if (activeTab) {
            const updatedActiveTab = tabsArray.find(
              (tab) => tab.id === activeTab.id
            );
            if (updatedActiveTab) {
              setActiveTab(updatedActiveTab);
            } else if (lastSelectedTabId) {
              const savedTab = tabsArray.find(tab => tab.id === lastSelectedTabId);
              if (savedTab) {
                setActiveTab(savedTab);
              } else if (tabsArray.length > 0) {
                setActiveTab(tabsArray[0]);
              }
            }
          } else if (lastSelectedTabId) {
            const savedTab = tabsArray.find(tab => tab.id === lastSelectedTabId);
            if (savedTab) {
              setActiveTab(savedTab);
            } else if (tabsArray.length > 0) {
              setActiveTab(tabsArray[0]);
            }
          } else if (tabsArray.length > 0 && !activeTab) {
            setActiveTab(tabsArray[0]);
          }
        } else {
          setTabs([]);
          setActiveTab(null);
          localStorage.removeItem('lastSelectedTabId');
        }
      } catch (err) {
        console.error('Error processing tabs:', err);
        setError('Error loading tabs');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (loading)
    return <div className="p-6 text-gray-500 text-center">Loading tasks...</div>;
  if (error)
    return (
      <div className="p-6 text-red-500 text-center font-medium">
        Error: {error}
      </div>
    );

  return (
    <div className="text-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-2xl font-extrabold text-white tracking-tight drop-shadow">
              BlockTasks
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white text-indigo-600 px-6 py-2 rounded-full shadow-md hover:bg-indigo-100 hover:text-indigo-700 transition font-semibold focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </header>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <TabList
            onTabSelect={handleTabSelect}
            activeTab={activeTab}
            tabs={tabs}
          />
          {activeTab ? (
            <TaskList activeTab={activeTab} setActiveTab={setActiveTab} />
          ) : (
            <div className="text-center text-gray-500 py-10">
              <p className="text-lg">Select a category to view your tasks.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
