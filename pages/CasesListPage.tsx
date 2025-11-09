
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useLocalStorage from '../hooks/useLocalStorage';
import { Case } from '../types';
import { LOCAL_STORAGE_CASES_KEY } from '../constants';

const CasesListPage: React.FC = () => {
  const [cases, setCases] = useLocalStorage<Case[]>(LOCAL_STORAGE_CASES_KEY, []);
  const [sortedCases, setSortedCases] = useState<Case[]>([]);
  const navigate = useNavigate();

  // Ensure cases are sorted whenever they change
  useEffect(() => {
    const sorted = [...cases].sort((a, b) => b.createdAt - a.createdAt);
    setSortedCases(sorted);
  }, [cases]);

  const deleteCase = (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذه القضية؟ لا يمكن التراجع عن هذا الإجراء.")) {
        setCases(cases.filter(c => c.id !== id));
    }
  }

  return (
    <div className="w-full container mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-100 border-b border-gray-700 pb-3">القضايا المحفوظة</h1>
      {sortedCases.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">لم يتم حفظ أي قضايا بعد.</p>
          <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            ابدأ قضية جديدة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCases.map((caseItem) => (
            <div key={caseItem.id} className="bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col justify-between hover:shadow-blue-500/20 transition-shadow duration-300">
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-2 truncate">{caseItem.title}</h2>
                <p className="text-gray-400 mb-4 text-sm break-words line-clamp-3">{caseItem.summary}</p>
                <p className="text-xs text-gray-500 mb-4">
                  تاريخ الإنشاء: {new Date(caseItem.createdAt).toLocaleString('ar-EG')}
                </p>
              </div>
              <div className="flex justify-between items-center mt-2">
                 <button
                    onClick={() => navigate(`/case/${caseItem.id}`)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors"
                >
                    فتح
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); deleteCase(caseItem.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-full transition-colors"
                    aria-label="حذف القضية"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CasesListPage;
