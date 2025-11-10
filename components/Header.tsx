import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const activeLinkClass = "bg-gray-700 text-white";
  const inactiveLinkClass = "text-gray-300 hover:bg-gray-700 hover:text-white";
  const linkClasses = "px-3 py-2 rounded-md text-sm font-medium";

  return (
    <header className="bg-gray-800 shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center space-x-4">
            <NavLink to="/" className="flex items-center space-x-2 text-xl font-bold text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-1.5 8.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm3 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM9 13.5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM12 1c-3.86 0-7 3.14-7 7 0 1.95.8 3.72 2.05 4.95-.02.02-.05.04-.05.05 0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5c0-.01-.03-.03-.05-.05C18.2 11.72 19 9.95 19 8c0-3.86-3.14-7-7-7z"></path>
              </svg>
              <span>المستشار القانوني</span>
            </NavLink>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-reverse space-x-2">
            <NavLink to="/" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} ${linkClasses}`}>قضية جديدة</NavLink>
            <NavLink to="/cases" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} ${linkClasses}`}>القضايا المحفوظة</NavLink>
            <NavLink to="/settings" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} ${linkClasses}`}>الإعدادات</NavLink>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-300 hover:text-white focus:outline-none focus:text-white">
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-3" onClick={() => setIsMenuOpen(false)}>
            <NavLink to="/" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} block ${linkClasses}`}>قضية جديدة</NavLink>
            <NavLink to="/cases" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} block mt-1 ${linkClasses}`}>القضايا المحفوظة</NavLink>
            <NavLink to="/settings" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} block mt-1 ${linkClasses}`}>الإعدادات</NavLink>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;