import { useState, useEffect } from 'react'
import { TrendingUp, Target, ShieldCheck, ExternalLink, Zap, BarChart3, PieChart } from 'lucide-react'
import { sharkService } from '../lib/sharkService'

export default function SharkShowcase() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            const data = await sharkService.getStatsSummary()
            setStats(data)
            setLoading(false)
        }
        load()
    }, [])

    if (loading) {
        return (
            <div className="section fade-in" style={{ textAlign: 'center', padding: '100px 0' }}>
                <div className="pulse-loader"></div>
                <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>Загрузка AI аналитики...</p>
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="section fade-in" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p>Оффлайн демо-режим. Подключите Supabase для живых данных.</p>
            </div>
        )
    }

    return (
        <div className="section fade-in">
            <div className="text-center mb-4">
                <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📽️ Vibo Shark Showcase</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Интерактивный дашборд реального приложения (Seeded Demo)</p>
            </div>

            {/* METRICS GRID */}
            <div className="grid mb-4">
                <div className="card" style={{ borderLeft: '4px solid #06b6d4', background: 'var(--glass-bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <TrendingUp size={20} color="#06b6d4" />
                        <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>Revenue Forecast</span>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 900 }}>{stats.forecast.toLocaleString()} ₽</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Взвешенный прогноз по воронке</p>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #ec4899', background: 'var(--glass-bg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <Target size={20} color="#ec4899" />
                        <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>Active Deals</span>
                    </div>
                    <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 900 }}>{stats.dealCount} лидов</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>В стадии активных переговоров</p>
                </div>
            </div>

            {/* FUNNEL & CTA */}
            <div className="card mb-4" style={{ background: 'var(--glass-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <BarChart3 size={20} color="var(--accent)" />
                    <h4 style={{ margin: 0 }}>Воронка Продаж (Real-time)</h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(stats.funnel).map(([stage, count]) => {
                        const labels = { analysis: 'Анализ', requisites: 'Реквизиты', closing: 'Дожим', payment: 'Оплата' }
                        const weights = { analysis: 10, requisites: 30, closing: 60, payment: 90 }
                        return (
                            <div key={stage} style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 600 }}>{labels[stage]}</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>{count} сделок</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${(count / stats.dealCount) * 100}%`,
                                        height: '100%',
                                        background: stage === 'payment' ? '#22c55e' : 'var(--accent)',
                                        transition: 'width 1s ease-out'
                                    }}></div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                        Это живые данные из базы приложения Vibo Shark. Вы можете запустить полную версию в режиме Demo (Read-only).
                    </p>
                    <a
                        href="https://vibo-shark.vercel.app/?demo=true"
                        target="_blank"
                        rel="noopener"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '16px', fontSize: '16px' }}
                    >
                        <Zap size={18} style={{ marginRight: '8px' }} />
                        Запустить полный Демо-интерфейс
                    </a>
                </div>
            </div>

            <style>{`
                .pulse-loader {
                    width: 48px;
                    height: 48px;
                    border: 4px solid var(--accent);
                    border-radius: 50%;
                    display: inline-block;
                    position: relative;
                    box-sizing: border-box;
                    animation: rotation 1s linear infinite;
                }
                .pulse-loader::after {
                    content: '';  
                    box-sizing: border-box;
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 4px solid transparent;
                    border-bottom-color: var(--success);
                }
                @keyframes rotation {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
