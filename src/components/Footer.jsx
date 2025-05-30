import React from 'react';
import { FaGithub, FaFire, FaReact, FaDatabase } from 'react-icons/fa';
import { SiTailwindcss, SiVite } from 'react-icons/si';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {/* About Section */}
          <div className="group">
            <h3 className="text-white text-lg font-semibold mb-3 group-hover:text-blue-400 transition-colors">
              BlockTasks
            </h3>
            <p className="text-sm group-hover:text-gray-300 transition-colors duration-300">
              A collaborative task management website designed to help teams work together efficiently.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://github.com/Kreedx/minecrat-to-do" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-blue-400 transition-colors duration-300 group"
                >
                  <FaGithub className="group-hover:rotate-12 transition-transform duration-300 text-2xl group-hover:text-[#181717]" />
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <a 
                  href="https://firebase.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-orange-400 transition-colors duration-300 group"
                >
                  <FaFire className="group-hover:scale-110 transition-transform duration-300 text-2xl group-hover:text-[#FFCA28]" />
                  <span>Powered by Firebase</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Technologies */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-3">Built With</h3>
            <div className="flex flex-wrap gap-3 text-sm justify-center md:justify-start">
              <span className="tech-badge group">
                <FaReact className="group-hover:rotate-180 transition-transform duration-700 text-2xl group-hover:text-[#61DAFB]" />
                React
              </span>
              <span className="tech-badge group">
                <FaDatabase className="group-hover:-translate-y-1 transition-transform text-2xl group-hover:text-[#FFA000]" />
                Firebase
              </span>
              <span className="tech-badge group">
                <SiTailwindcss className="group-hover:scale-110 transition-transform text-2xl group-hover:text-[#38BDF8]" />
                Tailwind
              </span>
              <span className="tech-badge group">
                <SiVite className="group-hover:rotate-12 transition-transform text-2xl group-hover:text-[#646CFF]" />
                Vite
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-sm text-center">
          <p className="hover:text-gray-300 transition-colors duration-300">
            © {currentYear} BlockTasks. All rights reserved.
          </p>
          <p className="mt-2">
            Created by{' '}
            <a
              href="https://github.com/Kreedx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors duration-300 hover:underline"
            >
              Dominik Baczek
            </a>
          </p>
        </div>
      </div>

      <style jsx>{`
        .tech-badge {
          @apply bg-gray-800 px-3 py-1.5 rounded-full inline-flex items-center gap-2 hover:bg-gray-700 transition-colors duration-300;
        }
      `}</style>
    </footer>
  );
}
