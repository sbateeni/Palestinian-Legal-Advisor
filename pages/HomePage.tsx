
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NavCircleProps {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    path: string;
    delay: string;
}

const NavCircle: React.FC<NavCircleProps> = ({ title, subtitle, icon, color, path, delay }) => {
    const navigate = useNavigate();

    return (
        <div 
            onClick={() => navigate(path)}
            className={`group relative flex flex-col items-center justify-center w-64 h-64 rounded-full cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-fade-in-up ${delay} bg-gray-800/40 backdrop-blur-sm border border-gray-700 hover:border-opacity-0 overflow-hidden`}
        >
            {/* Background Gradient Glow on Hover */}
            <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-tr ${color}`}></div>
            
            {/* Animated Border Ring */}
            <div className={`absolute inset-0 rounded-full border-2 border-transparent group-hover:border-t-white/50 group-hover:rotate-180 transition-all duration-1000 ease-in-out`}></div>

            {/* Icon Container */}
            <div className={`mb-4 p-4 rounded-full bg-gray-900/80 text-white shadow-lg group-hover:-translate-y-2 transition-transform duration-300 z-10 ${color.replace('from-', 'text-').split(' ')[0].replace('text-', 'text-')}`}>
                {icon}
            </div>

            {/* Text Content */}
            <h3 className="text-xl font-bold text-gray-100 text-center mb-1 group-hover:text-white transition-colors px-4 z-10 relative">
                {title}
            </h3>
            <p className="text-xs text-gray-300 text-center max-w-[85%] opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 z-10 relative font-medium">
                {subtitle}
            </p>
        </div>
    );
};

const HomePage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-full py-10 px-4 relative overflow-y-auto">
            {/* Background Decor */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

            {/* Header Section */}
            <div className="text-center mb-10 max-w-3xl animate-fade-in pt-8">
                <div className="inline-block mb-4 p-3 bg-gray-800/50 rounded-full border border-gray-700 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-12 w-12 text-amber-500 mx-auto">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
                    </svg>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 mb-4 drop-shadow-sm">
                    المستشار القانوني الفلسطيني
                </h1>
                <p className="text-lg text-gray-400 leading-relaxed">
                    منظومة قانونية ذكية متكاملة
                </p>
            </div>

            {/* Circles Grid - 3 Columns Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-12 justify-items-center relative z-10 pb-12">
                
                {/* 1. Civil & Penal */}
                <NavCircle 
                    title="قضية مدنية / جزائية"
                    subtitle="تحليل القضايا، صيد الثغرات، صياغة اللوائح، وبناء الاستراتيجيات."
                    path="/civil"
                    color="from-blue-600 to-indigo-600"
                    delay="animation-delay-100"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                    }
                />

                {/* 2. Sharia & Family */}
                <NavCircle 
                    title="المستشار الشرعي"
                    subtitle="الأحوال الشخصية: زواج، طلاق، حضانة، نفقات، وصلح أسري."
                    path="/sharia"
                    color="from-emerald-500 to-teal-700"
                    delay="animation-delay-200"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    }
                />

                {/* 3. Inheritance */}
                <NavCircle 
                    title="المواريث والتركات"
                    subtitle="محرك حساب دقيق للأنصبة الشرعية والقانونية وتوزيع التركات."
                    path="/inheritance"
                    color="from-amber-500 to-orange-600"
                    delay="animation-delay-300"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    }
                />

                {/* 4. Cases Archive */}
                <NavCircle 
                    title="سجل القضايا"
                    subtitle="الأرشيف الكامل لجميع القضايا والاستشارات السابقة المحفوظة."
                    path="/cases"
                    color="from-gray-600 to-slate-700"
                    delay="animation-delay-400"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                    }
                />

                {/* 5. Document Analysis */}
                <NavCircle 
                    title="تحليل المستندات"
                    subtitle="استخراج النصوص من الصور والملفات (OCR) وتدقيقها آلياً."
                    path="/ocr"
                    color="from-purple-600 to-fuchsia-700"
                    delay="animation-delay-500"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    }
                />

                {/* 6. Legal Tools */}
                <NavCircle 
                    title="الأدوات القانونية"
                    subtitle="حاسبة الرسوم، حساب المهل القانونية (استئناف/نقض)."
                    path="/tools"
                    color="from-cyan-600 to-blue-500"
                    delay="animation-delay-600"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    }
                />

            </div>
            
            <div className="mt-8 text-gray-600 text-sm pb-4">
                © {new Date().getFullYear()} جميع الحقوق محفوظة
            </div>

            <style>{`
                .animate-fade-in { animation: fadeIn 1s ease-out; }
                .animate-fade-in-up { animation: fadeInUp 0.8s ease-out backwards; }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .animation-delay-100 { animation-delay: 0.1s; }
                .animation-delay-200 { animation-delay: 0.2s; }
                .animation-delay-300 { animation-delay: 0.3s; }
                .animation-delay-400 { animation-delay: 0.4s; }
                .animation-delay-500 { animation-delay: 0.5s; }
                .animation-delay-600 { animation-delay: 0.6s; }
            `}</style>
        </div>
    );
};

export default HomePage;
