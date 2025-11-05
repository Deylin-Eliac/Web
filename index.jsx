import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

const FIREBASE_CONFIG_OBJ = {
  apiKey: "AIzaSyB2a-Cc09zOYfwMuTh74jtKQbNbngqmiug", 
  authDomain: "tu-dominio.firebaseapp.com",
  projectId: "tu-id-de-proyecto",
  storageBucket: "tu-storage.appspot.com",
  messagingSenderId: "tu-sender-id",
  appId: "tu-app-id-web",
};

const PROJECT_ID = FIREBASE_CONFIG_OBJ.projectId;

const App = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);

  const appId = useMemo(() => PROJECT_ID, []);
  const firebaseConfig = useMemo(() => FIREBASE_CONFIG_OBJ, []);

  useEffect(() => {
    try {
      if (!firebaseConfig.apiKey) {
        throw new Error('Configuración de Firebase no válida. Revisa FIREBASE_CONFIG_OBJ.');
      }
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);
      setDb(firestore);

      const authenticate = async () => {
        await signInAnonymously(authInstance);
      };
      
      authenticate();

      const unsubscribeAuth = onAuthStateChanged(authInstance, (user) => {
        if (user) {
          setUserId(user.uid);
          setLoading(false);
        } else {
          setUserId(null);
          setLoading(false);
        }
      });

      return () => unsubscribeAuth();
    } catch (e) {
      setError('Error al inicializar la aplicación. Asegúrate de pegar tu configuración de Firebase en el código.');
      setLoading(false);
    }
  }, [firebaseConfig]);

  useEffect(() => {
    if (db && userId) {
      const suggestionsCollectionPath = `/artifacts/${appId}/public/data/suggestions`;
      const suggestionsCollectionRef = collection(db, suggestionsCollectionPath);
      const q = query(suggestionsCollectionRef);

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const fetchedSuggestions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setSuggestions(fetchedSuggestions);
      }, (e) => {
        setError('Error al cargar las sugerencias. Inténtalo de nuevo.');
      });

      return () => unsubscribeSnapshot();
    }
  }, [db, userId, appId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newSuggestion.trim() || !db || !userId) return;
    setSubmitLoading(true);

    try {
      const suggestionsCollectionPath = `/artifacts/${appId}/public/data/suggestions`;
      await addDoc(collection(db, suggestionsCollectionPath), {
        text: newSuggestion.trim(),
        authorId: userId,
        createdAt: serverTimestamp(),
      });
      setNewSuggestion('');
    } catch (e) {
      setError('No se pudo subir la sugerencia. Verifica tu conexión.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-xl font-semibold text-gray-700">Cargando aplicación...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-red-50 p-4">
        <div className="text-xl font-semibold text-red-700">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-xl p-6 md:p-8">
        <header className="mb-8 border-b pb-4">
          <h1 className="text-3xl font-extrabold text-indigo-700 text-center">Buzón de Ideas para tu Bot de WhatsApp</h1>
          <p className="text-gray-500 text-center mt-1">Comparte tus sugerencias de funciones o canciones. ¡Todo es público!</p>
          {userId && (
            <div className="text-xs text-center text-gray-400 mt-3 p-1 bg-gray-50 rounded">
              Tu ID de Usuario: <span className="font-mono text-gray-600 break-all">{userId}</span>
            </div>
          )}
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-700 mb-4">Sube una Sugerencia</h2>
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <textarea
              value={newSuggestion}
              onChange={(e) => setNewSuggestion(e.target.value)}
              placeholder="Escribe tu sugerencia (nueva función o canción)..."
              maxLength={300}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out resize-none"
              required
            ></textarea>
            <div className="text-right text-sm text-gray-400">{newSuggestion.length}/300 caracteres</div>
            <button
              type="submit"
              disabled={submitLoading || !newSuggestion.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-200 ease-in-out disabled:bg-indigo-300 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {submitLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Enviar Sugerencia'
              )}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Ideas Recientes ({suggestions.length})</h2>
          <div className="space-y-4">
            {suggestions.length === 0 ? (
              <p className="text-gray-500 text-center p-6 bg-gray-50 rounded-lg">Aún no hay sugerencias. ¡Sé el primero en aportar una idea!</p>
            ) : (
              suggestions.map((s) => (
                <div key={s.id} className="bg-white border border-indigo-100 p-4 rounded-lg shadow-sm hover:shadow-md transition duration-150">
                  <p className="text-gray-800 break-words">{s.text}</p>
                  <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                    <span>
                      Sugerido por: <span className="font-mono text-gray-500 break-all">{s.authorId ? s.authorId.substring(0, 8) + '...' : 'Anónimo'}</span>
                    </span>
                    {s.createdAt && (
                      <span className="text-gray-400">
                        {new Date(s.createdAt.seconds * 1000).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      <footer className="mt-8 text-center text-sm text-gray-500">
        Aplicación impulsada por Firebase y React.
      </footer>
    </div>
  );
};

export default App;

