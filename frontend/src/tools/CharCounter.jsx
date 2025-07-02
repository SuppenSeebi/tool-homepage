import { useState } from 'react';

function CharCounter() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);

  const handleCount = async () => {
    const response = await fetch('http://backend:8000/api/charcounter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    setResult(data);
  };

  return (
    <div style={styles.container}>
      <h2>Character Counter Tool</h2>
      <textarea
        style={styles.textarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Gib hier deinen Text ein..."
      />
      <button style={styles.button} onClick={handleCount}>Count</button>

      {result && (
        <div style={styles.result}>
          <p><strong>Anzahl Bytes:</strong> {result.byte_count}</p>
          <p><strong>Anzahl ASCII Zeichen:</strong> {result.ascii_count}</p>
          <p><strong>Anzahl UTF-8 Zeichen:</strong> {result.utf_count}</p>
          <p><strong>ASCII Buchstaben:</strong> {result.ascii_letters}</p>
          <p><strong>ASCII Zahlen:</strong> {result.ascii_digits}</p>
          <p><strong>ASCII Sonderzeichen:</strong> {result.ascii_special}</p>
          <p><strong>Kodierung:</strong> {result.encoding}</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'sans-serif',
  },
  textarea: {
    width: '100%',
    height: '200px',
    marginBottom: '10px',
    fontSize: '16px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
  },
  result: {
    marginTop: '20px',
    background: '#f3f3f3',
    padding: '15px',
    borderRadius: '8px',
  }
};

export default CharCounter;
