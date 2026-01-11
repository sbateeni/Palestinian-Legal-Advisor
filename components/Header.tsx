import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import TokenTracker from './TokenTracker';
import ThemeToggle from './ThemeToggle';

const { NavLink, useLocation } = ReactRouterDOM;

const Header: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `p-2 rounded-xl transition-all duration-200 flex items-center justify-center ${
      isActive 
        ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
        : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100'
    }`;

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-200 dark:border-slate-800 safe-area-padding transition-colors duration-300">
      <nav className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo / Home */}
          <div className="flex items-center">
            <NavLink to="/" className="flex items-center space-x-3 space-x-reverse group">
              <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 dark:text-white text-lg hidden xs:block">المستشار</span>
            </NavLink>
          </div>

          {/* Navigation Links - Center */}
          <div className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/cases" className={navLinkClass} title="سجل القضايا">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-xs font-bold ms-1 hidden lg:block">القضايا</span>
            </NavLink>

            <NavLink to="/ocr" className={navLinkClass} title="تحليل المستندات">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-bold ms-1 hidden lg:block">OCR</span>
            </NavLink>

            <NavLink to="/inheritance" className={navLinkClass} title="حاسبة المواريث">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-bold ms-1 hidden lg:block">موارث</span>
            </NavLink>

            <NavLink to="/research" className={navLinkClass} title="البحث القانوني">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
               </svg>
            </NavLink>
          </div>

          {/* Left Side: Theme, Tracker, Settings */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden xs:block scale-90 sm:scale-100">
              <TokenTracker />
            </div>
            
            <ThemeToggle />

            <NavLink to="/settings" className={navLinkClass} title="الإعدادات">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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