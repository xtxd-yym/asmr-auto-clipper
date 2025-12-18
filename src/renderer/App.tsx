import { useState, useEffect } from 'react';
import './App.css';

declare global {
    interface Window {
        electronAPI: {
            selectFile: () => Promise<string | null>;
            startProcessing: (config: any) => Promise<any>;
            getProgress: () => Promise<any>;
        };
    }
}

function App() {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [mode, setMode] = useState<'licking' | 'talking' | 'sleep'>('licking');
    const [threshold, setThreshold] = useState(0.0001);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({ stage: '', percentage: 0 });
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        let interval: any;
        if (processing) {
            interval = setInterval(async () => {
                const prog = await window.electronAPI.getProgress();
                setProgress(prog);
            }, 500);
        }
        return () => clearInterval(interval);
    }, [processing]);

    const handleSelectFile = async () => {
        const file = await window.electronAPI.selectFile();
        if (file) setSelectedFile(file);
    };

    const handleStart = async () => {
        if (!selectedFile) return;

        setProcessing(true);
        setResult(null);

        try {
            const res = await window.electronAPI.startProcessing({
                inputPath: selectedFile,
                mode,
                threshold,
            });

            if (res.success) {
                setResult(res.data);
            } else {
                alert('Error: ' + res.error);
            }
        } catch (error: any) {
            alert('Processing failed: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="app">
            <header>
                <h1>🎧 ASMR Auto-Clipper</h1>
                <p>AI-Powered Desktop Tool</p>
            </header>

            <main>
                <div className="card">
                    <h2>1. Select Video</h2>
                    <button onClick={handleSelectFile} className="btn-primary">
                        📁 Browse File
                    </button>
                    {selectedFile && (
                        <div className="file-info">
                            <span>✓ {selectedFile.split('\\').pop()}</span>
                        </div>
                    )}
                </div>

                <div className="card">
                    <h2>2. Configuration</h2>
                    <div className="config-group">
                        <label>Mode:</label>
                        <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
                            <option value="licking">👅 Licking/Wet Sounds</option>
                            <option value="talking">💬 Talking/Whispering</option>
                            <option value="sleep">😴 Sleep Sounds</option>
                        </select>
                    </div>
                    <div className="config-group">
                        <label>Threshold: {threshold.toFixed(4)}</label>
                        <input
                            type="range"
                            min="0.00001"
                            max="0.01"
                            step="0.00001"
                            value={threshold}
                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        />
                        <small>Lower = more sensitive (may include noise)</small>
                    </div>
                </div>

                <div className="card">
                    <button
                        onClick={handleStart}
                        disabled={!selectedFile || processing}
                        className="btn-start"
                    >
                        {processing ? '⏳ Processing...' : '🚀 Start Processing'}
                    </button>

                    {processing && (
                        <div className="progress">
                            <div className="progress-bar" style={{ width: `${progress.percentage}%` }}></div>
                            <span>{progress.stage} - {progress.percentage}%</span>
                        </div>
                    )}

                    {result && (
                        <div className="result">
                            <h3>✅ Processing Complete!</h3>
                            <p>Output: <code>{result.outputPath}</code></p>
                            <p>Kept: {result.keptCount} / {result.totalChunks} chunks</p>
                            <div className="result-folders">
                                <p>📁 Review results in:</p>
                                <ul>
                                    <li><code>ai_tool/kept/</code> - Selected segments</li>
                                    <li><code>ai_tool/discarded/</code> - Rejected segments</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer>
                <p>Made in Electron | YAMNet AI Model</p>
            </footer>
        </div>
    );
}

export default App;
