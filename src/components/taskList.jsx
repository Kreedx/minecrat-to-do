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
      // Mark the tab as deleted instead of removing it
      const tabRef = ref(db, `users/${currentUser.uid}/tabs/${activeTab.id}`);
      await update(tabRef, { deleted: true });
      setActiveTab(null); // Clear the active tab in the parent component
      setShowSettingsModal(false);
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error("Error deleting tab:", error);
      alert("Failed to delete tab. Please try again.");
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

    const updates = {};

    // Get all existing tasks and increment their order
    tasks.forEach((task) => {
      const taskRef = `users/${currentUser.uid}/tabs/${activeTab.id}/tasks/${task.id}`;
      updates[`${taskRef}/order`] = task.order + 1;
    });

    // Generate a new task ID that will be shared between owner and collaborators
    const taskRef = ref(db, `users/${currentUser.uid}/tabs/${activeTab.id}/tasks`);
    const newTaskRef = push(taskRef);
    const newTaskId = newTaskRef.key;

    // Create the new task data
    const taskData = {
      ...newTask,
      createdAt: formattedDate,
      order: 0,
      id: newTaskId,
      createdBy: currentUser.uid,
      creator: currentUser.email,
    };

    // Add task to owner's path
    updates[`users/${activeTab.owner}/tabs/${activeTab.id}/tasks/${newTaskId}`] = taskData;

    // Add task to all collaborators' paths
    if (activeTab.collaborators) {
      Object.keys(activeTab.collaborators).forEach(collaboratorId => {
        updates[`users/${collaboratorId}/tabs/${activeTab.id}/tasks/${newTaskId}`] = taskData;
      });
    }

    try {
      // Update Firebase with all changes in one transaction
      await update(ref(db), updates);
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

    // Create updates object for Firebase
    const updates = {};
    items.forEach((task, index) => {
      // Update order in owner's path
      const ownerTaskRef = `users/${activeTab.owner}/tabs/${activeTab.id}/tasks/${task.id}`;
      updates[`${ownerTaskRef}/order`] = index;
      updates[`${ownerTaskRef}/lastUpdatedBy`] = currentUser.email;
      updates[`${ownerTaskRef}/lastUpdatedAt`] = Date.now();

      // Update order in collaborators' paths
      if (activeTab.collaborators) {
        Object.keys(activeTab.collaborators).forEach(collaboratorId => {
          const collaboratorTaskRef = `users/${collaboratorId}/tabs/${activeTab.id}/tasks/${task.id}`;
          updates[`${collaboratorTaskRef}/order`] = index;
          updates[`${collaboratorTaskRef}/lastUpdatedBy`] = currentUser.email;
          updates[`${collaboratorTaskRef}/lastUpdatedAt`] = Date.now();
        });
      }
    });

    try {
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
      const tabRef = ref(db, `users/${currentUser.uid}/tabs/${activeTab.id}`);
      await update(tabRef, {
        name: editTab.name.trim(),
        icon: editTab.icon || activeTab.icon, // Keep old icon if none selected
      });
      setShowEditModal(false);
      // Update the active tab in parent component
      setActiveTab({
        ...activeTab,
        name: editTab.name.trim(),
        icon: editTab.icon || activeTab.icon,
      });
    } catch (error) {
      console.error("Error updating tab:", error);
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

      const tabRef = ref(db, `users/${currentUser.uid}/tabs/${activeTab.id}`);
      const updates = {
        [`collaborators/${collaborator.id}`]: {
          role: 'editor',
          email: newCollaboratorEmail
        }
      };

      await update(tabRef, updates);

      // Add tab to collaborator's account
      const collaboratorTabRef = ref(db, `users/${collaborator.id}/tabs/${activeTab.id}`);
      await update(collaboratorTabRef, {
        ...activeTab,
        isShared: true,
        sharedBy: currentUser.email
      });

      setNewCollaboratorEmail('');
      setErrorMessage('Collaborator added successfully');
    } catch (error) {
      console.error("Error adding collaborator:", error);
      setErrorMessage('Failed to add collaborator');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId, collaboratorEmail) => {
    try {
      // Remove collaborator from the tab
      const tabRef = ref(db, `users/${currentUser.uid}/tabs/${activeTab.id}/collaborators/${collaboratorId}`);
      await remove(tabRef);

      // Remove tab from collaborator's account
      const collaboratorTabRef = ref(db, `users/${collaboratorId}/tabs/${activeTab.id}`);
      await remove(collaboratorTabRef);

      // Update active tab state
      const updatedTab = { ...activeTab };
      delete updatedTab.collaborators[collaboratorId];
      setActiveTab(updatedTab);
    } catch (error) {
      console.error("Error removing collaborator:", error);
      setErrorMessage('Failed to remove collaborator');
    }
  };

  const handleLeaveTab = async () => {
    try {
      // Remove tab from current user's account
      const tabRef = ref(db, `users/${currentUser.uid}/tabs/${activeTab.id}`);
      await remove(tabRef);
      
      // Remove user from collaborators list in owner's tab
      const ownerTabRef = ref(db, `users/${activeTab.owner}/tabs/${activeTab.id}/collaborators/${currentUser.uid}`);
      await remove(ownerTabRef);

      setActiveTab(null);
    } catch (error) {
      console.error("Error leaving tab:", error);
      setErrorMessage('Failed to leave tab');
    }
  };

  useEffect(() => {
    if (!activeTab?.id) return;

    // Determine which user's path to listen to (owner or current user)
    const taskRef = ref(
      db,
      `users/${activeTab.owner}/tabs/${activeTab.id}/tasks`
    );

    const unsubscribe = onValue(taskRef, (snapshot) => {
      const data = snapshot.val();
      const loadedTasks = data
        ? Object.entries(data)
            .map(([id, value]) => ({ id, ...value }))
            .filter(task => !task.deleted) // Filter out deleted tasks
        : [];
      
      // Sort by order property, using index as fallback
      loadedTasks.sort((a, b) => {
        if (a.order === undefined && b.order === undefined) return 0;
        if (a.order === undefined) return 1;
        if (b.order === undefined) return -1;
        return a.order - b.order;
      });
      
      setTasks(loadedTasks);
    }, 
    (error) => {
      console.error("Error loading tasks:", error);
      setErrorMessage("Error loading tasks. Please try again later.");
    });

    return () => unsubscribe();
  }, [activeTab, currentUser.uid]);

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
                      const updates = {};
                      const ownerTaskRef = `users/${activeTab.owner}/tabs/${activeTab.id}/tasks/${id}`;
                      
                      // Mark as deleted in owner's path
                      updates[ownerTaskRef] = {
                        ...task,
                        deleted: true,
                        deletedBy: currentUser.email,
                        deletedAt: Date.now()
                      };

                      // Mark as deleted in all collaborators' paths
                      if (activeTab.collaborators) {
                        Object.keys(activeTab.collaborators).forEach(collaboratorId => {
                          const collaboratorTaskRef = `users/${collaboratorId}/tabs/${activeTab.id}/tasks/${id}`;
                          updates[collaboratorTaskRef] = updates[ownerTaskRef];
                        });
                      }

                      await update(ref(db), updates);
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
              )}

              {/* Collaborators Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Collaborators</h4>
                
                {activeTab.owner === currentUser.uid ? (
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
                      {activeTab.collaborators && Object.entries(activeTab.collaborators).map(([id, data]) => (
                        <div key={id} className="flex items-center justify-between bg-white p-2 rounded shadow-sm">
                          <span className="text-sm text-gray-600">{data.email}</span>
                          <button
                            onClick={() => handleRemoveCollaborator(id, data.email)}
                            className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between bg-white p-3 rounded shadow-sm">
                    <div>
                      <p className="text-sm text-gray-600">Shared by: {activeTab.sharedBy}</p>
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
                  Owner: {activeTab.owner === currentUser.uid ? 'You' : activeTab.sharedBy}
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
            </div>

            <div className="flex justify-between items-center">
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
                {activeTab.owner === currentUser.uid && (
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
              {activeTab.owner === currentUser.uid && (
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
