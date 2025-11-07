/**
 * Utility function to format legal responses with proper HTML structure
 * Converts plain text with markdown-like formatting to clean HTML
 */
export const formatLegalResponse = (text: string = ''): string => {
  if (!text) return '';
  
  // Clean any Chinese characters that might appear in the response
  // This is a temporary fix - the root cause should be addressed in the AI model prompt
  let cleanText = text.replace(/[^\x00-\x7F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\w\.\,\:\;\!\?\-\(\)\[\]\{\}\"\'\/\\\%\@\#\$\^\&\*\+\=\<\>\_\~\`\|\n\r]/g, '');
  
  // Split text into sections
  const sections = cleanText.split('\n\n');
  
  let formattedSections: string[] = [];
  
  for (const section of sections) {
    // Skip empty sections
    if (!section.trim()) continue;
    
    // Check if this is a main heading (marked with ##)
    if (section.startsWith('## ')) {
      const heading = section.substring(3).trim();
      formattedSections.push(`<h2 class="text-xl font-bold text-blue-400 mb-4 mt-6 pb-2 border-b border-gray-700">${heading}</h2>`);
    }
    // Check if this is a subheading (marked with ###)
    else if (section.startsWith('### ')) {
      const heading = section.substring(4).trim();
      formattedSections.push(`<h3 class="text-lg font-semibold text-gray-200 mb-3 mt-5">${heading}</h3>`);
    }
    // Check if this is a numbered list item (starts with number followed by dot)
    else if (/^\d+[\.\)]/.test(section.trim())) {
      // This is likely part of a list, wrap in proper list tags
      const listItems = section.split('\n').filter(item => item.trim());
      const listHtml = listItems.map(item => {
        const cleanItem = item.replace(/^\d+[\.\)]\s*/, '').trim();
        return `<li class="mb-2">${cleanItem}</li>`;
      }).join('');
      formattedSections.push(`<ol class="list-decimal list-inside mr-4 mb-4 space-y-1">${listHtml}</ol>`);
    }
    // Check if this is a bulleted list item (starts with - or *)
    else if (/^[\-\*]/.test(section.trim())) {
      const listItems = section.split('\n').filter(item => item.trim());
      const listHtml = listItems.map(item => {
        const cleanItem = item.replace(/^[\-\*]\s*/, '').trim();
        return `<li class="mb-2">${cleanItem}</li>`;
      }).join('');
      formattedSections.push(`<ul class="list-disc list-inside mr-4 mb-4 space-y-1">${listHtml}</ul>`);
    }
    // Check if this is a quoted text (starts with >)
    else if (section.startsWith('>')) {
      const quote = section.substring(1).trim();
      formattedSections.push(`<blockquote class="border-r-4 border-blue-500 pr-4 py-2 my-3 bg-gray-800 text-gray-300 italic">${quote}</blockquote>`);
    }
    // Regular paragraph
    else {
      formattedSections.push(`<p class="mb-4 text-gray-300">${section.trim()}</p>`);
    }
  }
  
  return formattedSections.join('');
};

/**
 * Alternative formatting function for structured legal content
 * Specifically designed for the legal analysis format
 */
export const formatStructuredLegalResponse = (text: string = ''): string => {
  if (!text) return '';
  
  // Clean any Chinese characters that might appear in the response
  let cleanText = text.replace(/[^\x00-\x7F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\w\.\,\:\;\!\?\-\(\)\[\]\{\}\"\'\/\\\%\@\#\$\^\&\*\+\=\<\>\_\~\`\|\n\r\u200F\u200E]/g, '');
  
  // Split into lines for processing
  const lines = cleanText.split('\n');
  let formattedLines: string[] = [];
  let inList = false;
  let listType: 'ordered' | 'unordered' | null = null;
  let listItems: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      // If we were in a list, close it
      if (inList && listItems.length > 0) {
        const listTag = listType === 'ordered' ? 'ol' : 'ul';
        formattedLines.push(`<${listTag} class="${listType === 'ordered' ? 'list-decimal' : 'list-disc'} list-inside mr-4 mb-4 space-y-1">${listItems.join('')}</${listTag}>`);
        inList = false;
        listType = null;
        listItems = [];
      }
      continue;
    }
    
    // Check for main headings (##)
    if (line.startsWith('## ')) {
      // Close any open list
      if (inList && listItems.length > 0) {
        const listTag = listType === 'ordered' ? 'ol' : 'ul';
        formattedLines.push(`<${listTag} class="${listType === 'ordered' ? 'list-decimal' : 'list-disc'} list-inside mr-4 mb-4 space-y-1">${listItems.join('')}</${listTag}>`);
        inList = false;
        listType = null;
        listItems = [];
      }
      
      const heading = line.substring(3).trim();
      formattedLines.push(`<h2 class="text-xl font-bold text-blue-400 mb-4 mt-6 pb-2 border-b border-gray-700">${heading}</h2>`);
    }
    // Check for subheadings (###)
    else if (line.startsWith('### ')) {
      // Close any open list
      if (inList && listItems.length > 0) {
        const listTag = listType === 'ordered' ? 'ol' : 'ul';
        formattedLines.push(`<${listTag} class="${listType === 'ordered' ? 'list-decimal' : 'list-disc'} list-inside mr-4 mb-4 space-y-1">${listItems.join('')}</${listTag}>`);
        inList = false;
        listType = null;
        listItems = [];
      }
      
      const heading = line.substring(4).trim();
      formattedLines.push(`<h3 class="text-lg font-semibold text-gray-200 mb-3 mt-5">${heading}</h3>`);
    }
    // Check for quoted text (>)
    else if (line.startsWith('>')) {
      // Close any open list
      if (inList && listItems.length > 0) {
        const listTag = listType === 'ordered' ? 'ol' : 'ul';
        formattedLines.push(`<${listTag} class="${listType === 'ordered' ? 'list-decimal' : 'list-disc'} list-inside mr-4 mb-4 space-y-1">${listItems.join('')}</${listTag}>`);
        inList = false;
        listType = null;
        listItems = [];
      }
      
      const quote = line.substring(1).trim();
      formattedLines.push(`<blockquote class="border-r-4 border-blue-500 pr-4 py-2 my-3 bg-gray-800 text-gray-300 italic">${quote}</blockquote>`);
    }
    // Check for ordered list items (number followed by dot or parenthesis)
    else if (/^\d+[\.\)]\s+/.test(line)) {
      // If we're not in a list or in a different type of list, start a new ordered list
      if (!inList || listType !== 'ordered') {
        // Close previous list if exists
        if (inList && listItems.length > 0) {
          const listTag = listType === 'ordered' ? 'ol' : 'ul';
          formattedLines.push(`<${listTag} class="${listType === 'ordered' ? 'list-decimal' : 'list-disc'} list-inside mr-4 mb-4 space-y-1">${listItems.join('')}</${listTag}>`);
          listItems = [];
        }
        inList = true;
        listType = 'ordered';
      }
      
      const content = line.replace(/^\d+[\.\)]\s+/, '').trim();
      listItems.push(`<li class="mb-2">${content}</li>`);
    }
    // Check for unordered list items (- or *)
    else if (/^[\-\*]\s+/.test(line)) {
      // If we're not in a list or in a different type of list, start a new unordered list
      if (!inList || listType !== 'unordered') {
        // Close previous list if exists
        if (inList && listItems.length > 0) {
          const listTag = listType === 'ordered' ? 'ol' : 'ul';
          formattedLines.push(`<${listTag} class="${listType === 'ordered' ? 'list-decimal' : 'list-disc'} list-inside mr-4 mb-4 space-y-1">${listItems.join('')}</${listTag}>`);
          listItems = [];
        }
        inList = true;
        listType = 'unordered';
      }
      
      const content = line.replace(/^[\-\*]\s+/, '').trim();
      listItems.push(`<li class="mb-2">${content}</li>`);
    }
    // Regular paragraph
    else {
      // Close any open list
      if (inList && listItems.length > 0) {
        const listTag = listType === 'ordered' ? 'ol' : 'ul';
        formattedLines.push(`<${listTag} class="${listType === 'ordered' ? 'list-decimal' : 'list-disc'} list-inside mr-4 mb-4 space-y-1">${listItems.join('')}</${listTag}>`);
        inList = false;
        listType = null;
        listItems = [];
      }
      
      formattedLines.push(`<p class="mb-4 text-gray-300">${line}</p>`);
    }
  }
  
  // Close any remaining open list
  if (inList && listItems.length > 0) {
    const listTag = listType === 'ordered' ? 'ol' : 'ul';
    formattedLines.push(`<${listTag} class="${listType === 'ordered' ? 'list-decimal' : 'list-disc'} list-inside mr-4 mb-4 space-y-1">${listItems.join('')}</${listTag}>`);
  }
  
  return formattedLines.join('');
};