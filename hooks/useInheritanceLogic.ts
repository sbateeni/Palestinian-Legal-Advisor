
import { useState, useEffect } from 'react';
import { Case, InheritanceInput, InheritanceResult, HeirResult, ApiSource } from '../types';
import * as dbService from '../services/dbService';
import { extractInheritanceFromCase } from '../pages/geminiService';
import { extractInheritanceFromCaseWithOpenRouter } from '../services/openRouterService';

const DEFAULT_INPUT: InheritanceInput = {
    religion: 'muslim',
    estateValue: 0,
    currency: 'JOD',
    husband: 0,
    wife: 0,
    son: 0,
    daughter: 0,
    father: 0,
    mother: 0,
    brotherFull: 0,
    sisterFull: 0,
    husbandName: '',
    wifeName: '',
    sonNames: '',
    daughterNames: '',
    fatherName: '',
    motherName: '',
    context: {
        notes: '',
        disputes: '',
        conclusion: ''
    }
};

export const useInheritanceLogic = () => {
    const [cases, setCases] = useState<Case[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string>('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [inputs, setInputs] = useState<InheritanceInput>(DEFAULT_INPUT);
    const [results, setResults] = useState<InheritanceResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        dbService.getAllCases().then(setCases);
    }, []);

    const handleInputChange = (field: keyof InheritanceInput, value: any) => {
        setInputs(prev => ({ ...prev, [field]: value }));
    };

    const handleExtractFromCase = async () => {
        if (!selectedCaseId) return;
        
        const caseData = cases.find(c => c.id === selectedCaseId);
        if (!caseData) return;

        setIsExtracting(true);
        setError(null);

        try {
            // Construct full text from summary + history
            const fullText = `${caseData.summary}\n${caseData.chatHistory.map(m => m.content).join('\n')}`;
            
            const apiSource = await dbService.getSetting<ApiSource>('apiSource') || 'gemini';
            let extractedData: Partial<InheritanceInput>;

            if (apiSource === 'gemini') {
                extractedData = await extractInheritanceFromCase(fullText);
            } else {
                const apiKey = await dbService.getSetting<string>('openRouterApiKey');
                const model = await dbService.getSetting<string>('openRouterModel');
                if (!apiKey) throw new Error("مفتاح OpenRouter غير موجود");
                extractedData = await extractInheritanceFromCaseWithOpenRouter(apiKey, model || 'google/gemini-flash-1.5', fullText);
            }

            setInputs(prev => ({
                ...prev,
                ...extractedData,
                // Ensure defaults if missing
                estateValue: extractedData.estateValue || prev.estateValue,
                currency: extractedData.currency || prev.currency,
                // Keep context if extracted, else use default
                context: extractedData.context || prev.context
            }));
        } catch (err) {
            console.error(err);
            setError("فشل في استخلاص البيانات تلقائياً. يرجى الإدخال اليدوي.");
        } finally {
            setIsExtracting(false);
        }
    };

    // --- Islamic Math Engine (Simplified for Standard Cases) ---
    const calculateIslamic = (inp: InheritanceInput): InheritanceResult => {
        const heirs: HeirResult[] = [];
        let totalShares = 24; // Common denominator used in Fara'id
        let usedShares = 0;
        const estate = inp.estateValue;

        // 1. Spouses
        if (inp.husband > 0) {
            const share = (inp.son > 0 || inp.daughter > 0) ? 6 : 12; // 1/4 or 1/2 (of 24)
            heirs.push({
                type: 'الزوج', 
                name: inp.husbandName,
                count: 1,
                shareFraction: (share === 6 ? '1/4' : '1/2'),
                sharePercentage: (share/24)*100,
                amount: 0 // Calc later
            });
            usedShares += share;
        } else if (inp.wife > 0) {
            const share = (inp.son > 0 || inp.daughter > 0) ? 3 : 6; // 1/8 or 1/4 (of 24)
            heirs.push({
                type: 'الزوجة', 
                name: inp.wifeName,
                count: inp.wife,
                shareFraction: (share === 3 ? '1/8' : '1/4'),
                sharePercentage: (share/24)*100,
                amount: 0
            });
            usedShares += share;
        }

        // 2. Parents
        if (inp.father > 0) {
            if (inp.son > 0 || inp.daughter > 0) {
                heirs.push({ 
                    type: 'الأب', 
                    name: inp.fatherName,
                    count: 1, 
                    shareFraction: '1/6', 
                    sharePercentage: (4/24)*100, 
                    amount: 0 
                });
                usedShares += 4;
            }
        }
        
        if (inp.mother > 0) {
            const siblingsCount = inp.brotherFull + inp.sisterFull;
            const hasKids = inp.son > 0 || inp.daughter > 0;
            
            const share = (hasKids || siblingsCount > 1) ? 4 : 8; // 1/6 or 1/3
            heirs.push({
                type: 'الأم', 
                name: inp.motherName,
                count: 1,
                shareFraction: (share === 4 ? '1/6' : '1/3'),
                sharePercentage: (share/24)*100,
                amount: 0
            });
            usedShares += share;
        }

        // 3. Residue (Children & Father if no kids)
        const remainingShares = Math.max(0, totalShares - usedShares);
        
        if (inp.father > 0 && inp.son === 0 && inp.daughter === 0) {
             heirs.push({ 
                 type: 'الأب (عصبة)', 
                 name: inp.fatherName,
                 count: 1, 
                 shareFraction: 'الباقي', 
                 sharePercentage: (remainingShares/24)*100, 
                 amount: 0 
            });
        }
        else if (inp.son > 0 || inp.daughter > 0) {
            const totalUnits = (inp.son * 2) + inp.daughter;
            const unitValue = remainingShares / totalUnits; 
            
            if (inp.son > 0) {
                heirs.push({ 
                    type: 'الابن', 
                    name: inp.sonNames,
                    count: inp.son, 
                    shareFraction: `لذكر مثل حظ الأنثيين`, 
                    sharePercentage: ((unitValue * 2 * inp.son) / 24) * 100, 
                    amount: 0 
                });
            }
            if (inp.daughter > 0) {
                 heirs.push({ 
                    type: 'البنت', 
                    name: inp.daughterNames,
                    count: inp.daughter, 
                    shareFraction: `لذكر مثل حظ الأنثيين`, 
                    sharePercentage: ((unitValue * inp.daughter) / 24) * 100, 
                    amount: 0 
                });
            }
        }
        else if (inp.father === 0 && inp.son === 0) {
             if (inp.brotherFull > 0 || inp.sisterFull > 0) {
                 heirs.push({ 
                     type: 'الإخوة', 
                     count: inp.brotherFull + inp.sisterFull, 
                     shareFraction: 'الباقي', 
                     sharePercentage: (remainingShares/24)*100, 
                     amount: 0, 
                     notes: 'مسألة كلالة (تقديري)' 
                });
             }
        }

        let totalCalcPercent = 0;
        heirs.forEach(h => {
            h.amount = (h.sharePercentage / 100) * estate;
            totalCalcPercent += h.sharePercentage;
        });

        return {
            totalValue: estate,
            heirs: heirs,
            isAwl: totalCalcPercent > 100,
            context: inp.context // Pass context through
        };
    };

    // --- Christian Math Engine ---
    const calculateChristian = (inp: InheritanceInput): InheritanceResult => {
         const heirs: HeirResult[] = [];
         const estate = inp.estateValue;
         let remainder = estate;

         if (inp.husband > 0 || inp.wife > 0) {
             const count = inp.husband + inp.wife;
             const type = inp.husband > 0 ? 'الزوج' : 'الزوجة';
             const name = inp.husband > 0 ? inp.husbandName : inp.wifeName;
             const amount = estate * 0.25;
             heirs.push({ type, name, count, shareFraction: '1/4', sharePercentage: 25, amount });
             remainder -= amount;
         }

         const childrenCount = inp.son + inp.daughter;
         if (childrenCount > 0) {
             const amountPerChild = remainder / childrenCount;
             const percentPerChild = (amountPerChild / estate) * 100;
             
             if (inp.son > 0) heirs.push({ type: 'الابن', name: inp.sonNames, count: inp.son, shareFraction: 'بالتساوي', sharePercentage: percentPerChild * inp.son, amount: amountPerChild * inp.son });
             if (inp.daughter > 0) heirs.push({ type: 'البنت', name: inp.daughterNames, count: inp.daughter, shareFraction: 'بالتساوي', sharePercentage: percentPerChild * inp.daughter, amount: amountPerChild * inp.daughter });
         } else {
             const parentsCount = inp.father + inp.mother;
             if (parentsCount > 0) {
                  const amountPerParent = remainder / parentsCount;
                  if (inp.father > 0) heirs.push({ type: 'الأب', name: inp.fatherName, count: 1, shareFraction: 'الباقي بالتساوي', sharePercentage: (amountPerParent/estate)*100, amount: amountPerParent });
                  if (inp.mother > 0) heirs.push({ type: 'الأم', name: inp.motherName, count: 1, shareFraction: 'الباقي بالتساوي', sharePercentage: (amountPerParent/estate)*100, amount: amountPerParent });
             }
         }

         return {
             totalValue: estate,
             heirs,
             context: inp.context
         };
    };

    const calculate = () => {
        try {
            setError(null);
            if (inputs.religion === 'muslim') {
                setResults(calculateIslamic(inputs));
            } else {
                setResults(calculateChristian(inputs));
            }
        } catch (e) {
            setError("حدث خطأ في الحساب.");
        }
    };

    return {
        cases,
        selectedCaseId, setSelectedCaseId,
        inputs, handleInputChange,
        handleExtractFromCase,
        isExtracting,
        calculate,
        results,
        error
    };
};
