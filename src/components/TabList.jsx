import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { ref, push, get } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import IconPicker from './IconPicker';
import * as Icons from 'react-icons/fa';

export default function TabList({ onTabSelect, activeTab, tabs }) {
  const { currentUser } = useAuth();
  const [showNewTabModal, setShowNewTabModal] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
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
        <div className="flex space-x-3 overflow-x-auto p-2 bg-white rounded-lg shadow">
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
                className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
                title="Add new tab"
            >
                <FaPlus />
            </button>
        </div>

        {showNewTabModal && (
            <div className="fixed inset-0 z-40 bg-black bg-opacity-40 flex items-center justify-center">
                <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md mx-2 relative">
                    <h3 className="text-xl font-semibold mb-5 text-center">Create New Tab</h3>
                    
                    {errorMessage && (
                      <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                        {errorMessage}
                      </div>
                    )}

                    <input
                        type="text"
                        placeholder="Tab name"
                        value={newTabName}
                        onChange={(e) => setNewTabName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        autoFocus
                    />
                    
                    <div className="mb-4">
                        <IconPicker onSelect={setSelectedIcon} selected={selectedIcon} />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add Collaborator (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="Enter collaborator's email"
                        value={collaboratorEmail}
                        onChange={(e) => setCollaboratorEmail(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            onClick={() => {
                              setShowNewTabModal(false);
                              setErrorMessage('');
                              setCollaboratorEmail('');
                            }}
                            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                await handleAddTab();
                            }}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                            disabled={!newTabName.trim()}
                        >
                            Create
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
