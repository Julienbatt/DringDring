"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function TestAuthSimplePage() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        try {
          const token = await getIdToken(user, true);
          setToken(token);
          console.log("🔑 Token obtenu:", token.substring(0, 50) + "...");
        } catch (error) {
          console.error("❌ Erreur token:", error);
        }
      }
    });
    return () => unsub();
  }, []);

  const testDirectCall = async () => {
    if (!token) {
      setTestResult("❌ Pas de token disponible");
      return;
    }

    try {
      console.log("🧪 Test direct de l'API avec token...");
      const response = await fetch("http://localhost:8000/client/stats", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      
      console.log("📡 Réponse reçue:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      setTestResult(`✅ Succès: ${JSON.stringify(result, null, 2)}`);
    } catch (error: any) {
      console.error("❌ Erreur:", error);
      setTestResult(`❌ Erreur: ${error.message}`);
    }
  };

  const testApiCall = async () => {
    try {
      console.log("🧪 Test via apiAuthGet...");
      const { apiAuthGet } = await import("@/lib/api");
      const result = await apiAuthGet("/client/stats");
      setTestResult(`✅ Succès via apiAuthGet: ${JSON.stringify(result, null, 2)}`);
    } catch (error: any) {
      console.error("❌ Erreur apiAuthGet:", error);
      setTestResult(`❌ Erreur apiAuthGet: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Test d'Authentification Simple
            </h1>
            <p className="text-gray-600 mb-6">
              Vous devez être connecté pour tester l'authentification.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 Test d'Authentification Simple
        </h1>

        {/* État de l'utilisateur */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            État de l'utilisateur
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>UID:</strong> {user.uid}</p>
              <p><strong>Nom:</strong> {user.displayName || 'Non défini'}</p>
            </div>
            <div>
              <p><strong>Token:</strong> {token ? `${token.substring(0, 30)}...` : 'Non disponible'}</p>
              <p><strong>Longueur:</strong> {token.length} caractères</p>
              <p><strong>Connecté:</strong> <span className="text-green-600">✅ Oui</span></p>
            </div>
          </div>
        </div>

        {/* Tests API */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Tests API
          </h2>
          
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={testDirectCall}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Test Direct avec Token
              </button>
              
              <button
                onClick={testApiCall}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Test via apiAuthGet
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

        {/* Actions */}
        <div className="text-center">
          <button
            onClick={() => auth.signOut()}
            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}



