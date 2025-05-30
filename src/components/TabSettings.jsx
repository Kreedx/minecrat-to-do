import React, { useState, useEffect } from 'react';
import { FaCog, FaTrash, FaUserCircle, FaUserPlus, FaTimes } from 'react-icons/fa';
import { ref, update, get } from 'firebase/database';
import { db } from '../firebase';
import IconPicker from './IconPicker';
import { useAuth } from '../context/AuthContext';

export default function TabSettings({ tab, onClose, onDelete }) {
  const { currentUser } = useAuth();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [tabData, setTabData] = useState({
    name: tab.name,
    icon: tab.icon,
  });
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const findUserByEmail = async (email) => {
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      const users = snapshot.val();
      
      if (!users) return null;
      
      const userId = Object.keys(users).find(
        key => users[key].email === email
      );
      
      return userId ? { id: userId, ...users[userId] } : null;
    } catch (error) {
      console.error("Error finding user:", error);
      return null;
    }
  };

  const handleAddCollaborator = async () => {
    try {
      if (!newCollaboratorEmail.trim()) return;
      
      const collaborator = await findUserByEmail(newCollaboratorEmail);
      if (!collaborator) {
        setErrorMessage('User not found with this email');
        return;
      }

      if (tab.members?.[collaborator.id]) {
        setErrorMessage('This user is already a collaborator');
        return;
      }

      const updates = {};
      updates[`tabs/${tab.id}/members/${collaborator.id}`] = {
        role: 'editor',
        email: newCollaboratorEmail
      };
      updates[`tabs/${tab.id}/collaborators/${collaborator.id}`] = {
        role: 'editor',
        email: newCollaboratorEmail
      };

      await update(ref(db), updates);
      setNewCollaboratorEmail('');
      setErrorMessage('');
    } catch (error) {
      console.error("Error adding collaborator:", error);
      setErrorMessage('Failed to add collaborator');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId) => {
    try {
      if (collaboratorId === tab.owner.id) {
        setErrorMessage("Can't remove the owner");
        return;
      }

      const updates = {};
      updates[`tabs/${tab.id}/members/${collaboratorId}`] = null;
      updates[`tabs/${tab.id}/collaborators/${collaboratorId}`] = null;

      await update(ref(db), updates);
    } catch (error) {
      console.error("Error removing collaborator:", error);
      setErrorMessage('Failed to remove collaborator');
    }
  };

  const handleUpdateTab = async () => {
    try {
      const tabRef = ref(db, `tabs/${tab.id}`);
      await update(tabRef, {
        name: tabData.name,
        icon: tabData.icon,
        updatedAt: Date.now()
      });
      onClose();
    } catch (error) {
      console.error("Error updating tab:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error("Error deleting tab:", error);
    }
  };

  // Prevent body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-hidden">
      <div className="bg-gradient-to-br from-white via-purple-50 to-purple-100 p-0 rounded-3xl shadow-2xl w-full max-w-lg mx-2 relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-purple-600 transition-colors text-2xl"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="px-10 py-8">
          <h3 className="text-2xl font-bold mb-6 text-center text-purple-700 tracking-tight">
            <span className="inline-block bg-purple-100 rounded-full px-4 py-1 mb-2">
              <FaCog className="inline mr-2 mb-1" />
              Tab Settings
            </span>
          </h3>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* Tab Details Section */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-purple-700 mb-2">
                Tab Name
              </label>
              <input
                type="text"
                value={tabData.name}
                onChange={(e) => setTabData({ ...tabData, name: e.target.value })}
                className="w-full p-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white shadow-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-purple-700 mb-2">
                Tab Icon
              </label>
              <div className="bg-white rounded-lg border border-purple-100 p-2 shadow-sm">
                <IconPicker onSelect={(icon) => setTabData({ ...tabData, icon })} selected={tabData.icon} />
              </div>
            </div>
          </div>

          {/* Collaboration Section */}
          <div className="border-t border-purple-200 pt-6 mb-8">
            <h4 className="text-lg font-semibold text-purple-700 mb-4">
              Collaboration
            </h4>

            {/* Collaborators List */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Collaborators
              </label>
              <div className="space-y-2">
                {tab.members && Object.entries(tab.members)
                  .filter(([id]) => id !== tab.owner.id)
                  .map(([id, member]) => (
                    <div key={id} className="flex items-center gap-2 p-2 bg-white rounded-lg">
                      <FaUserCircle className="text-gray-600" />
                      <span>{member.email}</span>
                      <button
                        onClick={() => handleRemoveCollaborator(id)}
                        className="ml-auto p-1 hover:bg-red-100 rounded-full text-red-500 transition-colors"
                        title="Remove collaborator"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Add Collaborator */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Add Collaborator
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter collaborator's email"
                  value={newCollaboratorEmail}
                  onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                  className="flex-1 p-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  onClick={handleAddCollaborator}
                  className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                  title="Add collaborator"
                >
                  <FaUserPlus />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t border-purple-200">
            <button
              onClick={() => setShowDeleteConfirmation(true)}
              className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <FaTrash />
              Delete Tab
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors shadow"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTab}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow font-medium transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-white via-red-50 to-red-100 p-0 rounded-3xl shadow-2xl w-full max-w-lg mx-2 relative animate-fade-in">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="text-gray-400 hover:text-red-600 transition-colors text-2xl"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="px-10 py-8">
              <h3 className="text-2xl font-bold mb-6 text-center text-red-700 tracking-tight">
                <span className="inline-block bg-red-100 rounded-full px-4 py-1 mb-2">
                  🗑️ Delete Tab
                </span>
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                Are you sure you want to delete this tab?<br />
                All tasks within this tab will be permanently removed.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirmation(false)}
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors shadow"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
