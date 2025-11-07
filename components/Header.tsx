import React from 'react';
import { NavLink } from 'react-router-dom';

const Header: React.FC = () => {
  const activeLinkClass = "bg-gray-700 text-white";
  const inactiveLinkClass = "text-gray-300 hover:bg-gray-700 hover:text-white";

  return (
    <header className="bg-gray-800 shadow-md">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block me-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            المستشار القانوني
          </h1>
          <div className="hidden md:flex items-center space-x-reverse space-x-4">
             <NavLink to="/" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} px-3 py-2 rounded-md text-sm font-medium`}>
              قضية جديدة
            </NavLink>
            <NavLink to="/cases" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} px-3 py-2 rounded-md text-sm font-medium`}>
              القضايا
            </NavLink>
             <NavLink to="/settings" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} px-3 py-2 rounded-md text-sm font-medium`}>
              الإعدادات
            </NavLink>
          </div>
        </div>
        <div className="md:hidden">
          {/* Mobile menu button could be added here */}
        </div>
      </nav>
    </header>
  );
};

export default Header;
