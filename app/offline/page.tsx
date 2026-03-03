"use client";

import { CloudOff } from "lucide-react";
import Link from "next/link";

export default function OfflineFallback() {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <CloudOff className="w-8 h-8 text-slate-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">You are offline</h1>
                <p className="text-slate-400 mb-8">
                    It looks like you've lost your internet connection. We couldn't load the requested page.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors mb-3"
                >
                    Try Again
                </button>
                <Link
                    href="/"
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors inline-block"
                >
                    Go to Dashboard
                </Link>
            </div>
        </div>
    );
}
