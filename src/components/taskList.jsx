import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { useAuth } from "../context/AuthContext";
import TaskItem from "./taskItem";
import { ref, push, remove, onValue, update, get } from "firebase/database";
import { db } from "../firebase";
import IconPicker from './IconPicker';
import * as Icons from 'react-icons/fa';

const TaskList = ({ activeTab, setActiveTab }) => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

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
  const [taskStatistics, setTaskStatistics] = useState({
    total: 0,
    "not-started": 0,
    "in-progress": 0,
    waiting: 0,
    "on-hold": 0,
    "needs-review": 0,
    completed: 0,
    canceled: 0
  });

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

      // Update statistics immediately after adding task
      setTaskStatistics(prev => ({
        ...prev,
        total: (prev.total || 0) + 1,
        "not-started": (prev["not-started"] || 0) + 1
      }));

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

      // Calculate statistics
      const stats = {
        total: loadedTasks.length,
        "not-started": 0,
        "in-progress": 0,
        waiting: 0,
        "on-hold": 0,
        "needs-review": 0,
        completed: 0,
        canceled: 0
      };

      loadedTasks.forEach(task => {
        stats[task.status] = (stats[task.status] || 0) + 1;
      });

      setTaskStatistics(stats);
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
        <h2 className="flex items-center gap-2 text-2xl font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-xl shadow-sm">
          <span className="truncate text-decoration-underline max-w-xs" title={activeTab.name}>
            {activeTab.name}'s Tasks:
          </span>
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="flex items-center gap-2 px-2 py-2 bg-gradient-to-r from-green-400 via-blue-400 to-blue-600 text-white rounded-full shadow-lg hover:scale-105 hover:from-green-500 hover:to-blue-700 transition-all duration-200 font-semibold text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <span className="flex items-center justify-center text-2xl w-7 h-7 bg-white/20 rounded-full shadow-inner">
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <rect x="9" y="4" width="2" height="12" rx="1" fill="currentColor"/>
                <rect x="4" y="9" width="12" height="2" rx="1" fill="currentColor"/>
              </svg>
            </span>
            <span className="hidden sm:inline">Create Task</span>
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-white via-green-50 to-green-100 p-0 rounded-3xl shadow-2xl w-full max-w-lg mx-2 relative animate-fade-in">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="text-gray-400 hover:text-green-600 transition-colors text-2xl"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="px-10 py-8">
              <h3 className="text-2xl font-bold mb-6 text-center text-green-700 tracking-tight">
                <span className="inline-block bg-green-100 rounded-full px-4 py-1 mb-2">
                  ✨ Create New Task
                </span>
              </h3>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-green-700 mb-2">
                  Task Description
                </label>
                <input
                  type="text"
                  value={newTask.text}
                  onChange={(e) =>
                    setNewTask({ ...newTask, text: e.target.value })
                  }
                  placeholder="What needs to be done?"
                  className="w-full p-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 bg-white shadow-sm transition"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-green-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newTask.startDate}
                    onChange={(e) =>
                      setNewTask({ ...newTask, startDate: e.target.value })
                    }
                    className="w-full p-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 bg-white shadow-sm transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newTask.endDate}
                    onChange={(e) =>
                      setNewTask({ ...newTask, endDate: e.target.value })
                    }
                    className="w-full p-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 bg-white shadow-sm transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors shadow"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleCreateTask}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow font-medium transition-colors"
                >
                  Create Task
                </button>
              </div>
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
