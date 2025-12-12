
import React, { useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import VoiceBriefModal from '../components/modals/VoiceBriefModal';
import { useChatLogic } from '../hooks/useChatLogic';

const { useNavigate } = ReactRouterDOM;

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
            className={`group relative flex flex-col items-center justify-center w-full max-w-[240px] aspect-square rounded-full cursor-pointer transition-all duration-500 animate-fade-in-up ${delay} bg-white border border-gray-200 shadow-xl hover:shadow-2xl hover:-translate-y-2 overflow-hidden hover:border-blue-300`}
            style={{ touchAction: 'manipulation' }}
        >
            {/* Background Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full w-full px-6 py-4 text-center">
                
                {/* Icon */}
                <div className={`mb-3 transition-transform duration-300 group-hover:scale-110 ${iconColor}`}>
                    {icon}
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 leading-tight group-hover:text-blue-700 transition-colors duration-300">
                    {title}
                </h3>

                {/* Description */}
                <p className="text-[11px] sm:text-xs text-gray-500 font-medium leading-relaxed line-clamp-3 px-1 group-hover:text-gray-700 transition-colors duration-300 opacity-90">
                    {description}
                </p>
            </div>
        </div>
    );
};

const FeatureCard: React.FC<{ title: string; desc: string; icon: React.ReactNode; delay: string }> = ({ title, desc, icon, delay }) => (
    <div className={`flex flex-col items-start p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 animate-fade-in-up ${delay}`}>
        <div className="p-3 bg-blue-50 rounded-lg mb-4 text-blue-600 shadow-sm border border-blue-100 group-hover:scale-105 transition-transform">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
    </div>
);

const HomePage: React.FC = () => {
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
    const navigate = useNavigate();

    const handleVoiceComplete = (transcript: string) => {
        localStorage.setItem('voice_draft_content', transcript);
        navigate('/civil?mode=drafting&autoSend=true');
    };

    const navItems: NavItemProps[] = [
        {
            title: "القضايا المدنية والجزائية",
            description: "المستشار العام: تحليل القضايا، صيد الثغرات، صياغة اللوائح، وبناء الاستراتيجيات.",
            path: "/civil",
            delay: "animation-delay-100",
            iconColor: "text-blue-600",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
            )
        },
        {
            title: "قضايا الأحوال الشخصية",
            description: "القضاء الشرعي: زواج، طلاق، حضانة، نفقات، ومنازعات الشقاق والنزاع.",
            path: "/sharia",
            delay: "animation-delay-200",
            iconColor: "text-emerald-600",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            title: "حاسبة المواريث الذكية",
            description: "محرك حساب دقيق للأنصبة الشرعية والقانونية وتوزيع التركات بالأسهم.",
            path: "/inheritance",
            delay: "animation-delay-300",
            iconColor: "text-amber-500",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            title: "سجل القضايا المحفوظة",
            description: "الأرشيف الكامل لجميع القضايا والاستشارات السابقة (يعمل دون إنترنت).",
            path: "/cases",
            delay: "animation-delay-400",
            iconColor: "text-indigo-600",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            title: "المختبر الجنائي الرقمي",
            description: "الكشف عن التزوير، مطابقة الصور، وتحليل التلاعب الرقمي (Forensics).",
            path: "/forgery",
            delay: "animation-delay-500",
            iconColor: "text-red-600",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            )
        },
        {
            title: "الأدوات القانونية",
            description: "حاسبة الرسوم القضائية، وحساب المهل القانونية (استئناف/نقض).",
            path: "/tools",
            delay: "animation-delay-600",
            iconColor: "text-cyan-600",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        }
    ];

    return (
        <div className="flex flex-col items-center min-h-full py-10 px-4 relative overflow-x-hidden w-full bg-gray-50">
            
            {/* --- HERO SECTION --- */}
            <div className="text-center mb-16 animate-fade-in w-full max-w-4xl mx-auto relative">
                <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold tracking-wider uppercase">
                    الذكاء الاصطناعي في خدمة العدالة
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight drop-shadow-sm pb-1">
                    المستشار القانوني الفلسطيني
                </h1>
                <p className="text-lg md:text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed mb-8">
                    منظومة قانونية ذكية متكاملة، صُممت خصيصاً لتلبية احتياجات المحامي والمواطن الفلسطيني وفق أحدث التشريعات (المقتفي، الجريدة الرسمية).
                </p>

                {/* VOICE TO BRIEF BUTTON */}
                <button 
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white transition-all duration-200 bg-red-600 font-lg rounded-full hover:bg-red-700 hover:shadow-lg hover:shadow-red-900/20 hover:-translate-y-1 focus:outline-none ring-offset-2 focus:ring-2 ring-red-500"
                >
                    <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-white rounded-full group-hover:w-56 group-hover:h-56 opacity-10"></span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 me-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    <span className="relative">اسرد قصتك (صوتياً)</span>
                </button>
            </div>

            {/* --- NAVIGATION GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 w-full max-w-6xl place-items-center mb-24">
                {navItems.map((item, index) => (
                    <NavCircle 
                        key={index}
                        {...item}
                    />
                ))}
            </div>

            {/* --- FEATURES / INFO SECTION --- */}
            <div className="w-full max-w-6xl border-t border-gray-200 pt-16 pb-8">
                <div className="text-center mb-12">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">لماذا تختار هذه المنظومة؟</h2>
                    <div className="h-1 w-20 bg-blue-500 mx-auto rounded-full"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FeatureCard 
                        title="اختصاص مكاني دقيق"
                        desc="تمييز كامل بين القوانين السارية في الضفة الغربية (القانون الأردني) وقطاع غزة (القانون المصري)، مع مراعاة القرارات بقانون الحديثة."
                        delay="animation-delay-100"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        }
                    />
                    <FeatureCard 
                        title="قدرات تحليل فائقة"
                        desc="مدعوم بأحدث نماذج Gemini AI لتحليل الملفات المعقدة، قراءة المستندات (OCR)، وحساب المواريث بدقة متناهية."
                        delay="animation-delay-200"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        }
                    />
                    <FeatureCard 
                        title="خصوصية وأمان"
                        desc="يتم تخزين كافة سجلات القضايا والمحادثات محلياً في جهازك (IndexedDB)، مما يضمن سرية تامة لبيانات الموكلين."
                        delay="animation-delay-300"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        }
                    />
                </div>
            </div>

            {/* --- FOOTER --- */}
            <footer className="mt-auto text-center text-gray-500 text-sm py-6 w-full border-t border-gray-200">
                <p>© {new Date().getFullYear()} المستشار القانوني الفلسطيني. جميع الحقوق محفوظة.</p>
                <p className="text-xs mt-1 opacity-60">نسخة محسنة (v2.0)</p>
            </footer>

            <VoiceBriefModal 
                isOpen={isVoiceModalOpen} 
                onClose={() => setIsVoiceModalOpen(false)} 
                onComplete={handleVoiceComplete}
            />

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
