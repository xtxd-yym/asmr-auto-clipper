import { useState, useEffect } from 'react';

declare global {
    interface Window {
        electronAPI: {
            selectFile: () => Promise<string | null>;
            convertFormat: (config: any) => Promise<any>;
            getConverterProgress: () => Promise<any>;
        };
    }
}

const FormatConverter = () => {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [outputFormat, setOutputFormat] = useState('mp3');
    const [quality, setQuality] = useState(192);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({ stage: '', percentage: 0 });
    const [result, setResult] = useState<any>(null);

    // 轮询进度更新
    useEffect(() => {
        let interval: any;
        if (processing) {
            interval = setInterval(async () => {
                const prog = await window.electronAPI.getConverterProgress();
                setProgress(prog);
            }, 500);
        }
        return () => clearInterval(interval);
    }, [processing]);

    const handleSelectFile = async () => {
        const file = await window.electronAPI.selectFile();
        if (file) setSelectedFile(file);
    };

    const handleConvert = async () => {
        if (!selectedFile) return;

        setProcessing(true);
        setResult(null);
        setProgress({ stage: 'Initializing', percentage: 0 });

        try {
            const res = await window.electronAPI.convertFormat({
                inputPath: selectedFile,
                outputFormat,
                quality,
            });

            if (res.success) {
                setResult(res.data);
            } else {
                alert('Error: ' + res.error);
            }
        } catch (error: any) {
            alert('Conversion failed: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="page-container">
            <h1 className="page-title">📁 Format Converter</h1>

            <div className="card">
                <h3>Select File</h3>
                <div
                    className={`file-drop-zone ${selectedFile ? 'has-file' : ''}`}
                    onClick={handleSelectFile}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
                    <p>
                        {selectedFile
                            ? 'File selected!'
                            : 'Click to select a video or audio file'}
                    </p>
                </div>
                {selectedFile && (
                    <div className="file-info">
                        📄 {selectedFile.split(/[\\/]/).pop()}
                    </div>
                )}
            </div>

            <div className="card">
                <h3>Output Settings</h3>
                <div className="form-group">
                    <label>Output Format</label>
                    <select
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value)}
                        disabled={processing}
                    >
                        <option value="mp3">MP3 (Audio)</option>
                        <option value="aac">AAC (Audio)</option>
                        <option value="wav">WAV (Audio)</option>
                        <option value="flac">FLAC (Audio)</option>
                        <option value="mp4">MP4 (Video)</option>
                        <option value="avi">AVI (Video)</option>
                        <option value="mkv">MKV (Video)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>
                        Quality: {quality} kbps
                    </label>
                    <input
                        type="range"
                        min="128"
                        max="320"
                        step="32"
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        disabled={processing}
                    />
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleConvert}
                    disabled={!selectedFile || processing}
                >
                    {processing ? '⏳ Converting...' : '🚀 Start Conversion'}
                </button>
            </div>

            {processing && (
                <div className="card">
                    <h3>Progress</h3>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress.percentage}%` }}
                        ></div>
                    </div>
                    <div className="progress-text">
                        {progress.stage} - {progress.percentage}%
                    </div>
                </div>
            )}

            {result && (
                <div className="result-card">
                    <h4>✅ Conversion Complete!</h4>
                    <ul>
                        <li>📂 Output: {result.outputPath}</li>
                        <li>⏱️ Duration: {result.duration || 'N/A'}</li>
                        <li>💾 Size: {result.size || 'N/A'}</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default FormatConverter;
