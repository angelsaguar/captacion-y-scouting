import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import UDLaPovedaLogo from './UDLaPovedaLogo';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, ChevronRight } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  // Close mobile sidebar on navigation/route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Desktop Sidebar - fixed on lg and larger devices */}
      <div 
        className={`desktop-sidebar-container hidden lg:block h-full flex-shrink-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-0 overflow-hidden opacity-0 invisible' : 'w-64'
        }`}
      >
        <Sidebar onCollapse={toggleSidebar} isCollapsed={isSidebarCollapsed} />
      </div>

      {/* Mobile Sticky Header - only visible on small devices (< lg) */}
      <header className="mobile-header-container lg:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/95 sticky top-0 z-40 select-none">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-lg flex-shrink-0">
            <UDLaPovedaLogo className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight leading-tight">U.D. LA POVEDA</h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Scouting System</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors"
          aria-label="Abrir menú"
          id="open-sidebar-mobile-btn"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile Drawer (Menu) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-50 lg:hidden"
            />
            
            {/* Sliding cabinet menu container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-slate-950 z-50 shadow-2xl lg:hidden h-full overflow-hidden"
            >
              <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto relative flex flex-col">
        {/* Floating Sidebar Toggle Button - only visible on lg devices when collapsed */}
        {isSidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex fixed top-4 left-4 z-45 items-center gap-1.5 px-3 py-1.5 bg-slate-900/95 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 shadow-lg backdrop-blur-md transition-all duration-200 cursor-pointer text-xs font-bold uppercase tracking-wider"
            title="Mostrar menú de navegación"
            id="toggle-sidebar-expand-btn"
          >
            <ChevronRight className="w-4 h-4 text-blue-500" />
            <span>Menú</span>
          </button>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-3 md:p-8"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
