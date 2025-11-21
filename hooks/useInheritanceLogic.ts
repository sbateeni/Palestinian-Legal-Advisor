
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
    sisterFull: 0
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
                currency: extractedData.currency || prev.currency
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
                type: 'الزوج', count: 1,
                shareFraction: (share === 6 ? '1/4' : '1/2'),
                sharePercentage: (share/24)*100,
                amount: 0 // Calc later
            });
            usedShares += share;
        } else if (inp.wife > 0) {
            const share = (inp.son > 0 || inp.daughter > 0) ? 3 : 6; // 1/8 or 1/4 (of 24)
            heirs.push({
                type: 'الزوجة', count: inp.wife,
                shareFraction: (share === 3 ? '1/8' : '1/4'),
                sharePercentage: (share/24)*100,
                amount: 0
            });
            usedShares += share;
        }

        // 2. Parents
        if (inp.father > 0) {
            // Father takes 1/6 if children exist.
            // If only daughters, he takes 1/6 + Residue.
            // If no children, he takes Residue (Asabah).
            // For simplicity in this tool, we assign 1/6 first if kids exist.
            if (inp.son > 0 || inp.daughter > 0) {
                heirs.push({ type: 'الأب', count: 1, shareFraction: '1/6', sharePercentage: (4/24)*100, amount: 0 });
                usedShares += 4;
            } else {
                // Takes residue later
            }
        }
        
        if (inp.mother > 0) {
            // Mother takes 1/6 if children OR >1 siblings exist
            const siblingsCount = inp.brotherFull + inp.sisterFull;
            const hasKids = inp.son > 0 || inp.daughter > 0;
            
            const share = (hasKids || siblingsCount > 1) ? 4 : 8; // 1/6 or 1/3
            heirs.push({
                type: 'الأم', count: 1,
                shareFraction: (share === 4 ? '1/6' : '1/3'),
                sharePercentage: (share/24)*100,
                amount: 0
            });
            usedShares += share;
        }

        // 3. Residue (Children & Father if no kids)
        const remainingShares = Math.max(0, totalShares - usedShares);
        
        // Father Residue (No kids)
        if (inp.father > 0 && inp.son === 0 && inp.daughter === 0) {
             heirs.push({ type: 'الأب (عصبة)', count: 1, shareFraction: 'الباقي', sharePercentage: (remainingShares/24)*100, amount: 0 });
        }
        // Children Residue
        else if (inp.son > 0 || inp.daughter > 0) {
            // Rule: Male = 2 * Female
            const totalUnits = (inp.son * 2) + inp.daughter;
            const unitValue = remainingShares / totalUnits; // Share units out of 24
            
            if (inp.son > 0) {
                heirs.push({ 
                    type: 'الابن', count: inp.son, 
                    shareFraction: `لذكر مثل حظ الأنثيين`, 
                    sharePercentage: ((unitValue * 2 * inp.son) / 24) * 100, 
                    amount: 0 
                });
            }
            if (inp.daughter > 0) {
                 heirs.push({ 
                    type: 'البنت', count: inp.daughter, 
                    shareFraction: `لذكر مثل حظ الأنثيين`, 
                    sharePercentage: ((unitValue * inp.daughter) / 24) * 100, 
                    amount: 0 
                });
            }
        }
        // Siblings (If no father and no sons)
        else if (inp.father === 0 && inp.son === 0) {
             // Complex logic for Kalala, simplifying for tool: Equal split for now or standard 2:1
             // This tool focuses on First Degree primarily.
             if (inp.brotherFull > 0 || inp.sisterFull > 0) {
                 heirs.push({ type: 'الإخوة', count: inp.brotherFull + inp.sisterFull, shareFraction: 'الباقي', sharePercentage: (remainingShares/24)*100, amount: 0, notes: 'مسألة كلالة (تقديري)' });
             }
        }

        // Calculate Values
        let totalCalcPercent = 0;
        heirs.forEach(h => {
            h.amount = (h.sharePercentage / 100) * estate;
            totalCalcPercent += h.sharePercentage;
        });

        return {
            totalValue: estate,
            heirs: heirs,
            isAwl: totalCalcPercent > 100 // Crude detection of Awl
        };
    };

    // --- Christian Math Engine (Civil/Equal Model) ---
    const calculateChristian = (inp: InheritanceInput): InheritanceResult => {
         const heirs: HeirResult[] = [];
         const estate = inp.estateValue;
         let remainder = estate;

         // 1. Spouse (Civil/Generic Christian approach often 1/2 if no kids, or 1/4, or equal share)
         // Applying a common model in Palestine for Christians: Spouse gets specific share (e.g., 1/4), rest to children equally.
         if (inp.husband > 0 || inp.wife > 0) {
             const count = inp.husband + inp.wife;
             const type = inp.husband > 0 ? 'الزوج' : 'الزوجة';
             // Assumption: Spouse takes 1/4
             const amount = estate * 0.25;
             heirs.push({ type, count, shareFraction: '1/4', sharePercentage: 25, amount });
             remainder -= amount;
         }

         // 2. Children (Equal distribution)
         const childrenCount = inp.son + inp.daughter;
         if (childrenCount > 0) {
             const amountPerChild = remainder / childrenCount;
             const percentPerChild = (amountPerChild / estate) * 100;
             
             if (inp.son > 0) heirs.push({ type: 'الابن', count: inp.son, shareFraction: 'بالتساوي', sharePercentage: percentPerChild * inp.son, amount: amountPerChild * inp.son });
             if (inp.daughter > 0) heirs.push({ type: 'البنت', count: inp.daughter, shareFraction: 'بالتساوي', sharePercentage: percentPerChild * inp.daughter, amount: amountPerChild * inp.daughter });
         } else {
             // Parents take if no children
             const parentsCount = inp.father + inp.mother;
             if (parentsCount > 0) {
                  const amountPerParent = remainder / parentsCount;
                  if (inp.father > 0) heirs.push({ type: 'الأب', count: 1, shareFraction: 'الباقي بالتساوي', sharePercentage: (amountPerParent/estate)*100, amount: amountPerParent });
                  if (inp.mother > 0) heirs.push({ type: 'الأم', count: 1, shareFraction: 'الباقي بالتساوي', sharePercentage: (amountPerParent/estate)*100, amount: amountPerParent });
             }
         }

         return {
             totalValue: estate,
             heirs
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
