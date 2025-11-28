
import { useChatLogic } from './useChatLogic';
import { ActionMode } from '../types';

export const useForgeryLogic = (caseId?: string) => {
    // Reuse the powerful chat logic but initialize for 'forgery' case type
    const logic = useChatLogic(caseId, 'forgery');

    // Default mode for forgery page
    if (logic.actionMode === 'analysis') {
        logic.setActionMode('pixel_analysis');
    }

    return logic;
};
