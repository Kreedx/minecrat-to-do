import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-3">BlockTasks</h3>
            <p className="text-sm">
              A collaborative task management platform designed to help teams work together efficiently.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://github.com/yourusername/blocktasks" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a 
                  href="https://firebase.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-white transition"
                >
                  Powered by Firebase
                </a>
              </li>
            </ul>
          </div>

          {/* Technologies */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-3">Built With</h3>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="bg-gray-800 px-2 py-1 rounded">React</span>
              <span className="bg-gray-800 px-2 py-1 rounded">Firebase</span>
              <span className="bg-gray-800 px-2 py-1 rounded">Tailwind CSS</span>
              <span className="bg-gray-800 px-2 py-1 rounded">Vite</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-sm text-center">
          <p>© {currentYear} BlockTasks. All rights reserved.</p>
          <p className="mt-2">
            Created by{' '}
            <a
              href="https://github.com/yourusername"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition"
            >
              Dominik Baczek
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
