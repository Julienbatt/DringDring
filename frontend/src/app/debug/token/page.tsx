"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { apiAuthGet } from "@/lib/api";

export default function DebugTokenPage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>("");
  const [testResult, setTestResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const token = await getIdToken(user, true);
          setToken(token);
        } catch (error) {
          console.error("Erreur token:", error);
        }
      }
    });
    return () => unsub();
  }, []);

  const testApiCall = async () => {
    setLoading(true);
    setTestResult("");
    
    try {
      console.log("🧪 Test de l'appel API /clients...");
      const result = await apiAuthGet("/clients?query=test");
      setTestResult(`✅ Succès: ${JSON.stringify(result, null, 2)}`);
    } catch (error: any) {
      console.error("❌ Erreur API:", error);
      setTestResult(`❌ Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDirectApiCall = async () => {
    setLoading(true);
    setTestResult("");
    
    try {
      console.log("🧪 Test direct de l'API...");
      const response = await fetch("http://localhost:8000/clients?query=test", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setTestResult(`✅ Succès direct: ${JSON.stringify(result, null, 2)}`);
    } catch (error: any) {
      console.error("❌ Erreur directe:", error);
      setTestResult(`❌ Erreur directe: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔧 Debug Token Firebase
        </h1>

        {/* État de l'authentification */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            État de l'authentification
          </h2>
          
          {user ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  ✅ Utilisateur connecté
                </h3>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>UID:</strong> {user.uid}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Nom:</strong> {user.displayName || 'Non défini'}</p>
                  <p><strong>Provider:</strong> {user.providerData[0]?.providerId || 'Inconnu'}</p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  🔑 Token Firebase
                </h3>
                <div className="text-sm text-blue-700">
                  <p><strong>Token:</strong> {token ? `${token.substring(0, 50)}...` : 'Non disponible'}</p>
                  <p><strong>Longueur:</strong> {token.length} caractères</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                ❌ Utilisateur non connecté
              </h3>
              <p className="text-red-700">
                Veuillez vous connecter pour tester l'API.
              </p>
            </div>
          )}
        </div>

        {/* Tests API */}
        {user && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Tests API
            </h2>
            
            <div className="space-y-4">
              <div className="flex space-x-4">
                <button
                  onClick={testApiCall}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Test en cours...' : 'Test via apiAuthGet'}
                </button>
                
                <button
                  onClick={testDirectApiCall}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Test en cours...' : 'Test direct fetch'}
                </button>
              </div>
              
              {testResult && (
                <div className="bg-gray-50 border rounded-md p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Résultat du test:</h3>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto max-h-64">
                    {testResult}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Configuration */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>API Base URL:</strong> {process.env.NEXT_PUBLIC_API_BASE_URL || 'Non défini'}</p>
              <p><strong>Firebase Project:</strong> {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Non défini'}</p>
            </div>
            <div>
              <p><strong>Auth Domain:</strong> {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'Non défini'}</p>
              <p><strong>API Key:</strong> {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Défini' : '❌ Non défini'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}