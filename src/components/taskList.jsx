import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { useAuth } from "../context/AuthContext";
import TaskItem from "./taskItem";
import { ref, push, remove, onValue, update, get } from "firebase/database";
import { db } from "../firebase";
import IconPicker from './IconPicker';

const TaskList = ({ activeTab, setActiveTab }) => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTab, setEditTab] = useState({
    name: "",
    icon: "",
  });
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [modalTitle, setModalTitle] = useState("Create New Task");
  const [newTask, setNewTask] = useState({
    text: "",
    startDate: "",
    endDate: "",
    status: "",
  });
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Calculate statistics
  const getTaskStats = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.status === "completed"
    ).length;
    const inProgressTasks = tasks.filter(
      (task) => task.status === "in-progress"
    ).length;
    const notStartedTasks = tasks.filter(
      (task) => task.status === "not-started"
    ).length;

    return {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      notStarted: notStartedTasks,
      completionRate:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  };

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

  const handleDeleteTab = async () => {
    try {
      // Mark the tab as deleted in the shared path
      const tabRef = ref(db, `tabs/${activeTab.id}`);
      await update(tabRef, { 
        deleted: true,
        deletedBy: {
          id: currentUser.uid,
          email: currentUser.email
        },
        deletedAt: Date.now()
      });
      setActiveTab(null);
      setShowSettingsModal(false);
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error("Error deleting tab:", error);
      setErrorMessage("Failed to delete tab. Please try again.");
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.text) return;

    // Check if endDate is before startDate
    if (
      newTask.startDate &&
      newTask.endDate &&
      new Date(newTask.endDate) < new Date(newTask.startDate)
    ) {
      setModalTitle("End date cannot be before start date");
      setTimeout(() => {
        setModalTitle("Create New Task");
      }, 3000);
      return;
    }

    const formattedDate = new Date().toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Create the new task data
    const taskRef = ref(db, `tabs/${activeTab.id}/tasks`);
    const newTaskRef = push(taskRef);
    
    try {
      await update(ref(db), {
        [`tabs/${activeTab.id}/tasks/${newTaskRef.key}`]: {
          ...newTask,
          createdAt: formattedDate,
          createdBy: {
            id: currentUser.uid,
            email: currentUser.email
          },
          lastUpdatedBy: {
            id: currentUser.uid,
            email: currentUser.email
          },
          lastUpdatedAt: Date.now(),
          order: tasks.length // Add at the end by default
        }
      });

      setShowNewTaskModal(false);
      setNewTask({ text: "", startDate: "", endDate: "", status: "not-started" });
    } catch (error) {
      console.error("Error creating task:", error);
      setModalTitle("Failed to create task. Please try again.");
      setTimeout(() => {
        setModalTitle("Create New Task");
      }, 3000);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Optimistically update the local state
    setTasks(items);

    try {
      // Update each task's order in the shared path
      const updates = {};
      items.forEach((task, index) => {
        updates[`tabs/${activeTab.id}/tasks/${task.id}/order`] = index;
        updates[`tabs/${activeTab.id}/tasks/${task.id}/lastUpdatedBy`] = {
          id: currentUser.uid,
          email: currentUser.email
        };
        updates[`tabs/${activeTab.id}/tasks/${task.id}/lastUpdatedAt`] = Date.now();
      });

      // Update Firebase
      await update(ref(db), updates);
    } catch (error) {
      console.error("Error updating task order:", error);
      // Revert to original order if update fails
      setTasks(tasks);
    }
  };

  const handleEditTab = async () => {
    if (!editTab.name.trim()) return;

    try {
      const tabRef = ref(db, `tabs/${activeTab.id}`);
      const updates = {
        name: editTab.name.trim(),
        icon: editTab.icon || activeTab.icon,
        lastUpdatedBy: {
          id: currentUser.uid,
          email: currentUser.email
        },
        lastUpdatedAt: Date.now()
      };
      
      await update(tabRef, updates);
      setShowEditModal(false);
      
      // Update the active tab in parent component
      setActiveTab({
        ...activeTab,
        ...updates
      });
    } catch (error) {
      console.error("Error updating tab:", error);
      setErrorMessage("Failed to update tab");
    }
  };
  const handleAddCollaborator = async () => {
    if (!newCollaboratorEmail) return;

    try {
      setErrorMessage('');
      const collaborator = await findUserByEmail(newCollaboratorEmail);
      
      if (!collaborator) {
        setErrorMessage('User not found with this email');
        return;
      }

      if (collaborator.id === currentUser.uid) {
        setErrorMessage('You cannot add yourself as a collaborator');
        return;
      }

      const tabRef = ref(db, `tabs/${activeTab.id}`);
      const updates = {
        [`collaborators/${collaborator.id}`]: {
          role: 'editor',
          email: newCollaboratorEmail
        },
        [`members/${collaborator.id}`]: {
          role: 'editor',
          email: newCollaboratorEmail
        }
      };

      await update(tabRef, updates);
      setNewCollaboratorEmail('');
      setErrorMessage('Collaborator added successfully');
    } catch (error) {
      console.error("Error adding collaborator:", error);
      setErrorMessage('Failed to add collaborator');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId, collaboratorEmail) => {
    try {
      // Remove member from the shared tab
      const memberRef = ref(db, `tabs/${activeTab.id}/members/${collaboratorId}`);
      await remove(memberRef);

      // Update active tab state
      const updatedTab = { ...activeTab };
      delete updatedTab.members[collaboratorId];
      setActiveTab(updatedTab);
    } catch (error) {
      console.error("Error removing collaborator:", error);
      setErrorMessage('Failed to remove collaborator');
    }
  };

  const handleLeaveTab = async () => {
    try {
      // Remove user from members list in the shared tab
      const memberRef = ref(db, `tabs/${activeTab.id}/members/${currentUser.uid}`);
      await remove(memberRef);
      setActiveTab(null);
    } catch (error) {
      console.error("Error leaving tab:", error);
      setErrorMessage('Failed to leave tab');
    }
  };

  useEffect(() => {
    if (!activeTab?.id) return;

    const taskRef = ref(db, `tabs/${activeTab.id}/tasks`);

    const unsubscribe = onValue(taskRef, (snapshot) => {
      const data = snapshot.val();
      const loadedTasks = data
        ? Object.entries(data)
            .map(([id, value]) => ({ id, ...value }))
            .filter(task => !task.deleted)
            .sort((a, b) => {
              // Sort by order first, then creation date
              if (a.order === b.order) {
                return (new Date(b.createdAt)).getTime() - (new Date(a.createdAt)).getTime();
              }
              return (a.order || 0) - (b.order || 0);
            })
        : [];
      
      setTasks(loadedTasks);
    }, 
    (error) => {
      console.error("Error loading tasks:", error);
      setErrorMessage("Error loading tasks. Please try again later.");
    });

    return () => unsubscribe();
  }, [activeTab?.id]);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-700">
          Tasks for: {activeTab.name}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition flex items-center justify-center"
          >
            <span className="flex items-center justify-center text-xl w-6 h-6">+</span>
            <span className="hidden sm:inline">Create Task</span>
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl shadow hover:bg-gray-300 transition flex items-center"
          >
            <span className="text-xl">⚙️</span>
            <span className="hidden sm:inline ml-1">Settings</span>
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {tasks.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            No tasks yet. Create your first one!
          </div>
        ) : (
          <Droppable droppableId="tasks">
            {(provided, snapshot) => (
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`space-y-3 ${
                  snapshot.isDraggingOver ? "rounded-xl" : ""
                }`}
              >
                {tasks.map((task, index) => (                  <TaskItem
                    key={task.id}
                    task={task}
                    index={index}
                    activeTab={activeTab}
                    onDelete={async (id) => {
                      try {
                        const taskRef = ref(db, `tabs/${activeTab.id}/tasks/${id}`);
                        await update(taskRef, {
                          deleted: true,
                          deletedBy: {
                            id: currentUser.uid,
                            email: currentUser.email
                          },
                          deletedAt: Date.now()
                        });
                      } catch (error) {
                        console.error("Error deleting task:", error);
                      }
                    }}
                  />
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        )}
      </DragDropContext>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl mx-2 p-6">
            <h3
              className={`text-xl font-semibold mb-4 ${
                modalTitle !== "Create New Task"
                  ? "text-red-600"
                  : "text-gray-800"
              }`}
            >
              {modalTitle}
            </h3>

            <input
              type="text"
              placeholder="Task description"
              value={newTask.text}
              onChange={(e) =>
                setNewTask({ ...newTask, text: e.target.value })
              }
              className="w-full p-3 border rounded-lg mb-4 focus:ring focus:ring-blue-200"
            />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newTask.startDate}
                  onChange={(e) =>
                    setNewTask({ ...newTask, startDate: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={newTask.endDate}
                  onChange={(e) =>
                    setNewTask({ ...newTask, endDate: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl mx-2 p-6">
            <h3 className="text-xl font-semibold mb-6 text-gray-800">
              Tab Settings
            </h3>

            <div className="space-y-4 mb-6">
              {errorMessage && (
                <div className={`p-3 rounded-lg ${
                  errorMessage.includes('success') 
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {errorMessage}
                </div>
              )}              {/* Collaborators Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">
                  {activeTab.owner?.id === currentUser.uid ? 'Shared Users' : 'Tab Access'}
                </h4>
                
                {activeTab.owner?.id === currentUser.uid ? (
                  <>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="email"
                        placeholder="Add collaborator by email"
                        value={newCollaboratorEmail}
                        onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                        className="flex-1 p-2 border rounded"
                      />
                      <button
                        onClick={handleAddCollaborator}
                        className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
                      >
                        Add
                      </button>
                    </div>

                    {/* List current collaborators */}
                    <div className="space-y-2">
                      {activeTab.members && Object.entries(activeTab.members).map(([id, data]) => {
                        // Skip the owner in the list
                        if (id === currentUser.uid) return null;
                        return (
                          <div key={id} className="flex items-center justify-between bg-white p-2 rounded shadow-sm">
                            <span className="text-sm text-gray-600">{data.email}</span>
                            <button
                              onClick={() => handleRemoveCollaborator(id, data.email)}
                              className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between bg-white p-3 rounded shadow-sm">
                    <div>
                      <p className="text-sm text-gray-600">Owner: {activeTab.owner?.email}</p>
                      <button
                        onClick={handleLeaveTab}
                        className="mt-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        Leave Tab
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Tab Info</h4>
                <p className="text-sm text-gray-600">
                  Created: {new Date(activeTab.createdAt).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  Owner: {activeTab.owner?.email}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Statistics</h4>
                <dl className="grid grid-cols-2 gap-4">
                  {Object.entries(getTaskStats()).map(([key, value]) => (
                    <div key={key} className="bg-white p-3 rounded-lg shadow-sm">
                      <dt className="text-sm text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</dt>
                      <dd className="text-lg font-semibold text-gray-700">
                        {key === 'completionRate' ? `${value}%` : value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>            <div className="flex justify-between items-center">
              <div className="space-x-2">
                <button
                  onClick={() => {
                    setShowSettingsModal(false);
                    setErrorMessage('');
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                >
                  Close
                </button>
                {activeTab.owner?.id === currentUser.uid && (
                  <button
                    onClick={() => {
                      setEditTab({
                        name: activeTab.name,
                        icon: activeTab.icon
                      });
                      setShowEditModal(true);
                      setShowSettingsModal(false);
                    }}
                    className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                  >
                    Edit Tab
                  </button>
                )}
              </div>
              {activeTab.owner?.id === currentUser.uid && (
                <button
                  onClick={() => setShowDeleteConfirmation(true)}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                >
                  Delete Tab
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Tab Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl mx-2 p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Edit Tab
            </h3>

            <input
              type="text"
              placeholder="Tab name"
              value={editTab.name}
              onChange={(e) => setEditTab({ ...editTab, name: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tab Icon
              </label>
              <IconPicker onSelect={(icon) => setEditTab({ ...editTab, icon })} selected={editTab.icon} />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditTab}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
                disabled={!editTab.name.trim()}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl mx-2 p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Delete Tab
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>"{activeTab.name}"</strong>?<br />
              This tab and its tasks will be hidden from your view but can be restored later if needed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTab}
                className="px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Task Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-sm text-gray-500">Total Tasks</div>
            <div className="text-xl font-bold">
              {getTaskStats().total}
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-sm text-gray-500">Completed Tasks</div>
            <div className="text-xl font-bold">
              {getTaskStats().completed}
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-sm text-gray-500">In-Progress Tasks</div>
            <div className="text-xl font-bold">
              {getTaskStats().inProgress}
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow">
            <div className="text-sm text-gray-500">Not Started Tasks</div>
            <div className="text-xl font-bold">
              {getTaskStats().notStarted}
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow col-span-2">
            <div className="text-sm text-gray-500">Completion Rate</div>
            <div className="text-xl font-bold">
              {getTaskStats().completionRate}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskList;
