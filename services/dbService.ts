import { Case, ApiSource } from '../types';

const DB_NAME = 'PalestinianLawAdvisorDB';
const DB_VERSION = 1;
const CASES_STORE_NAME = 'cases';
const SETTINGS_STORE_NAME = 'settings';

interface Setting {
  key: string;
  value: any;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Database error:', request.error);
      reject('Database error: ' + request.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CASES_STORE_NAME)) {
        const caseStore = db.createObjectStore(CASES_STORE_NAME, { keyPath: 'id' });
        caseStore.createIndex('createdAt', 'createdAt', { unique: false });
        caseStore.createIndex('title', 'title', { unique: false });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
        db.createObjectStore(SETTINGS_STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
  return dbPromise;
}

// Generic function to perform a transaction
async function performTransaction<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = action(store);

    request.onsuccess = () => {
      resolve(request.result as T);
    };

    request.onerror = () => {
      console.error('Transaction Error:', request.error);
      reject(request.error);
    };
  });
}

// Case operations
export const getAllCases = () => performTransaction<Case[]>(CASES_STORE_NAME, 'readonly', store => store.getAll());
export const getCase = (id: string) => performTransaction<Case>(CASES_STORE_NAME, 'readonly', store => store.get(id));
export const addCase = (caseItem: Case) => performTransaction(CASES_STORE_NAME, 'readwrite', store => store.add(caseItem));
export const updateCase = (caseItem: Case) => performTransaction(CASES_STORE_NAME, 'readwrite', store => store.put(caseItem));
export const deleteCase = (id: string) => performTransaction(CASES_STORE_NAME, 'readwrite', store => store.delete(id));
export const clearCases = () => performTransaction(CASES_STORE_NAME, 'readwrite', store => store.clear());

// Settings operations
export async function getSetting<T>(key: string): Promise<T | null> {
    const result = await performTransaction<Setting>(SETTINGS_STORE_NAME, 'readonly', store => store.get(key));
    return result ? result.value : null;
}

export const setSetting = (setting: Setting) => performTransaction(SETTINGS_STORE_NAME, 'readwrite', store => store.put(setting));
