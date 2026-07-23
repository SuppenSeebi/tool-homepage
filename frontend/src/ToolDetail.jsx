import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE } from './apiBase';

const TABS = ['run', 'setup', 'source'];

// Every tool shares the exact same contract (POST /run, JSON in, JSON out - see
// backend/app/registry.py), so this one generic form works for any tool with zero per-tool
// frontend code. A tool wanting a friendlier field-by-field form is a future enhancement, not
// something every new tool has to earn by also writing its own frontend page.
function RunTab({ toolId }) {
    const [input, setInput] = useState('{\n  \n}');
    const [output, setOutput] = useState(null);
    const [err, setErr] = useState(null);
    const [busy, setBusy] = useState(false);

    const handleRun = async () => {
        setBusy(true); setErr(null); setOutput(null);
        let body;
        try {
            body = JSON.parse(input);
        } catch {
            setErr('Input is not valid JSON.');
            setBusy(false);
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/app/tools/${toolId}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
            setOutput(data);
        } catch (e) {
            setErr(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="run-tab">
            <label htmlFor="run-input">Input (JSON)</label>
            <textarea id="run-input" value={input} onChange={e => setInput(e.target.value)} rows={10} />
            <button onClick={handleRun} disabled={busy}>{busy ? 'Running...' : 'Run'}</button>
            {err && <pre className="error">{err}</pre>}
            {output && <pre className="output">{JSON.stringify(output, null, 2)}</pre>}
        </div>
    );
}

// Auto-rendered straight from the registry entry - never hand-written per tool, so it can't
// drift from what's actually running the way a hand-maintained description could.
function SetupTab({ tool }) {
    return (
        <dl className="setup-list">
            <dt>Language</dt><dd>{tool.language}</dd>
            <dt>Runtime</dt><dd>{tool.runtime}</dd>
            <dt>Sandbox</dt><dd>{tool.sandbox}</dd>
            <dt>Dependencies</dt>
            <dd>{tool.dependencies.length ? tool.dependencies.join(', ') : 'none'}</dd>
        </dl>
    );
}

function SourceTab({ toolId }) {
    const [source, setSource] = useState(null);
    const [err, setErr] = useState(null);

    useEffect(() => {
        setSource(null);
        setErr(null);
        fetch(`${API_BASE}/app/tools/${toolId}/source`)
            .then(res => {
                if (!res.ok) throw new Error(`Backend returned ${res.status}`);
                return res.json();
            })
            .then(data => setSource(data.source))
            .catch(e => setErr(e.message));
    }, [toolId]);

    if (err) return <p className="error">Could not load source: {err}</p>;
    if (source === null) return <p className="muted">Loading source...</p>;
    return <pre className="source-view"><code>{source}</code></pre>;
}

function ToolDetail() {
    const { id } = useParams();
    const [tool, setTool] = useState(null);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState('run');

    useEffect(() => {
        fetch(`${API_BASE}/app/tools`)
            .then(res => res.json())
            .then(tools => {
                const found = tools.find(t => t.id === id);
                if (!found) throw new Error('Tool not found');
                setTool(found);
            })
            .catch(e => setError(e.message));
    }, [id]);

    if (error) return <div className="tool-detail"><Link to="/" className="back-link">&larr; back</Link><p className="error">{error}</p></div>;
    if (!tool) return <p className="muted">Loading...</p>;

    return (
        <div className="tool-detail">
            <Link to="/" className="back-link">&larr; back</Link>
            <div className="tool-detail-header">
                <h2>{tool.name}</h2>
                <span className="lang-badge">{tool.language}</span>
            </div>
            <p className="tool-description">{tool.description}</p>
            <div className="tag-list">
                {tool.tags.map(t => <span className="tag" key={t}>{t}</span>)}
            </div>
            <div className="tabs">
                {TABS.map(t => (
                    <button
                        key={t}
                        className={t === tab ? 'tab tab-active' : 'tab'}
                        onClick={() => setTab(t)}
                    >
                        {t}
                    </button>
                ))}
            </div>
            <div className="tab-content">
                {tab === 'run' && <RunTab toolId={tool.id} />}
                {tab === 'setup' && <SetupTab tool={tool} />}
                {tab === 'source' && <SourceTab toolId={tool.id} />}
            </div>
        </div>
    );
}

export default ToolDetail;
