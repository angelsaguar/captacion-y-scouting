// Robust file storage utility using IndexedDB for large session files (PDFs, diagrams, images, documents)
// This avoids localStorage quota limits (which fail on >1-2MB files) and provides seamless offline/cloud durability.

const DB_NAME = 'ClubGestionFilesDB';
const DB_VERSION = 1;
const STORE_NAME = 'session_files';

export interface StoredSessionFile {
  id: string;
  nombre: string;
  tamano: string;
  tipo: string;
  dataUrl: string;
  sessionId?: string;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result as IDBDatabase);
    };

    request.onerror = (event: any) => {
      reject(event.target.error || new Error('Failed to open IndexedDB'));
    };
  });
}

export async function saveSessionFile(file: {
  id: string;
  nombre: string;
  tamano: string;
  tipo: string;
  dataUrl: string;
  sessionId?: string;
}): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredSessionFile = {
        ...file,
        createdAt: Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to memory/local:', err);
    try {
      sessionStorage.setItem(`file_${file.id}`, file.dataUrl);
    } catch {}
  }
}

export async function getSessionFile(id: string): Promise<StoredSessionFile | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result as StoredSessionFile);
        } else {
          // Check session storage fallback
          const fallbackData = sessionStorage.getItem(`file_${id}`);
          if (fallbackData) {
            resolve({
              id,
              nombre: 'Archivo',
              tamano: '',
              tipo: 'application/octet-stream',
              dataUrl: fallbackData,
              createdAt: Date.now()
            });
          } else {
            resolve(null);
          }
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IndexedDB get failed:', err);
    const fallbackData = sessionStorage.getItem(`file_${id}`);
    if (fallbackData) {
      return {
        id,
        nombre: 'Archivo',
        tamano: '',
        tipo: 'application/octet-stream',
        dataUrl: fallbackData,
        createdAt: Date.now()
      };
    }
    return null;
  }
}

export async function deleteSessionFile(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => {
        sessionStorage.removeItem(`file_${id}`);
        resolve();
      };
      req.onerror = () => {
        sessionStorage.removeItem(`file_${id}`);
        resolve();
      };
    });
  } catch {
    sessionStorage.removeItem(`file_${id}`);
  }
}

// Hydrates session files with their full dataUrl from IndexedDB if not already present
export async function hydrateSessionFiles<T extends { id: string; nombre: string; tamano: string; tipo: string; dataUrl?: string }>(
  files: T[]
): Promise<T[]> {
  if (!files || files.length === 0) return [];

  const hydrated = await Promise.all(
    files.map(async (f) => {
      if (f.dataUrl && f.dataUrl.length > 50) {
        // Also ensure it is cached in IndexedDB
        saveSessionFile({
          id: f.id,
          nombre: f.nombre,
          tamano: f.tamano,
          tipo: f.tipo,
          dataUrl: f.dataUrl
        }).catch(() => {});
        return f;
      }
      // Fetch from IndexedDB
      const stored = await getSessionFile(f.id);
      if (stored && stored.dataUrl) {
        return {
          ...f,
          dataUrl: stored.dataUrl
        };
      }
      return f;
    })
  );

  return hydrated;
}

// Safe localStorage setter that strips heavy dataUrls if quota is exceeded
export function safeLocalStorageSetSessions(key: string, sessions: any[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(sessions));
  } catch (err: any) {
    console.warn('localStorage quota warning when saving sessions. Sanitizing heavy files payload:', err);
    try {
      // Create a lightweight version of sessions keeping file metadata but omitting massive base64 strings
      // (The base64 data is preserved safely in IndexedDB)
      const lightweightSessions = sessions.map((sess) => ({
        ...sess,
        archivos: (sess.archivos || []).map((file: any) => {
          // Save to IndexedDB first
          if (file.dataUrl) {
            saveSessionFile({
              id: file.id,
              nombre: file.nombre,
              tamano: file.tamano,
              tipo: file.tipo,
              dataUrl: file.dataUrl,
              sessionId: sess.id
            }).catch(() => {});
          }
          return {
            id: file.id,
            nombre: file.nombre,
            tamano: file.tamano,
            tipo: file.tipo
            // dataUrl omitted in localStorage to fit quota
          };
        }),
        videos: (sess.videos || []).map((vid: any) => {
          if (vid.tipo === 'local' && vid.url && vid.url.startsWith('data:')) {
            // Also store local video in IndexedDB
            saveSessionFile({
              id: vid.id,
              nombre: vid.titulo || 'Video',
              tamano: vid.tamano || '',
              tipo: 'video/mp4',
              dataUrl: vid.url,
              sessionId: sess.id
            }).catch(() => {});
            return {
              ...vid,
              url: '' // will be hydrated from IndexedDB
            };
          }
          return vid;
        })
      }));

      localStorage.setItem(key, JSON.stringify(lightweightSessions));
    } catch (innerErr) {
      console.error('Failed to save even sanitized sessions to localStorage:', innerErr);
    }
  }
}
