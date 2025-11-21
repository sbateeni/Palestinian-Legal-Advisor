
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NavItemProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    path: string;
    delay: string;
    iconColor: string;
}

const NavCircle: React.FC<NavItemProps> = ({ title, description, icon, path, delay, iconColor }) => {
    const navigate = useNavigate();

    return (
        <div 
            onClick={() => navigate(path)}
            className={`group relative flex flex-col items-center justify-center w-full max-w-[240px] aspect-square rounded-full cursor-pointer transition-all duration-500 animate-fade-in-up ${delay} bg-[#0f172a] border border-gray-700/50 shadow-2xl hover:shadow-blue-900/20 hover:border-gray-600 hover:-translate-y-1 overflow-hidden`}
            style={{ touchAction: 'manipulation' }}
        >
            {/* Background Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-800/20 to-transparent opacity-50 group-hover:opacity-80 transition-opacity duration-500"></div>
            
            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full w-full px-6 py-4 text-center">
                
                {/* Icon */}
                <div className={`mb-3 transition-transform duration-300 group-hover:scale-110 ${iconColor}`}>
                    {icon}
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-bold text-gray-100 mb-2 leading-tight group-hover:text-white transition-colors duration-300">
                    {title}
                </h3>

                {/* Description - Visible by default now */}
                <p className="text-[11px] sm:text-xs text-gray-400 font-medium leading-relaxed line-clamp-3 px-1 group-hover:text-gray-300 transition-colors duration-300">
                    {description}
                </p>
            </div>

            {/* Decorative Ring on Hover */}
            <div className="absolute inset-0 rounded-full border-2 border-white/5 scale-95 group-hover:scale-100 group-hover:border-white/10 transition-all duration-500"></div>
        </div>
    );
};

const HomePage: React.FC = () => {
    const navItems: NavItemProps[] = [
        {
            title: "القضايا المدنية والجزائية",
            description: "تحليل القضايا، صيد الثغرات، صياغة اللوائح، وبناء الاستراتيجيات.",
            path: "/civil",
            delay: "animation-delay-100",
            iconColor: "text-blue-400",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
            )
        },
        {
            title: "قضايا الأحوال الشخصية والشرعية",
            description: "الأحوال الشخصية: زواج، طلاق، حضانة، نفقات، وصلح أسري.",
            path: "/sharia",
            delay: "animation-delay-200",
            iconColor: "text-emerald-400",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            title: "قضايا المواريث والتركات",
            description: "محرك حساب دقيق للأنصبة الشرعية والقانونية وتوزيع التركات.",
            path: "/inheritance",
            delay: "animation-delay-300",
            iconColor: "text-amber-400",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            title: "سجل القضايا",
            description: "الأرشيف الكامل لجميع القضايا والاستشارات السابقة المحفوظة.",
            path: "/cases",
            delay: "animation-delay-400",
            iconColor: "text-indigo-400",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            title: "تحليل المستندات",
            description: "استخراج النصوص من الصور والملفات (OCR) وتدقيقها آلياً.",
            path: "/ocr",
            delay: "animation-delay-500",
            iconColor: "text-pink-400",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            title: "الأدوات القانونية",
            description: "حاسبة الرسوم، حساب المهل القانونية (استئناف/نقض).",
            path: "/tools",
            delay: "animation-delay-600",
            iconColor: "text-cyan-400",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        }
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-full py-8 px-4 relative">
            
            {/* Header / Welcome */}
            <div className="text-center mb-12 animate-fade-in w-full max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold text-amber-400 mb-4 tracking-wide drop-shadow-lg" style={{fontFamily: 'sans-serif'}}>
                    المستشار القانوني الفلسطيني
                </h1>
                <p className="text-lg md:text-xl text-blue-200/80 font-light">
                    منظومة قانونية ذكية متكاملة
                </p>
            </div>

            {/* Flexible Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10 w-full max-w-6xl place-items-center">
                {navItems.map((item, index) => (
                    <NavCircle 
                        key={index}
                        {...item}
                    />
                ))}
            </div>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.8s ease-out; }
                .animate-fade-in-up { animation: fadeInUp 0.6s ease-out backwards; }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); scale: 0.95; }
                    to { opacity: 1; transform: translateY(0); scale: 1; }
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
