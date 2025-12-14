
import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import TokenTracker from './TokenTracker';

const { NavLink, useLocation } = ReactRouterDOM;

const Header: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-200 safe-area-padding">
      <nav className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          
          {/* Right Side: Logo / Home */}
          <div className="flex items-center">
            <NavLink to="/" className="flex items-center space-x-3 space-x-reverse group">
              <div className="bg-blue-50 p-2 rounded-xl group-hover:bg-blue-100 transition-colors border border-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                </svg>
              </div>
              {!isHome && (
                 <span className="font-bold text-gray-800 text-lg hidden sm:block">المستشار القانوني</span>
              )}
              {isHome && (
                 <span className="font-bold text-gray-800 text-lg">القائمة الرئيسية</span>
              )}
            </NavLink>
          </div>

          {/* Left Side: Settings & Tools & TokenTracker */}
          <div className="flex items-center gap-3">
            {/* Token Tracker */}
            <TokenTracker />

            {/* Research Page Link (New) */}
            <NavLink 
              to="/research" 
              className={({ isActive }) => `p-2 rounded-xl transition-all duration-200 ${isActive ? 'bg-purple-50 text-purple-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
              title="البحث القانوني والتشريعات"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
               </svg>
            </NavLink>

            {/* Forgery Detection Link */}
            <NavLink 
              to="/forgery" 
              className={({ isActive }) => `hidden md:block p-2 rounded-xl transition-all duration-200 ${isActive ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
              title="المختبر الجنائي الرقمي"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
               </svg>
            </NavLink>

            {/* Case Types Guide Link */}
            <NavLink 
              to="/types" 
              className={({ isActive }) => `p-2 rounded-xl transition-all duration-200 ${isActive ? 'bg-amber-50 text-amber-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
              title="دليل أنواع القضايا"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
               </svg>
            </NavLink>

            {/* Settings Link */}
            <NavLink 
              to="/settings" 
              className={({ isActive }) => `p-2 rounded-xl transition-all duration-200 ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
              title="الإعدادات"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
               </svg>
            </NavLink>
          </div>

        </div>
      </nav>
    </header>
  );
};

export default Header;
