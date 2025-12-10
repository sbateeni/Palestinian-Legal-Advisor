
import React from 'react';
import { TimelineEvent } from '../../types';

interface TimelineViewProps {
    events: TimelineEvent[];
    onClose: () => void;
    isLoading: boolean;
}

const TimelineView: React.FC<TimelineViewProps> = ({ events, onClose, isLoading }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-800 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-700">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                    <h3 className="text-xl font-bold text-gray-100 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 me-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        المخطط الزمني للقضية
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-6 md:p-8 bg-gray-900/30 relative">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p>جاري تحليل الوقائع واستخراج التسلسل الزمني...</p>
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center text-gray-500 mt-20">لا توجد أحداث كافية لإنشاء مخطط زمني.</div>
                    ) : (
                        <div className="relative border-r-2 border-gray-700 ms-3 md:ms-6">
                            {events.map((event, idx) => {
                                let iconColor = 'bg-blue-600';
                                let borderColor = 'border-blue-500/30';
                                if (event.type === 'legal') { iconColor = 'bg-red-600'; borderColor = 'border-red-500/30'; }
                                if (event.type === 'procedure') { iconColor = 'bg-amber-600'; borderColor = 'border-amber-500/30'; }

                                return (
                                    <div key={idx} className="mb-8 ms-6 relative group">
                                        {/* Dot */}
                                        <div className={`absolute -right-[31px] md:-right-[33px] w-4 h-4 rounded-full border-2 border-gray-800 ${iconColor} z-10 transition-transform group-hover:scale-125`}></div>
                                        
                                        {/* Content Card */}
                                        <div className={`bg-gray-800 p-4 rounded-lg border ${borderColor} shadow-lg hover:bg-gray-750 transition-colors`}>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded w-fit mb-2 sm:mb-0 ${iconColor} text-white`}>
                                                    {event.date}
                                                </span>
                                                <span className="text-xs text-gray-500 uppercase tracking-wider">{event.type}</span>
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-200 mb-1">{event.title}</h4>
                                            <p className="text-sm text-gray-400 leading-relaxed">{event.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimelineView;
