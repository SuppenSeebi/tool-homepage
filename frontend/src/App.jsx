import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CharCounter from './tools/CharCounter';
import PdfMerger from './tools/PdfMerger';

const tools = [
  {
    path: '/CharCounter',
    name: 'Character Counter',
    description: 'Zählt die Anzahl der Zeichen in deinem Text.',
    component: <CharCounter />
  },
  {
    path: '/pdfmerger',
    name: 'PDF Merger',
    description: 'Fügt mehrere PDFs zu einer einzigen Datei zusammen.',
    component: <PdfMerger />
  },
  // ➕ weitere Tools kannst du hier einfach ergänzen
];

function App() {
  return (
    <Router>
      <div style={styles.container}>
        <h1>Meine Tools</h1>
        <Routes>
          <Route
            path="/"
            element={
              <div style={styles.grid}>
                {tools.map((tool) => (
                  <Link to={tool.path} key={tool.path} style={styles.card}>
                    <h2>{tool.name}</h2>
                    <p>{tool.description}</p>
                  </Link>
                ))}
              </div>
            }
          />
          {tools.map((tool) => (
            <Route path={tool.path} element={tool.component} key={tool.path} />
          ))}
        </Routes>
      </div>
    </Router>
  );
}

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'sans-serif',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
  },
  card: {
    display: 'block',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    textDecoration: 'none',
    color: 'black',
    backgroundColor: '#f9f9f9',
    transition: 'transform 0.2s',
  },
};

export default App;
