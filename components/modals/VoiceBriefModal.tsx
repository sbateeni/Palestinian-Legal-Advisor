
import React, { useState, useEffect } from 'react';

interface VoiceBriefModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (transcript: string) => void;
}

const VoiceBriefModal: React.FC<VoiceBriefModalProps> = ({ isOpen, onClose, onComplete }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        if (isOpen && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recog = new SpeechRecognition();
            recog.continuous = true;
            recog.interimResults = true;
            recog.lang = 'ar-PS'; // Palestinian/Arabic dialect support

            recog.onresult = (event: any) => {
                // Optimized approach to prevent duplication:
                // Map over the results and join them directly.
                const currentTranscript = Array.from(event.results)
                    .map((result: any) => result[0].transcript)
                    .join('');
                
                setTranscript(currentTranscript);
            };

            recog.onend = () => setIsListening(false);
            setRecognition(recog);
        }
    }, [isOpen]);

    const toggleRecording = () => {
        if (!recognition) return;
        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            setTranscript(''); 
            recognition.start();
            setIsListening(true);
        }
    };

    const handleFinish = () => {
        if (recognition) recognition.stop();
        onComplete(transcript);
        setTranscript('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-700 p-8 text-center relative overflow-hidden">
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <h2 className="text-2xl font-bold text-gray-100 mb-2">اسرد قصتك (Voice-to-Brief)</h2>
                <p className="text-gray-400 mb-8 text-sm">تحدث براحتك عن تفاصيل المشكلة، وسأقوم بصياغتها قانونياً كلائحة دعوى.</p>

                {/* Mic Visualizer (Simple CSS Animation) */}
                <div className="relative mx-auto w-32 h-32 mb-8 flex items-center justify-center">
                    {isListening && (
                        <>
                            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
                            <div className="absolute inset-2 bg-red-500/40 rounded-full animate-pulse"></div>
                        </>
                    )}
                    <button 
                        onClick={toggleRecording}
                        className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border-4 ${isListening ? 'bg-red-600 border-red-400 scale-110' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </button>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-3 min-h-[80px] mb-6 text-right text-gray-300 text-sm max-h-40 overflow-y-auto border border-gray-700">
                    {transcript || "النص المسجل سيظهر هنا..."}
                </div>

                <button 
                    onClick={handleFinish}
                    disabled={!transcript.trim()}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                    إنشاء لائحة الدعوى
                </button>
            </div>
        </div>
    );
};

export default VoiceBriefModal;
