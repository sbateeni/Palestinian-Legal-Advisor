// Utility functions for debugging localStorage persistence

export const debugLocalStorage = () => {
  if (typeof window === 'undefined') return;
  
  console.log('=== LocalStorage Debug Info ===');
  console.log('Storage length:', window.localStorage.length);
  
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key) {
      const value = window.localStorage.getItem(key);
      console.log(`${key}:`, value);
    }
  }
  console.log('==============================');
};

export const clearAllData = () => {
  if (typeof window === 'undefined') return;
  
  if (confirm('هل أنت متأكد من أنك تريد حذف جميع البيانات المحفوظة؟ هذا لا يمكن التراجع عنه.')) {
    window.localStorage.clear();
    console.log('تم مسح جميع بيانات localStorage');
    alert('تم مسح جميع البيانات. سيتم إعادة تحميل الصفحة.');
    window.location.reload();
  }
};

export const exportData = () => {
  if (typeof window === 'undefined') return;
  
  const data: Record<string, string | null> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key) {
      data[key] = window.localStorage.getItem(key);
    }
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `palestinian-law-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('تم تصدير البيانات:', data);
};

export const importData = (jsonData: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  
  try {
    Object.entries(jsonData).forEach(([key, value]) => {
      window.localStorage.setItem(key, value);
    });
    console.log('تم استيراد البيانات بنجاح');
    alert('تم استيراد البيانات. سيتم إعادة تحميل الصفحة.');
    window.location.reload();
  } catch (error) {
    console.error('خطأ في استيراد البيانات:', error);
    alert('حدث خطأ أثناء استيراد البيانات.');
  }
};