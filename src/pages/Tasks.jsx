import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import TaskList from "../components/taskList";
import TabList from "../components/TabList";
import Navbar from "../components/Navbar";

export default function Tasks() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabs, setTabs] = useState([]);


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
    if (!currentUser) {
      setLoading(false);
      setTabs([]);
      setActiveTab(null);
      return;
    }

    // Subscribe to all tabs where the current user is a member
    const tabsRef = ref(db, 'tabs');
      const unsubscribe = onValue(tabsRef, (snapshot) => {
      try {

        const data = snapshot.val();   
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
      <Navbar />
      {/* Main Content */}      
      <main className="max-w-7xl h-screen mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow">
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6 mb-8">
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
