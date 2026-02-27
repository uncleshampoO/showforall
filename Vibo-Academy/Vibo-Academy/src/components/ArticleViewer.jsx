import { X, FileText, Share } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function ArticleViewer({ content, onClose }) {
    if (!content) return null

    return (
        <div id="print-article-root" className="fixed inset-0 bg-zinc-950 z-[60] flex flex-col overflow-hidden">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* PREVENT CLIPPING: Reset all parent containers to allow multi-page flow */
                    html, body, #root, #print-article-root, .min-h-screen {
                        overflow: visible !important;
                        height: auto !important;
                        position: static !important;
                        background: white !important;
                        color: black !important;
                    }

                    /* HIDE EVERYTHING by default */
                    body * { visibility: hidden !important; }

                    /* SHOW ONLY THE ARTICLE */
                    #print-article-section, #print-article-section * { visibility: visible !important; }

                    /* POSITION AND CLEANING */
                    #print-article-section {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }

                    /* TYPOGRAPHY */
                    .prose { 
                        color: black !important; 
                        font-size: 11pt !important; 
                        width: 100% !important;
                        max-width: none !important;
                    }
                    .prose h1, .prose h2 { color: black !important; margin-top: 1.5rem !important; margin-bottom: 1rem !important; }
                    .prose p, .prose li { color: #111 !important; }
                    .prose code { background: #f4f4f5 !important; color: #111 !important; border: 1px solid #e4e4e7 !important; }

                    /* UI CLEANUP */
                    header, #print-article-header, .complete-btn, .nav-buttons { display: none !important; }
                }
            `}} />
            {/* Minimal Header */}
            <header id="print-article-header" className="px-6 py-4 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-zinc-100 tracking-tight">База знаний</h2>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Notion Deep Dive</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            window.print();
                            if (typeof window?.addToast === 'function') {
                                window.addToast('Открыто окно печати/PDF', 'info');
                            }
                        }}
                        className="p-2.5 hover:bg-zinc-900 rounded-xl transition-all text-zinc-400 hover:text-white border border-transparent hover:border-zinc-800"
                        title="Экспорт в PDF"
                    >
                        <Share size={18} />
                    </button>
                    <button onClick={onClose} className="p-2.5 hover:bg-zinc-900 rounded-xl transition-all text-zinc-400 hover:text-white border border-transparent hover:border-zinc-800">
                        <X size={20} />
                    </button>
                </div>
            </header>

            <main id="print-article-section" className="flex-1 overflow-y-auto bg-zinc-950 px-4 md:px-6 scrollbar-hide">
                <article className="max-w-screen-md mx-auto py-8 md:py-24 pb-48">
                    <div className="prose prose-invert prose-indigo max-w-none 
                        prose-headings:font-display prose-headings:tracking-tight
                        prose-h1:text-4xl prose-h1:mb-8 prose-h1:text-white
                        prose-h2:text-2xl prose-h2:border-b prose-h2:border-zinc-900 prose-h2:pb-4 prose-h2:mt-16 prose-h2:text-zinc-200
                        prose-p:text-zinc-400 prose-p:text-lg prose-p:leading-relaxed prose-p:mb-6
                        prose-li:text-zinc-400 prose-li:text-lg
                        prose-strong:text-zinc-100 prose-strong:font-semibold
                        prose-code:text-indigo-400 prose-code:bg-indigo-500/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                        prose-blockquote:border-l-indigo-500/50 prose-blockquote:bg-zinc-900/30 prose-blockquote:rounded-r-2xl prose-blockquote:py-4 prose-blockquote:px-8 prose-blockquote:text-zinc-300 prose-blockquote:italic
                        ">
                        <ReactMarkdown>
                            {content}
                        </ReactMarkdown>
                    </div>
                </article>
            </main>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 complete-btn">
                <button
                    onClick={onClose}
                    className="px-8 py-3 bg-zinc-100 text-zinc-950 rounded-full text-sm font-bold hover:bg-white transition-all shadow-2xl shadow-white/5 active:scale-95"
                >
                    Завершить чтение
                </button>
            </div>

            {/* AI Disclaimer Footer - Hidden during print */}
            <footer className="shrink-0 pb-8 pt-4 text-center bg-zinc-950 border-t border-zinc-800/10 no-print">
                <p className="text-[10px] text-zinc-600 font-medium">
                    Gemini может ошибаться, поэтому проверяйте его ответы.
                </p>
            </footer>
        </div>
    )
}
