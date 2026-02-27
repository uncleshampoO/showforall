import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const icons = {
        info: <Loader2 className="animate-spin text-indigo-400" size={18} />,
        success: <CheckCircle2 className="text-emerald-400" size={18} />,
        error: <AlertCircle className="text-rose-400" size={18} />
    };

    const bgs = {
        info: 'bg-zinc-900/90 border-indigo-500/20',
        success: 'bg-zinc-900/90 border-emerald-500/20',
        error: 'bg-zinc-900/90 border-rose-500/20'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%', scale: 0.95 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 min-w-[300px] ${bgs[type]}`}
        >
            <div className="shrink-0">
                {icons[type]}
            </div>
            <p className="text-sm font-medium text-zinc-200 flex-1">{message}</p>
            <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500">
                <X size={14} />
            </button>
        </motion.div>
    );
};

export default Toast;
