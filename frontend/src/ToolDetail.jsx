import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE } from './apiBase';

const TABS = ['run', 'setup', 'source'];

// FastAPI/Pydantic validation errors (422s - wrong request shape entirely, e.g. a missing
// field) put an *array* of {loc, msg, ...} objects in `detail`, not a string - our own
// HTTPException calls (e.g. json_formatter's "invalid JSON" error) put a plain string there.
// Naively doing `new Error(detail)` on the array form stringifies each object to
// "[object Object]", which is what actually happened here - not a problem with the input.
function formatErrorDetail(detail) {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return detail
            .map(d => {
                if (typeof d === 'string') return d;
                const loc = Array.isArray(d?.loc) ? d.loc.filter(part => part !== 'body').join('.') : '';
                const msg = d?.msg ?? JSON.stringify(d);
                return loc ? `${loc}: ${msg}` : msg;
            })
            .join('\n');
    }
    return JSON.stringify(detail);
}

// A tool whose whole result is one string (e.g. json-formatter's {"formatted": "..."}) wants
// that string shown as-is, with real line breaks - not re-escaped into a literal "\n" inside a
// JSON.stringify'd wrapper, which is what happened here (the formatted JSON was already
// correct, only the *display* of it wasn't). Purely structural, no field-name convention
// imposed on tool authors: any single-key object whose one value is a string renders as that
// raw string; anything with more structure still renders as pretty-printed JSON, same as before.
function renderOutput(output) {
    const keys = Object.keys(output);
    if (keys.length === 1 && typeof output[keys[0]] === 'string') {
        return output[keys[0]];
    }
    return JSON.stringify(output, null, 2);
}

// Every tool shares the exact same contract (POST /run, JSON in, JSON out - see
// backend/app/registry.py), so this one generic form works for any tool with zero per-tool
// frontend code. A tool wanting a friendlier field-by-field form is a future enhancement, not
// something every new tool has to earn by also writing its own frontend page.
//
// `example` (from the tool's registry metadata, required per-tool - see registry.py) pre-fills
// the input with a working request body, since the generic form has no other way to convey a
// given tool's expected shape (e.g. json-formatter needs {"text": "..."}, not the JSON object
// to format directly - there'd be nothing left to validate if it were already parsed).
function RunTab({ toolId, example }) {
    const [input, setInput] = useState(() =>
        example !== undefined ? JSON.stringify(example, null, 2) : '{\n  \n}'
    );
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
            if (!res.ok) throw new Error(data.detail ? formatErrorDetail(data.detail) : `HTTP ${res.status}`);
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
            {output && <pre className="output">{renderOutput(output)}</pre>}
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
                {tab === 'run' && <RunTab toolId={tool.id} example={tool.example} />}
                {tab === 'setup' && <SetupTab tool={tool} />}
                {tab === 'source' && <SourceTab toolId={tool.id} />}
            </div>
        </div>
    );
}

export default ToolDetail;
