import { FileText, ExternalLink } from 'lucide-react'
import SharkShowcase from './SharkShowcase'

export default function ReportsSection() {
    const reports = [
        {
            id: 'jan-2026-deep',
            title: 'January Deep Analysis Report (v2.0)',
            month: 'January 2026',
            desc: 'Comprehensive deep dive: Projects audit, Engineering evolution & 15 Vibecoding criteria.',
            link: '/reports/january-deep-analysis.html',
            tags: ['Analysis', 'Projects', 'Vibecoding']
        },
        {
            id: 'jan-2026',
            title: 'Monthly Master Strategy',
            month: 'January 2026',
            desc: 'Vacuum Protocol, Competency Analysis & Transformation Report.',
            link: '/reports/jan-2026.html',
            tags: ['Strategy', 'Metrics', 'Vibecoding']
        }
    ]

    return (
        <div className="section fade-in">
            <div className="text-center mb-3">
                <h2>🏆 Proof of Work</h2>
                <p>Proof of Work & Strategic alignment.</p>
            </div>

            <div className="grid">
                {reports.map((report) => (
                    <div key={report.id} className="card">
                        <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <FileText size={20} color="var(--accent)" />
                                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{report.month}</h3>
                                </div>
                                <h4 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>{report.title}</h4>
                            </div>
                            <span className="tag">{report.tags[0]}</span>
                        </div>

                        <p className="mb-2">{report.desc}</p>

                        <a
                            href={report.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            View Report <ExternalLink size={14} style={{ marginLeft: '4px' }} />
                        </a>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '60px' }}>
                <SharkShowcase />
            </div>
            <style>{`
                .section { padding: 48px 0; }
                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                    gap: 24px;
                    margin-top: 32px;
                }
                .card {
                    background: var(--glass-bg) !important;
                    padding: 32px;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--glass-border);
                    transition: all 0.3s ease;
                }
                @media (max-width: 768px) {
                    .grid { gap: 16px; margin-top: 20px; }
                    .card { padding: 20px; }
                }
                .card:hover { border-color: var(--accent); transform: translateY(-4px); }
                .tag { font-size: 11px; padding: 4px 12px; background: var(--accent); color: white; border-radius: 100px; }
            `}</style>
        </div>
    )
}
