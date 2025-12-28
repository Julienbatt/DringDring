'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html>
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center">
                    <h2 className="text-2xl font-bold mb-4">Erreur Critique</h2>
                    <p className="mb-4 text-gray-500">L'application a rencontré une erreur irrécupérable.</p>
                    <button
                        onClick={() => reset()}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Relancer l'application
                    </button>
                </div>
            </body>
        </html>
    )
}
