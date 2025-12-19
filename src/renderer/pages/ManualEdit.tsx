import { useState, useRef, useEffect } from 'react';

interface Clip {
    id: string;
    startTime: number;
    endTime: number;
    duration: number;
}

interface ModalInfo {
    title: string;
    message: string;
    type: 'success' | 'error';
}

const ManualEdit = () => {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [clips, setClips] = useState<Clip[]>([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [trimStart, setTrimStart] = useState(0);
    const [trimEnd, setTrimEnd] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [modalInfo, setModalInfo] = useState<ModalInfo | null>(null);

    const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

    const handleSelectFile = async () => {
        const file = await window.electronAPI.selectFile();
        if (file) {
            setSelectedFile(file);
            setClips([]);
            setTrimStart(0);
            setTrimEnd(0);

            // Get accurate duration using ffprobe
            try {
                const dur = await window.electronAPI.getMediaDuration(file);
                setDuration(dur);
                setTrimEnd(dur);
            } catch (error) {
                console.error('[ManualEdit] Failed to get duration:', error);
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (mediaRef.current) {
            // Ensure playback rate is normal speed
            if (mediaRef.current.playbackRate !== 1.0) {
                mediaRef.current.playbackRate = 1.0;
            }
        }
    };

    const handleTimeUpdate = () => {
        if (mediaRef.current) {
            // Ensure playback rate stays at normal speed
            if (mediaRef.current.playbackRate !== 1.0) {
                mediaRef.current.playbackRate = 1.0;
            }

            setCurrentTime(mediaRef.current.currentTime);
        }
    };

    const handlePlayPause = () => {
        if (mediaRef.current) {
            if (isPlaying) {
                mediaRef.current.pause();
            } else {
                mediaRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSeek = (time: number) => {
        if (mediaRef.current) {
            mediaRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const setStartHere = () => {
        setTrimStart(currentTime);
    };

    const setEndHere = () => {
        setTrimEnd(currentTime);
    };

    const addClip = () => {
        if (trimStart >= trimEnd) {
            alert('Start time must be before end time!');
            return;
        }

        const newClip: Clip = {
            id: Date.now().toString(),
            startTime: trimStart,
            endTime: trimEnd,
            duration: trimEnd - trimStart
        };

        setClips([...clips, newClip]);
    };

    const removeClip = (id: string) => {
        setClips(clips.filter(c => c.id !== id));
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const handleExport = async () => {
        if (clips.length === 0) {
            alert('Please add at least one clip!');
            return;
        }

        if (!selectedFile) return;

        setProcessing(true);
        try {
            const inputExt = selectedFile.split('.').pop() || 'mp4';
            const inputBasename = selectedFile.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || 'output';
            const timestamp = Date.now();

            // Step 1: Trim each clip
            console.log(`[Export] Trimming ${clips.length} clips...`);
            const trimmedPaths: string[] = [];

            for (let i = 0; i < clips.length; i++) {
                const clip = clips[i];
                const tempPath = `${inputBasename}_clip${i + 1}_${timestamp}.${inputExt}`;

                console.log(`[Export] Trimming clip ${i + 1}/${clips.length}...`);

                const trimResult = await window.electronAPI.trimMedia({
                    inputPath: selectedFile,
                    outputPath: tempPath,
                    startTime: clip.startTime,
                    endTime: clip.endTime,
                    lossless: true // Use fast mode for temp clips
                });

                if (trimResult.success) {
                    trimmedPaths.push(trimResult.data.outputPath);
                } else {
                    throw new Error(`Failed to trim clip ${i + 1}: ${trimResult.error}`);
                }
            }

            // Step 2: Concatenate all clips
            console.log(`[Export] Concatenating ${trimmedPaths.length} clips...`);
            const finalOutput = `${inputBasename}_edited_${timestamp}.${inputExt}`;

            const concatResult = await window.electronAPI.concatMedia({
                inputPaths: trimmedPaths,
                outputPath: finalOutput,
                outputFormat: inputExt
            });

            if (concatResult.success) {
                setModalInfo({
                    title: '✅ Export Complete!',
                    message: `Output: ${concatResult.data.outputPath}\n\nTotal clips: ${clips.length}\nDuration: ${formatTime(totalDuration)}`,
                    type: 'success'
                });
            } else {
                throw new Error(`Concatenation failed: ${concatResult.error}`);
            }

        } catch (error: any) {
            setModalInfo({
                title: '❌ Export Failed',
                message: error.message,
                type: 'error'
            });
            console.error('[Export] Error:', error);
        } finally {
            setProcessing(false);
        }
    };

    const isVideo = selectedFile?.match(/\.(mp4|mov|avi|mkv|webm|flv)$/i);
    const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);

    return (
        <div className="page-container">
            <h1 className="page-title">✂️ Manual Edit</h1>

            {/* File Selection */}
            <div className="card">
                <h3>Select Media File</h3>
                <div
                    className={`file-drop-zone ${selectedFile ? 'has-file' : ''}`}
                    onClick={handleSelectFile}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎬</div>
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

            {/* Media Player */}
            {selectedFile && (
                <div className="card">
                    <h3>Preview</h3>
                    <div className="media-player">
                        {isVideo ? (
                            <video
                                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                                src={selectedFile ? `file:///${selectedFile.replace(/\\/g, '/')}` : ''}
                                onLoadedMetadata={handleLoadedMetadata}
                                onTimeUpdate={handleTimeUpdate}
                                controls={false}
                                style={{ width: '100%', maxHeight: '400px', backgroundColor: '#000' }}
                            />
                        ) : (
                            <audio
                                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                                src={selectedFile ? `file:///${selectedFile.replace(/\\/g, '/')}` : ''}
                                onLoadedMetadata={handleLoadedMetadata}
                                onTimeUpdate={handleTimeUpdate}
                                controls={false}
                                style={{ width: '100%' }}
                            />
                        )}

                        <div className="player-controls" style={{ marginTop: '1rem' }}>
                            <button onClick={handlePlayPause} className="btn">
                                {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                            </button>
                            <span style={{ margin: '0 1rem' }}>
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ marginTop: '1rem' }}>
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
                    </div>
                </div>
            )}

            {/* Trim Controls */}
            {selectedFile && (
                <div className="card">
                    <h3>Trim Selection</h3>
                    <div className="trim-controls">
                        <div className="form-group">
                            <label>Start Time: {formatTime(trimStart)}</label>
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                step="0.01"
                                value={trimStart}
                                onChange={(e) => setTrimStart(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                            <button onClick={setStartHere} className="btn" style={{ marginTop: '0.5rem' }}>
                                📍 Set Start Here
                            </button>
                        </div>

                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label>End Time: {formatTime(trimEnd)}</label>
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                step="0.01"
                                value={trimEnd}
                                onChange={(e) => setTrimEnd(Number(e.target.value))}
                                style={{ width: '100%' }}
                            />
                            <button onClick={setEndHere} className="btn" style={{ marginTop: '0.5rem' }}>
                                📍 Set End Here
                            </button>
                        </div>

                        <div style={{ marginTop: '1rem' }}>
                            <strong>Selection Duration: {formatTime(trimEnd - trimStart)}</strong>
                        </div>

                        <button
                            onClick={addClip}
                            className="btn btn-primary"
                            style={{ marginTop: '1rem', width: '100%' }}
                        >
                            ➕ Add Clip to List
                        </button>
                    </div>
                </div>
            )}

            {/* Clips List */}
            {clips.length > 0 && (
                <div className="card">
                    <h3>Clips ({clips.length})</h3>
                    <div className="clips-list">
                        {clips.map((clip, index) => (
                            <div key={clip.id} className="clip-item" style={{
                                padding: '0.75rem',
                                marginBottom: '0.5rem',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <strong>Clip {index + 1}</strong>
                                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                                        {formatTime(clip.startTime)} → {formatTime(clip.endTime)}
                                        <span style={{ marginLeft: '1rem' }}>
                                            Duration: {formatTime(clip.duration)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeClip(clip.id)}
                                    className="btn"
                                    style={{ backgroundColor: '#ff4444' }}
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(100,200,100,0.1)', borderRadius: '8px' }}>
                        <strong>Total Output Duration: {formatTime(totalDuration)}</strong>
                    </div>

                    <button
                        onClick={handleExport}
                        className="btn btn-primary"
                        disabled={processing}
                        style={{ marginTop: '1rem', width: '100%', fontSize: '1.1rem' }}
                    >
                        {processing ? '⏳ Exporting...' : '💾 Export Merged Video'}
                    </button>
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
        </div>
    );
};

export default ManualEdit;
