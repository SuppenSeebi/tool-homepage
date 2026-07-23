import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { API_BASE } from './apiBase';
import ToolDetail from './ToolDetail';
import './App.css';

// Every tool card here comes from GET /app/tools (backend/app/registry.py) - nothing about a
// specific tool is hardcoded on the frontend. Adding a tool is dropping one file into
// backend/app/tools/; this page picks it up automatically on next load.
function ToolCard({ tool }) {
    return (
        <Link to={`/tools/${tool.id}`} className="tool-card">
            <div className="tool-card-header">
                <h2>{tool.name}</h2>
                <span className="lang-badge">{tool.language}</span>
            </div>
            <p className="tool-description">{tool.description}</p>
            <div className="tag-list">
                {tool.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}
            </div>
        </Link>
    );
}

function ToolGrid() {
    const [tools, setTools] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(`${API_BASE}/app/tools`)
            .then(res => {
                if (!res.ok) throw new Error(`Backend returned ${res.status}`);
                return res.json();
            })
            .then(setTools)
            .catch(err => setError(err.message));
    }, []);

    if (error) return <p className="error">Could not load tools: {error}</p>;
    if (tools === null) return <p className="muted">Loading tools...</p>;
    if (tools.length === 0) return <p className="muted">No tools yet.</p>;

    return (
        <div className="tool-grid">
            {tools.map(tool => <ToolCard tool={tool} key={tool.id} />)}
        </div>
    );
}

function App() {
    return (
        <Router>
            <div className="app-container">
                <h1>sschw.dev tools</h1>
                <Routes>
                    <Route path="/" element={<ToolGrid />} />
                    <Route path="/tools/:id" element={<ToolDetail />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
