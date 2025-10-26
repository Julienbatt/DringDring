"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html>
      <body>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-2">Une erreur est survenue.</h2>
          <p className="mb-4">{error?.message || "Merci de réessayer."}</p>
          <button className="px-3 py-2 border rounded" onClick={() => reset()}>Réessayer</button>
        </div>
      </body>
    </html>
  );
}




