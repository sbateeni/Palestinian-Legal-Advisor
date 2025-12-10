
// A simple Diff algorithm implementation to avoid external dependencies
// Returns an array of parts: { value: string, added?: boolean, removed?: boolean }

export interface DiffPart {
    value: string;
    added?: boolean;
    removed?: boolean;
}

export const computeDiff = (oldText: string, newText: string): DiffPart[] => {
    // 1. Split texts into words to compare
    const oldWords = oldText.split(/(\s+)/); // Keep delimiters (spaces)
    const newWords = newText.split(/(\s+)/);

    const diff: DiffPart[] = [];
    let i = 0;
    let j = 0;

    // A very basic LCS (Longest Common Subsequence) like approach for words
    // NOTE: This is a simplified O(N*M) approach, suitable for paragraphs, might be slow for massive docs.
    // For a React app without 'diff' package, this is a workable tradeoff.

    while (i < oldWords.length && j < newWords.length) {
        if (oldWords[i] === newWords[j]) {
            diff.push({ value: oldWords[i] });
            i++;
            j++;
        } else {
            // Check if it's an insertion
            let insertionFound = false;
            // Look ahead in newWords to find the current oldWord
            const lookAheadLimit = 20; // Limit scope to prevent performance kill
            for (let k = 1; k < lookAheadLimit && j + k < newWords.length; k++) {
                if (newWords[j + k] === oldWords[i]) {
                    // Found it! Everything in between is added
                    for (let m = 0; m < k; m++) {
                        diff.push({ value: newWords[j + m], added: true });
                    }
                    j += k;
                    insertionFound = true;
                    break;
                }
            }

            if (!insertionFound) {
                // If not found ahead, treat current oldWord as removed
                diff.push({ value: oldWords[i], removed: true });
                i++;
            }
        }
    }

    // Append remaining removed
    while (i < oldWords.length) {
        diff.push({ value: oldWords[i], removed: true });
        i++;
    }

    // Append remaining added
    while (j < newWords.length) {
        diff.push({ value: newWords[j], added: true });
        j++;
    }

    return diff;
};
