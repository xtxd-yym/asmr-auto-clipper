import { useState, useRef } from 'react';

interface ModalInfo {
    title: string;
    message: string;
    type: 'success' | 'error';
}

const FrameCapture = () => {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
    const [outputFormat, setOutputFormat] = useState<'png' | 'jpg'>('png');
    const [jpgQuality, setJpgQuality] = useState(95);
    const [modalInfo, setModalInfo] = useState<ModalInfo | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleSelectFile = async () => {
        const file = await window.electronAPI.selectVideoFile();
        if (file) {
            setSelectedFile(file);
            setCapturedFrame(null);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handlePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSeek = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const stepFrame = (direction: 'forward' | 'backward') => {
        if (videoRef.current) {
            const step = 1 / 30;
            const newTime = direction === 'forward'
                ? Math.min(videoRef.current.currentTime + step, duration)
                : Math.max(videoRef.current.currentTime - step, 0);
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const captureFrame = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const quality = outputFormat === 'jpg' ? jpgQuality / 100 : 1;
            const mimeType = outputFormat === 'png' ? 'image/png' : 'image/jpeg';
            const dataUrl = canvas.toDataURL(mimeType, quality);
            setCapturedFrame(dataUrl);
        }
    };

    const downloadFrame = async () => {
        if (!capturedFrame || !selectedFile) return;

        const baseName = selectedFile.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || 'frame';
        const timestamp = formatTime(currentTime).replace(/:/g, '-');
        const suggestedName = `${baseName}_${timestamp}.${outputFormat}`;

        const savePath = await window.electronAPI.selectSavePath(suggestedName);
        if (!savePath) return;

        const response = await fetch(capturedFrame);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        const success = await window.electronAPI.saveFrame(arrayBuffer, savePath);
        if (success) {
            setModalInfo({
                title: '✅ Success!',
                message: `Frame saved successfully to:\n${savePath}`,
                type: 'success'
            });
        } else {
            setModalInfo({
                title: '❌ Error',
                message: 'Failed to save frame',
                type: 'error'
            });
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    return (
        <div className="page-container">
            <h1 className="page-title">📸 Frame Capture</h1>
            <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
                Capture any video frame as a high-quality image
            </p>

            <div className="card">
                <h3>Select Video File</h3>
                <div
                    className={`file-drop-zone ${selectedFile ? 'has-file' : ''}`}
                    onClick={handleSelectFile}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎬</div>
                    <p>{selectedFile ? 'Video loaded!' : 'Click to select a video file'}</p>
                </div>
                {selectedFile && (
                    <div className="file-info">
                        📄 {selectedFile.split(/[\\/]/).pop()}
                    </div>
                )}
            </div>

            {selectedFile && (
                <div className="card">
                    <h3>Video Player</h3>
                    <div style={{ position: 'relative', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                        <video
                            ref={videoRef}
                            src={`file:///${selectedFile.replace(/\\/g, '/')}`}
                            onLoadedMetadata={handleLoadedMetadata}
                            onTimeUpdate={handleTimeUpdate}
                            controls={false}
                            style={{ width: '100%', maxHeight: '500px', display: 'block' }}
                        />
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
                            <button onClick={() => stepFrame('backward')} className="btn" title="Previous Frame">◀️</button>
                            <button onClick={handlePlayPause} className="btn">{isPlaying ? '⏸️ Pause' : '▶️ Play'}</button>
                            <button onClick={() => stepFrame('forward')} className="btn" title="Next Frame">▶️</button>
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                        </div>

                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            step="0.01"
                            value={currentTime}
                            onChange={(e) => handleSeek(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <button
                        onClick={captureFrame}
                        className="btn btn-primary"
                        style={{ marginTop: '1rem', width: '100%', fontSize: '1.1rem' }}
                    >
                        📸 Capture Current Frame
                    </button>
                </div>
            )}

            {capturedFrame && (
                <div className="card">
                    <h3>Captured Frame</h3>

                    <div style={{ backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                        <img src={capturedFrame} alt="Captured frame" style={{ width: '100%', display: 'block' }} />
                    </div>

                    <div className="form-group">
                        <label>Output Format</label>
                        <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as 'png' | 'jpg')}>
                            <option value="png">PNG - Lossless (larger file)</option>
                            <option value="jpg">JPG - Lossy (smaller file)</option>
                        </select>
                    </div>

                    {outputFormat === 'jpg' && (
                        <div className="form-group">
                            <label>JPG Quality: {jpgQuality}%</label>
                            <input
                                type="range"
                                min="60"
                                max="100"
                                value={jpgQuality}
                                onChange={(e) => setJpgQuality(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={captureFrame} className="btn" style={{ flex: 1 }}>🔄 Recapture</button>
                        <button onClick={downloadFrame} className="btn btn-primary" style={{ flex: 2 }}>💾 Save Frame</button>
                    </div>
                </div>
            )}

            {/* Custom Modal */}
            {modalInfo && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(4px)'
                    }}
                    onClick={() => setModalInfo(null)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '20px',
                            padding: '2rem',
                            maxWidth: '500px',
                            width: '90%',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                            animation: 'modalSlideIn 0.3s ease-out'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{
                            margin: '0 0 1rem 0',
                            fontSize: '1.5rem',
                            color: modalInfo.type === 'success' ? '#10b981' : '#ef4444'
                        }}>
                            {modalInfo.title}
                        </h2>
                        <p style={{
                            margin: '0 0 1.5rem 0',
                            color: '#666',
                            whiteSpace: 'pre-line',
                            lineHeight: '1.6',
                            fontSize: '0.95rem'
                        }}>
                            {modalInfo.message}
                        </p>
                        <button
                            onClick={() => setModalInfo(null)}
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                background: modalInfo.type === 'success'
                                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
};

export default FrameCapture;
