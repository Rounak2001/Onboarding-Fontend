const DB_NAME = 'AssessmentDB';
const DB_VERSION = 1;
const STORE_NAME = 'mcqAnswers';

export const openDB = () => {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            console.warn('Browser does not support IndexedDB. Offline caching disabled.');
            resolve(null);
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'sessionId' });
            }
        };
        
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

export const saveAnswersLocally = async (sessionId, answers) => {
    if (!sessionId) return;
    try {
        const db = await openDB();
        if (!db) return;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        await new Promise((resolve, reject) => {
            const request = store.put({ sessionId, answers, updatedAt: new Date().toISOString() });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.warn('IndexedDB save failed:', err);
    }
};

export const getAnswersLocally = async (sessionId) => {
    if (!sessionId) return null;
    try {
        const db = await openDB();
        if (!db) return null;
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        return await new Promise((resolve, reject) => {
            const request = store.get(sessionId);
            request.onsuccess = () => resolve(request.result?.answers || null);
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.warn('IndexedDB get failed:', err);
        return null;
    }
};

export const clearAnswersLocally = async (sessionId) => {
    if (!sessionId) return;
    try {
        const db = await openDB();
        if (!db) return;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        await new Promise((resolve, reject) => {
            const request = store.delete(sessionId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.warn('IndexedDB clear failed:', err);
    }
};
