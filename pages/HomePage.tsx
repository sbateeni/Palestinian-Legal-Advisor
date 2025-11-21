
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
            className={`group relative flex flex-col items-center justify-center w-64 h-64 rounded-full cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-fade-in-up ${delay} bg-gray-800/40 backdrop-blur-sm border border-gray-700 hover:border-opacity-0`}
        >
            {/* Background Gradient Glow on Hover */}
            <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-tr ${color}`}></div>
            
            {/* Animated Border Ring */}
            <div className={`absolute inset-0 rounded-full border-2 border-transparent group-hover:border-t-white/50 group-hover:rotate-180 transition-all duration-1000 ease-in-out`}></div>

            {/* Icon Container */}
            <div className={`mb-4 p-4 rounded-full bg-gray-900/80 text-white shadow-lg group-hover:-translate-y-2 transition-transform duration-300 ${color.replace('from-', 'text-').split(' ')[0].replace('text-', 'text-')}`}>
                {icon}
            </div>

            {/* Text Content */}
            <h3 className="text-xl font-bold text-gray-100 text-center mb-1 group-hover:text-white transition-colors px-4">
                {title}
            </h3>
            <p className="text-xs text-gray-400 text-center max-w-[80%] opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                {subtitle}
            </p>
        </div>
    );
};

const HomePage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-full py-10 px-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl -z-10"></div>

            {/* Header Section */}
            <div className="text-center mb-12 max-w-3xl animate-fade-in">
                <div className="inline-block mb-4 p-3 bg-gray-800/50 rounded-full border border-gray-700 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10 text-amber-500 mx-auto">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
                    </svg>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 mb-4">
                    المستشار القانوني الفلسطيني
                </h1>
                <p className="text-lg text-gray-400 leading-relaxed">
                    منصة قانونية ذكية تعتمد على الذكاء الاصطناعي لتحليل القضايا المدنية، الشرعية، والمواريث وفق القوانين الفلسطينية السارية في الضفة الغربية وقطاع غزة.
                </p>
            </div>

            {/* Circles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 justify-items-center relative z-10">
                
                {/* 1. Civil & Penal */}
                <NavCircle 
                    title="القضايا المدنية والجزائية"
                    subtitle="تحليل شامل، صيد الثغرات، وصياغة اللوائح وفق القانون المدني والعقوبات."
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
                    title="الأحوال الشخصية والشرعية"
                    subtitle="الزواج، الطلاق، الحضانة، النفقات، والصلح الأسري."
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
                    subtitle="حساب دقيق للأنصبة الشرعية والقانونية وتوزيع التركات."
                    path="/inheritance"
                    color="from-amber-500 to-orange-600"
                    delay="animation-delay-300"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    }
                />

                {/* 4. Analysis & Tools */}
                <NavCircle 
                    title="تحليل المستندات والأدوات"
                    subtitle="استخراج النصوص (OCR)، حاسبة الرسوم، وتحليل الوثائق."
                    path="/ocr"
                    color="from-purple-600 to-pink-600"
                    delay="animation-delay-400"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    }
                />

            </div>
            
            <div className="mt-16 text-gray-600 text-sm">
                © {new Date().getFullYear()} جميع الحقوق محفوظة - المستشار القانوني الفلسطيني
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
            `}</style>
        </div>
    );
};

export default HomePage;
