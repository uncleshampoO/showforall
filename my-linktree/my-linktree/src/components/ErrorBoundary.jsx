import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', maxWidth: '600px', margin: '40px auto', fontFamily: 'system-ui, sans-serif' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#DC2626', marginBottom: '16px' }}>
                        <AlertTriangle size={32} />
                        <h2 style={{ margin: 0 }}>Что-то пошло не так</h2>
                    </div>
                    <div style={{ background: '#FEF2F2', padding: '16px', borderRadius: '8px', border: '1px solid #FCA5A5', color: '#991B1B' }}>
                        <p style={{ fontWeight: 600, marginTop: 0 }}>Ошибка: {this.state.error && this.state.error.toString()}</p>
                        <details style={{ marginTop: '10px', cursor: 'pointer' }}>
                            <summary>Показать стек вызовов</summary>
                            <pre style={{ fontSize: '12px', marginTop: '10px', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '20px', padding: '10px 20px', background: '#DC2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                    >
                        Перезагрузить страницу
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
