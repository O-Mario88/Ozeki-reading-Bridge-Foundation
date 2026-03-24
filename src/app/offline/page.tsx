"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-20 h-20 bg-brand-surface rounded-full flex items-center justify-center mb-6 shadow-sm border border-brand-outline">
        <WifiOff className="w-10 h-10 text-brand-primary" />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold font-serif text-brand-text mb-4">
        You're Offline
      </h1>
      <p className="text-brand-text-muted max-w-md mb-8">
        It looks like you've lost your internet connection. 
        You can still access any pages you've previously visited, but this specific page hasn't been cached yet.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-brand-primary text-white font-medium rounded-lg hover:bg-brand-secondary transition-colors"
        >
          Try Again
        </button>
        <button 
          onClick={() => window.history.back()}
          className="px-6 py-2.5 bg-white text-brand-primary border border-brand-primary font-medium rounded-lg hover:bg-brand-surface transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
