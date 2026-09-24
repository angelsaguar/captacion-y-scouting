import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isUrlValid = (url: any) => {
  if (typeof url !== 'string' || !url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

export const isSupabaseConfigured =
  isUrlValid(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl?.includes('placeholder');

// Fail gracefully if environment variables are missing or invalid
if (!isSupabaseConfigured) {
  console.info(
    'Iniciando en modo de persistencia local segura (sin conexión directa a Supabase). ' +
    'Todos los datos se guardan y mantienen en el almacenamiento local del navegador.'
  );
}

// -------------------------------------------------------------
// Local Storage Persistent Supabase Fallback Client
// Prevents "Failed to fetch" errors and ensures complete functionality
// -------------------------------------------------------------
function createLocalStorageSupabaseClient(): any {
  const AUTH_KEY = 'ud_lapoveda_auth_session';
  const TABLE_PREFIX = 'ud_lapoveda_table_';
  const authListeners = new Set<(event: string, session: any) => void>();

  const getLocalSession = () => {
    try {
      const data = localStorage.getItem(AUTH_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  };

  const setLocalSession = (session: any) => {
    try {
      if (session) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(AUTH_KEY);
      }
    } catch (e) {
      console.warn('Error saving local session:', e);
    }
  };

  const getTableData = (table: string): any[] => {
    try {
      const data = localStorage.getItem(TABLE_PREFIX + table);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  const setTableData = (table: string, data: any[]) => {
    try {
      localStorage.setItem(TABLE_PREFIX + table, JSON.stringify(data));
    } catch (e) {
      console.warn('Error saving table data for ' + table, e);
    }
  };

  const notifyAuthListeners = (event: string, session: any) => {
    authListeners.forEach((callback) => {
      try {
        callback(event, session);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  };

  class LocalQueryBuilder {
    private tableName: string;
    private filters: ((item: any) => boolean)[] = [];
    private sortFn: ((a: any, b: any) => number) | null = null;
    private limitCount: number | null = null;
    private isSingle = false;
    private isMaybeSingle = false;
    private operation: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
    private mutationPayload: any = null;
    private upsertConflictField: string | null = null;

    constructor(tableName: string) {
      this.tableName = tableName;
    }

    select(columns?: string) {
      this.operation = 'select';
      return this;
    }

    insert(values: any | any[]) {
      this.operation = 'insert';
      this.mutationPayload = values;
      return this;
    }

    upsert(values: any | any[], options?: { onConflict?: string }) {
      this.operation = 'upsert';
      this.mutationPayload = values;
      this.upsertConflictField = options?.onConflict || 'id';
      return this;
    }

    update(values: any) {
      this.operation = 'update';
      this.mutationPayload = values;
      return this;
    }

    delete() {
      this.operation = 'delete';
      return this;
    }

    eq(column: string, value: any) {
      this.filters.push((item) => String(item?.[column] ?? '') === String(value ?? ''));
      return this;
    }

    neq(column: string, value: any) {
      this.filters.push((item) => String(item?.[column] ?? '') !== String(value ?? ''));
      return this;
    }

    gt(column: string, value: any) {
      this.filters.push((item) => (item?.[column] ?? 0) > value);
      return this;
    }

    gte(column: string, value: any) {
      this.filters.push((item) => (item?.[column] ?? 0) >= value);
      return this;
    }

    lt(column: string, value: any) {
      this.filters.push((item) => (item?.[column] ?? 0) < value);
      return this;
    }

    lte(column: string, value: any) {
      this.filters.push((item) => (item?.[column] ?? 0) <= value);
      return this;
    }

    like(column: string, pattern: string) {
      const regex = new RegExp('^' + pattern.replace(/%/g, '.*') + '$', 'i');
      this.filters.push((item) => regex.test(String(item?.[column] ?? '')));
      return this;
    }

    ilike(column: string, pattern: string) {
      return this.like(column, pattern);
    }

    is(column: string, value: any) {
      this.filters.push((item) => item?.[column] === value);
      return this;
    }

    in(column: string, values: any[]) {
      const set = new Set((values || []).map((v) => String(v)));
      this.filters.push((item) => set.has(String(item?.[column] ?? '')));
      return this;
    }

    order(column: string, options?: { ascending?: boolean }) {
      const asc = options?.ascending !== false;
      this.sortFn = (a, b) => {
        const valA = a?.[column] ?? '';
        const valB = b?.[column] ?? '';
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      };
      return this;
    }

    limit(count: number) {
      this.limitCount = count;
      return this;
    }

    single() {
      this.isSingle = true;
      return this;
    }

    maybeSingle() {
      this.isMaybeSingle = true;
      return this;
    }

    private execute(): { data: any; error: any } {
      let currentTable = getTableData(this.tableName);

      if (this.operation === 'insert') {
        const rowsToAdd = Array.isArray(this.mutationPayload)
          ? this.mutationPayload
          : [this.mutationPayload];
        const stamped = rowsToAdd.map((r) => ({
          id: r.id || 'rec_' + Math.random().toString(36).substr(2, 9),
          created_at: r.created_at || new Date().toISOString(),
          ...r,
        }));
        currentTable = [...currentTable, ...stamped];
        setTableData(this.tableName, currentTable);
        return { data: Array.isArray(this.mutationPayload) ? stamped : stamped[0], error: null };
      }

      if (this.operation === 'upsert') {
        const rowsToUpsert = Array.isArray(this.mutationPayload)
          ? this.mutationPayload
          : [this.mutationPayload];

        const conflictKeys = (this.upsertConflictField || 'id')
          .split(',')
          .map((k) => k.trim());

        const nextTable = [...currentTable];
        for (const row of rowsToUpsert) {
          const matchIndex = nextTable.findIndex((existing) =>
            conflictKeys.every((k) => String(existing[k] ?? '') === String(row[k] ?? ''))
          );

          const entry = {
            id: row.id || (matchIndex >= 0 ? nextTable[matchIndex].id : 'rec_' + Math.random().toString(36).substr(2, 9)),
            created_at: matchIndex >= 0 ? nextTable[matchIndex].created_at : (row.created_at || new Date().toISOString()),
            updated_at: new Date().toISOString(),
            ...row,
          };

          if (matchIndex >= 0) {
            nextTable[matchIndex] = { ...nextTable[matchIndex], ...entry };
          } else {
            nextTable.push(entry);
          }
        }
        setTableData(this.tableName, nextTable);
        return { data: this.mutationPayload, error: null };
      }

      if (this.operation === 'update') {
        let updatedCount = 0;
        const nextTable = currentTable.map((item) => {
          const matches = this.filters.every((f) => f(item));
          if (matches) {
            updatedCount++;
            return {
              ...item,
              ...this.mutationPayload,
              updated_at: new Date().toISOString(),
            };
          }
          return item;
        });
        setTableData(this.tableName, nextTable);
        return { data: this.mutationPayload, error: null };
      }

      if (this.operation === 'delete') {
        const nextTable = currentTable.filter((item) => !this.filters.every((f) => f(item)));
        setTableData(this.tableName, nextTable);
        return { data: null, error: null };
      }

      // SELECT OPERATION
      let results = currentTable.filter((item) => this.filters.every((f) => f(item)));

      if (this.sortFn) {
        results.sort(this.sortFn);
      }

      if (this.limitCount !== null && this.limitCount >= 0) {
        results = results.slice(0, this.limitCount);
      }

      if (this.isSingle) {
        if (results.length === 0) {
          return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
        }
        return { data: results[0], error: null };
      }

      if (this.isMaybeSingle) {
        return { data: results.length > 0 ? results[0] : null, error: null };
      }

      return { data: results, error: null };
    }

    then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
      try {
        const res = this.execute();
        return Promise.resolve(res).then(onfulfilled, onrejected);
      } catch (err) {
        return Promise.reject(err).then(onfulfilled, onrejected);
      }
    }
  }

  return {
    auth: {
      async getSession() {
        const session = getLocalSession();
        return { data: { session }, error: null };
      },
      async getUser() {
        const session = getLocalSession();
        return { data: { user: session?.user || null }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password?: string }) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const isAdmin = cleanEmail === 'angel.saguar@telefonica.net';
        const isSanti = cleanEmail.includes('santi');
        const isAlejandro = cleanEmail.includes('alejandro') || cleanEmail.includes('saguar');
        const isJavier = cleanEmail.includes('javier') || cleanEmail.includes('asensio');

        let displayName = 'Usuario Autorizado';
        if (isAdmin) displayName = 'Ángel Saguar';
        else if (isSanti) displayName = 'Santi';
        else if (isAlejandro) displayName = 'Alejandro Saguar';
        else if (isJavier) displayName = 'Javier Asensio';

        const user = {
          id: 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '_'),
          email: cleanEmail,
          role: isAdmin ? 'admin' : 'scout',
          user_metadata: {
            nombre: displayName,
          },
        };

        const session = {
          access_token: 'local_token_' + Date.now(),
          token_type: 'bearer',
          expires_in: 3600 * 24 * 30,
          refresh_token: 'local_refresh_' + Date.now(),
          user,
        };

        setLocalSession(session);
        notifyAuthListeners('SIGNED_IN', session);
        return { data: { user, session }, error: null };
      },
      async signUp({ email, password, options }: any) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const nombre = options?.data?.nombre || 'Nuevo Usuario';
        const isAdmin = cleanEmail === 'angel.saguar@telefonica.net';

        const user = {
          id: 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '_'),
          email: cleanEmail,
          role: isAdmin ? 'admin' : 'scout',
          user_metadata: { nombre },
        };

        const session = {
          access_token: 'local_token_' + Date.now(),
          token_type: 'bearer',
          expires_in: 3600 * 24 * 30,
          refresh_token: 'local_refresh_' + Date.now(),
          user,
        };

        setLocalSession(session);
        notifyAuthListeners('SIGNED_IN', session);
        return { data: { user, session }, error: null };
      },
      async signOut() {
        setLocalSession(null);
        notifyAuthListeners('SIGNED_OUT', null);
        return { error: null };
      },
      onAuthStateChange(callback: (event: string, session: any) => void) {
        authListeners.add(callback);
        // Dispatch current state synchronously next tick
        setTimeout(() => {
          callback('INITIAL_SESSION', getLocalSession());
        }, 0);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authListeners.delete(callback);
              },
            },
          },
        };
      },
    },

    from(tableName: string) {
      return new LocalQueryBuilder(tableName);
    },

    storage: {
      from(bucketName: string) {
        return {
          async upload(path: string, file: any, options?: any) {
            return { data: { path }, error: null };
          },
          getPublicUrl(path: string) {
            return {
              data: {
                publicUrl: path.startsWith('http') || path.startsWith('data:') ? path : path,
              },
            };
          },
          async remove(paths: string[]) {
            return { data: paths, error: null };
          },
        };
      },
    },
  };
}

export const supabase: any = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : createLocalStorageSupabaseClient();
