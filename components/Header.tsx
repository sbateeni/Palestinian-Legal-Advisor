
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
              {/* New Legal Scale Logo */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-amber-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
              </svg>
              <span className="hidden sm:inline">المستشار القانوني</span>
            </NavLink>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-reverse space-x-2">
            <NavLink to="/" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} ${linkClasses}`}>قضية مدنية</NavLink>
            <NavLink to="/sharia" className={({ isActive }) => `${isActive ? 'bg-emerald-700 text-white' : 'text-emerald-400 hover:bg-emerald-900/50'} ${linkClasses} border border-emerald-600/30`}>المستشار الشرعي</NavLink>
            <NavLink to="/cases" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} ${linkClasses}`}>القضايا</NavLink>
            <NavLink to="/inheritance" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} ${linkClasses}`}>المواريث</NavLink>
            <NavLink to="/ocr" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} ${linkClasses}`}>تحليل مستند</NavLink>
            <NavLink to="/tools" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} ${linkClasses}`}>الأدوات</NavLink>
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
          <div className="md:hidden pb-3 space-y-1" onClick={() => setIsMenuOpen(false)}>
            <NavLink to="/" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} block ${linkClasses}`}>قضية مدنية/جزائية</NavLink>
            <NavLink to="/sharia" className={({ isActive }) => `${isActive ? 'bg-emerald-700 text-white' : 'text-emerald-400'} block ${linkClasses}`}>المستشار الشرعي</NavLink>
            <NavLink to="/cases" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} block ${linkClasses}`}>سجل القضايا</NavLink>
            <NavLink to="/inheritance" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} block ${linkClasses}`}>المواريث</NavLink>
            <NavLink to="/ocr" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} block ${linkClasses}`}>تحليل مستند</NavLink>
             <NavLink to="/tools" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} block ${linkClasses}`}>الأدوات</NavLink>
            <NavLink to="/settings" className={({ isActive }) => `${isActive ? activeLinkClass : inactiveLinkClass} block ${linkClasses}`}>الإعدادات</NavLink>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
