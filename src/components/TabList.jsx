import React, { useState, useRef, useEffect } from 'react';
import { FaPlus, FaChevronDown, FaCog } from 'react-icons/fa';
import { ref, push, get } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import IconPicker from './IconPicker';
import * as Icons from 'react-icons/fa';

export default function TabList({ onTabSelect, activeTab, tabs, onSettingsClick }) {
  const { currentUser } = useAuth();
  const [showNewTabModal, setShowNewTabModal] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (showNewTabModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showNewTabModal]);

  const findUserByEmail = async (email) => {
    try {
      // Query users to find one with matching email
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      const users = snapshot.val();
      
      if (!users) return null;
      
      // Find user with matching email
      const userId = Object.keys(users).find(
        key => users[key].email === email
      );
      
      return userId ? { id: userId, ...users[userId] } : null;
    } catch (error) {
      console.error("Error finding user:", error);
      return null;
    }
  };

  const handleAddTab = async () => {
    if (!newTabName.trim()) {
      return;
    }

    try {
      setErrorMessage('');
      let collaborators = {};
      let members = {
        [currentUser.uid]: {
          role: 'owner',
          email: currentUser.email
        }
      };
      
      if (collaboratorEmail) {
        const collaborator = await findUserByEmail(collaboratorEmail);
        if (!collaborator) {
          setErrorMessage('User not found with this email');
          return;
        }
        // Add collaborator with editor role
        collaborators[collaborator.id] = {
          role: 'editor',
          email: collaboratorEmail
        };
        // Add collaborator to members list as well
        members[collaborator.id] = {
          role: 'editor',
          email: collaboratorEmail
        };
      }

      // Create a new tab
      const tabsRef = ref(db, 'tabs');
      const newTab = {
        name: newTabName.trim(),
        icon: selectedIcon,
        createdAt: Date.now(),
        owner: {
          id: currentUser.uid,
          email: currentUser.email
        },
        collaborators: collaborators,
        members: members
      };

      await push(tabsRef, newTab);
      setShowNewTabModal(false);
      setNewTabName('');
      setSelectedIcon('');
      setCollaboratorEmail('');
    } catch (error) {
      console.error("Error adding tab:", error);
      setErrorMessage('Failed to create tab. Please try again.');
    }
  };

  const renderIcon = (iconName) => {
    if (!iconName) return null;
    const IconComponent = Icons[iconName];
    return IconComponent ? <IconComponent className="text-lg" /> : null;
  };

return (
    <div className="flex flex-col gap-4">
        {(!tabs || tabs.length === 0) && (
            <div className="text-gray-400 text-center py-6 italic">
                No tabs yet. Create your first tab!
            </div>
        )}

        {/* Mobile dropdown view */}
        <div className="flex justify-between items-center md:hidden">
            <div className="relative flex-1 mr-2" ref={dropdownRef}>
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-white border rounded-lg shadow-sm"
                >
                    <span className="flex items-center gap-2">
                        {activeTab?.icon && renderIcon(activeTab.icon)}
                        <span className="font-medium truncate">
                            {activeTab?.name || 'Select a tab'}
                        </span>
                    </span>
                    <FaChevronDown className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    onTabSelect(tab);
                                    setShowDropdown(false);
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors ${
                                    activeTab?.id === tab.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                }`}
                            >
                                {tab.icon && renderIcon(tab.icon)}
                                <span className="font-medium">{tab.name}</span>
                            </button>
                        ))}
                        <div className="flex justify-end p-2">
                            <button
                                onClick={() => setShowNewTabModal(true)}
                                className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors flex-shrink-0"
                                title="Add new tab"
                            >
                                <FaPlus />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Desktop horizontal scroll view */}
        <div className="hidden md:flex space-x-3 overflow-x-auto p-2 bg-white rounded-lg shadow">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onTabSelect(tab)}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full transition-colors duration-150 border 
                        ${activeTab?.id === tab.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50'
                        }`}
                >
                    {tab.icon && renderIcon(tab.icon)}
                    <span className="font-medium">{tab.name}</span>
                </button>
            ))}
            <button
                onClick={() => setShowNewTabModal(true)}
                className="p-3 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                title="Add new tab"
            >
                <FaPlus />
            </button>
            {activeTab && (
              <button
                onClick={onSettingsClick}
                className="p-3 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 transition-colors"
                title="Tab Settings"
              >
                <FaCog />
              </button>
            )}
        </div>

        {showNewTabModal && (
            <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center">
                <div className="bg-gradient-to-br from-white via-blue-50 to-blue-100 p-0 rounded-3xl shadow-2xl w-full max-w-lg mx-2 relative animate-fade-in">
                    <div className="absolute top-4 right-4">
                        <button
                            onClick={() => {
                                setShowNewTabModal(false);
                                setErrorMessage('');
                                setCollaboratorEmail('');
                            }}
                            className="text-gray-400 hover:text-blue-600 transition-colors text-2xl"
                            aria-label="Close"
                        >
                            &times;
                        </button>
                    </div>
                    <div className="px-10 py-8">
                        <h3 className="text-2xl font-bold mb-6 text-center text-blue-700 tracking-tight">
                            <span className="inline-block bg-blue-100 rounded-full px-4 py-1 mb-2">
                                <FaPlus className="inline mr-2 mb-1 text-blue-500" />
                                Create New Tab
                            </span>
                        </h3>

                        {errorMessage && (
                            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg shadow">
                                {errorMessage}
                            </div>
                        )}

                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-blue-700 mb-2">
                                Tab Name
                            </label>
                            <input
                                type="text"
                                placeholder="Tab name"
                                value={newTabName}
                                onChange={(e) => setNewTabName(e.target.value)}
                                className="w-full p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm transition"
                                autoFocus
                            />
                        </div>

                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-blue-700 mb-2">
                                Icon
                            </label>
                            <div className="bg-white rounded-lg border border-blue-100 p-2 shadow-sm">
                                <IconPicker onSelect={setSelectedIcon} selected={selectedIcon} />
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-blue-700 mb-2">
                                Add Collaborator <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="email"
                                placeholder="Enter collaborator's email"
                                value={collaboratorEmail}
                                onChange={(e) => setCollaboratorEmail(e.target.value)}
                                className="w-full p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm transition"
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowNewTabModal(false);
                                    setErrorMessage('');
                                    setCollaboratorEmail('');
                                }}
                                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors shadow"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    await handleAddTab();
                                }}
                                className={`px-6 py-2 rounded-lg font-medium transition-colors shadow ${
                                    !newTabName.trim()
                                        ? 'bg-blue-200 text-white cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                                disabled={!newTabName.trim()}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
);
}
