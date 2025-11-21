
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NavCircleProps {
    title: string;
    icon: React.ReactNode;
    color: string;
    path: string;
    delay: string;
}

const NavCircle: React.FC<NavCircleProps> = ({ title, icon, color, path, delay }) => {
    const navigate = useNavigate();

    return (
        <div 
            onClick={() => navigate(path)}
            className={`group relative flex flex-col items-center justify-center w-36 h-36 sm:w-44 sm:h-44 rounded-full cursor-pointer transition-all duration-300 active:scale-95 hover:scale-105 animate-fade-in-up ${delay} bg-gray-800 border-2 border-gray-700 hover:border-opacity-50 shadow-xl overflow-hidden`}
            style={{ touchAction: 'manipulation' }}
        >
            {/* Background Gradient Glow on Hover/Active */}
            <div className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-tr ${color}`}></div>
            
            {/* Icon Container */}
            <div className={`mb-2 p-3 rounded-full bg-gray-900/50 shadow-inner transition-transform duration-300 group-hover:-translate-y-1 ${color.replace('from-', 'text-').split(' ')[0].replace('text-', 'text-')}`}>
                {icon}
            </div>

            {/* Text Content */}
            <h3 className="text-sm sm:text-base font-bold text-gray-200 text-center px-2 z-10 relative leading-tight group-hover:text-white">
                {title}
            </h3>
        </div>
    );
};

const HomePage: React.FC = () => {
    return (
        <div className="flex flex-col items-center min-h-full py-6 px-4 relative">
            
            {/* Welcome Section */}
            <div className="text-center mb-8 animate-fade-in w-full max-w-md">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    المستشار القانوني
                </h1>
                <p className="text-sm text-gray-400">
                    اختر نوع الخدمة للبدء
                </p>
            </div>

            {/* Circles Grid - Mobile Optimized (2 Columns) */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-8 justify-items-center pb-12 w-full max-w-4xl">
                
                {/* 1. Civil & Penal */}
                <NavCircle 
                    title="قضية مدنية"
                    path="/civil"
                    color="from-blue-500 to-indigo-600"
                    delay="animation-delay-100"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                    }
                />

                {/* 2. Sharia */}
                <NavCircle 
                    title="المستشار الشرعي"
                    path="/sharia"
                    color="from-emerald-500 to-teal-600"
                    delay="animation-delay-200"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    }
                />

                {/* 3. Inheritance */}
                <NavCircle 
                    title="المواريث"
                    path="/inheritance"
                    color="from-amber-500 to-orange-600"
                    delay="animation-delay-300"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />

                {/* 4. Cases Archive */}
                <NavCircle 
                    title="سجل القضايا"
                    path="/cases"
                    color="from-indigo-500 to-purple-600"
                    delay="animation-delay-400"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                    }
                />

                {/* 5. Document Analysis */}
                <NavCircle 
                    title="تحليل مستند"
                    path="/ocr"
                    color="from-pink-600 to-rose-600"
                    delay="animation-delay-500"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    }
                />

                {/* 6. Tools */}
                <NavCircle 
                    title="الأدوات"
                    path="/tools"
                    color="from-cyan-600 to-blue-500"
                    delay="animation-delay-600"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    }
                />

            </div>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.8s ease-out; }
                .animate-fade-in-up { animation: fadeInUp 0.6s ease-out backwards; }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .animation-delay-100 { animation-delay: 0.1s; }
                .animation-delay-200 { animation-delay: 0.15s; }
                .animation-delay-300 { animation-delay: 0.2s; }
                .animation-delay-400 { animation-delay: 0.25s; }
                .animation-delay-500 { animation-delay: 0.3s; }
                .animation-delay-600 { animation-delay: 0.35s; }
            `}</style>
        </div>
    );
};

export default HomePage;
