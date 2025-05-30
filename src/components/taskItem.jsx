import React, { useState, useRef, useEffect } from "react";
import { Draggable } from "react-beautiful-dnd";
import { FaEllipsisV, FaGripVertical, FaUserCircle } from "react-icons/fa";
import { ref, update } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const STATUS_OPTIONS = {
  "not-started": {
    label: "Not Started",
    color: "bg-gray-200 text-gray-800",
  },
  "in-progress": {
    label: "In Progress",
    color: "bg-blue-200 text-blue-800",
  },
  waiting: {
    label: "Waiting for Someone",
    color: "bg-yellow-200 text-yellow-800",
  },
  "on-hold": {
    label: "On Hold",
    color: "bg-orange-200 text-orange-800",
  },
  "needs-review": {
    label: "Needs Review",
    color: "bg-purple-200 text-purple-800",
  },
  completed: {
    label: "Completed",
    color: "bg-green-200 text-green-800",

  },
  canceled: {
    label: "Canceled",
    color: "bg-red-200 text-red-800",
  },
};

export default function TaskItem({ task, onDelete, activeTab, index }) {
  const { currentUser } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const menuRef = useRef();
  const statusMenuRef = useRef();
  const assigneeMenuRef = useRef();
  const [updatedTask, setUpdatedTask] = useState({
    text: task.text,
    startDate: task.startDate || "",
    endDate: task.endDate || ""
  });

  // Close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
        setShowStatusMenu(false);
      }
      if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(event.target)) {
        setShowAssigneeMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStatusChange = async (newStatus) => {
    try {
      const taskRef = ref(db, `tabs/${activeTab.id}/tasks/${task.id}`);
      await update(taskRef, {
        status: newStatus,
        lastUpdatedBy: {
          id: currentUser.uid,
          email: currentUser.email
        },
        lastUpdatedAt: Date.now()
      });
      setShowStatusMenu(false);
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleCheckboxChange = async () => {
    const newStatus = task.status === "completed" ? "not-started" : "completed";
    await handleStatusChange(newStatus);
  };

  const handleUpdate = async () => {
    try {
      const taskRef = ref(db, `tabs/${activeTab.id}/tasks/${task.id}`);
      await update(taskRef, {
        ...updatedTask,
        lastUpdatedBy: {
          id: currentUser.uid,
          email: currentUser.email
        },
        lastUpdatedAt: Date.now()
      });
      setShowUpdateModal(false);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const updates = {};
      const ownerPath = `users/${activeTab.owner}/tabs/${activeTab.id}/tasks/${task.id}`;
      
      // Mark as deleted in owner's path
      updates[ownerPath] = {
        ...task,
        deleted: true,
        deletedBy: currentUser.email,
        deletedAt: Date.now()
      };

      // Mark as deleted in all collaborators' paths
      if (activeTab.collaborators) {
        Object.keys(activeTab.collaborators).forEach(collaboratorId => {
          const collaboratorPath = `users/${collaboratorId}/tabs/${activeTab.id}/tasks/${task.id}`;
          updates[collaboratorPath] = updates[ownerPath];
        });
      }

      await update(ref(db), updates);
      onDelete(task.id);
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleAssigneeChange = async (memberId, memberEmail) => {
    try {
      const taskRef = ref(db, `tabs/${activeTab.id}/tasks/${task.id}`);
      await update(taskRef, {
        assignee: {
          id: memberId,
          email: memberEmail
        },
        lastUpdatedBy: {
          id: currentUser.uid,
          email: currentUser.email
        },
        lastUpdatedAt: Date.now()
      });
      setShowAssigneeMenu(false);
    } catch (error) {
      console.error("Error updating task assignee:", error);
    }
  };

  const statusInfo = STATUS_OPTIONS[task.status] || STATUS_OPTIONS["not-started"];

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <>
          <li
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`bg-white px-4 py-3 rounded-xl shadow-sm flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-4 hover:shadow-md transition w-full 
              ${task.status === "completed" ? "bg-gray-50" : ""}
              ${snapshot.isDragging ? "shadow-lg ring-2 ring-blue-400" : ""}
              ${task.assignee?.id === currentUser.uid ? "bg-blue-50" : ""}`}
          >
            {/* Main content area */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div 
                {...provided.dragHandleProps} 
                className="flex items-center cursor-grab active:cursor-grabbing flex-shrink-0"
              >
                <FaGripVertical className="text-blue-600 hover:text-blue-800" />
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-medium sm:truncate break-words ${
                  task.status === "completed" ? "text-gray-400 line-through" : "text-gray-800"
                }`}>
                  {task.text}
                </p>
                <div className="block sm:hidden mt-1">
                  {task.startDate && task.endDate && (
                    <p className="text-xs text-gray-500">
                      {task.startDate} → {task.endDate}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Controls area */}
            <div className="flex items-center gap-2 ml-auto flex-shrink-0 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
              <div className="hidden sm:block">
                {task.startDate && task.endDate && (
                  <p className="text-sm text-gray-500 mr-2">
                    {task.startDate} → {task.endDate}
                  </p>
                )}
              </div>

              {/* Assignee menu - Updated for mobile */}
              <div className="relative order-1 sm:order-none w-full sm:w-auto" ref={assigneeMenuRef}>
                <button
                  onClick={() => setShowAssigneeMenu(prev => !prev)}
                  className="w-full sm:w-auto px-3 py-1 rounded-full text-sm bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <FaUserCircle className="flex-shrink-0" />
                  <span className="truncate max-w-[150px]">
                    {task.assignee?.email || "Unassigned"}
                  </span>
                </button>

                {showAssigneeMenu && (
                  <div className="absolute left-0 sm:left-auto right-0 top-10 w-full sm:w-64 bg-white rounded-lg shadow-lg z-20 py-2">
                    <button
                      onClick={() => handleAssigneeChange(null, null)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${
                        !task.assignee ? "bg-gray-50" : ""
                      }`}
                    >
                      Unassigned
                    </button>
                    {activeTab.members && Object.entries(activeTab.members).map(([memberId, member]) => (
                      <button
                        key={memberId}
                        onClick={() => handleAssigneeChange(memberId, member.email)}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between ${
                          task.assignee?.id === memberId ? "bg-gray-50" : ""
                        }`}
                      >
                        <span className="truncate mr-2 flex-1">{member.email}</span>
                        {member.role === 'owner' && (
                          <span className="text-xs text-gray-500 flex-shrink-0">(Owner)</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status and Menu buttons - Updated order */}
              <div className="flex items-center gap-2 order-2 sm:order-none">
                {/* Status menu */}
                <div className="relative" ref={statusMenuRef}>
                  <button
                    onClick={() => setShowStatusMenu(prev => !prev)}
                    className={`px-3 py-1 rounded-full text-sm ${statusInfo.color} hover:opacity-80 transition-opacity whitespace-nowrap`}
                  >
                    {statusInfo.label}
                  </button>

                  {showStatusMenu && (
                    <div className="absolute right-0 top-10 w-64 bg-white rounded-lg shadow-lg z-20 py-2">
                      {Object.entries(STATUS_OPTIONS).map(([key, status]) => (
                        <button
                          key={key}
                          onClick={() => handleStatusChange(key)}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex flex-col ${
                            task.status === key ? "bg-gray-50" : ""
                          }`}
                        >
                          <span className={`inline-block px-2 py-0.5 rounded-full text-sm ${status.color} mb-1`}>
                            {status.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Menu button */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu((prev) => !prev)}
                    className="p-2 rounded-full hover:bg-gray-100 transition"
                  >
                    <FaEllipsisV className="text-gray-500" />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 top-10 w-40 bg-white rounded-lg shadow-lg z-20 animate-fade-in">
                      <button
                        onClick={() => {
                          setShowUpdateModal(true);
                          setShowMenu(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        ✏️ Update
                      </button>
                      <button                    onClick={() => {
                          setShowMenu(false);
                          setShowDeleteConfirmation(true);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </li>

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
                      🗑️ Delete Task
                    </span>
                  </h3>
                  <p className="text-gray-600 mb-6 text-center">
                    Are you sure you want to delete this task?<br />
                    The task will be permanently removed and cannot be undone.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowDeleteConfirmation(false)}
                      className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors shadow"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onDelete(task.id);
                        setShowDeleteConfirmation(false);
                      }}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Update Modal */}
          {showUpdateModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-gradient-to-br from-white via-blue-50 to-blue-100 p-0 rounded-3xl shadow-2xl w-full max-w-lg mx-2 relative animate-fade-in">
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setShowUpdateModal(false)}
                    className="text-gray-400 hover:text-blue-600 transition-colors text-2xl"
                    aria-label="Close"
                  >
                    &times;
                  </button>
                </div>
                <div className="px-10 py-8">
                  <h3 className="text-2xl font-bold mb-6 text-center text-blue-700 tracking-tight">
                    <span className="inline-block bg-blue-100 rounded-full px-4 py-1 mb-2">
                      ✏️ Update Task
                    </span>
                  </h3>

                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-blue-700 mb-2">
                      Task Description
                    </label>
                    <input
                      type="text"
                      placeholder="Task description"
                      value={updatedTask.text}
                      onChange={(e) =>
                        setUpdatedTask({ ...updatedTask, text: e.target.value })
                      }
                      className="w-full p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-blue-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={updatedTask.startDate}
                        onChange={(e) =>
                          setUpdatedTask({ ...updatedTask, startDate: e.target.value })
                        }
                        className="w-full p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-blue-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={updatedTask.endDate}
                        onChange={(e) =>
                          setUpdatedTask({ ...updatedTask, endDate: e.target.value })
                        }
                        className="w-full p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm transition"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowUpdateModal(false)}
                      className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors shadow"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdate}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow font-medium transition-colors"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Draggable>
  );
}
