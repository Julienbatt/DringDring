"use client";

import type { ReactNode } from "react";

type PageStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function PageLoader({ title = "Chargement...", description }: PageStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center text-gray-600">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-purple-600" aria-hidden />
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    </div>
  );
}

export function PageError({ title = "Erreur inattendue", description, action }: PageStateProps) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-red-50 p-4 text-red-500">⚠️</div>
      <div>
        <p className="text-base font-semibold text-gray-900">{title}</p>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}



