import { useState, useEffect } from 'react';

interface AudioMetadata {
    title?: string;
    artist?: string;
    album?: string;
    albumArtist?: string;
    year?: string;
    track?: string;
    genre?: string;
    comment?: string;
    coverArt?: string; // Base64 data URL
}

interface ModalInfo {
    title: string;
    message: string;
    type: 'success' | 'error';
}

const MetadataEditor = () => {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<AudioMetadata>({});
    const [originalMetadata, setOriginalMetadata] = useState<AudioMetadata>({});
    const [isLoading, setIsLoading] = useState(false);
    const [modalInfo, setModalInfo] = useState<ModalInfo | null>(null);

    const handleSelectFile = async () => {
        const file = await window.electronAPI.selectAudioFile();
        if (file) {
            setSelectedFile(file);
            loadMetadata(file);
        }
    };

    const loadMetadata = async (filePath: string) => {
        setIsLoading(true);
        try {
            const data = await window.electronAPI.readMetadata(filePath);
            setMetadata(data);
            setOriginalMetadata(data);
        } catch (error) {
            setModalInfo({
                title: '❌ Error',
                message: 'Failed to read metadata from file',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCoverUpload = async () => {
        const imagePath = await window.electronAPI.selectImageFile();
        if (imagePath) {
            // Read image as base64
            const imageData = await window.electronAPI.readImageAsBase64(imagePath);
            setMetadata({ ...metadata, coverArt: imageData });
        }
    };

    const handleMetadataChange = (field: keyof AudioMetadata, value: string) => {
        setMetadata({ ...metadata, [field]: value });
    };

    const handleSave = async () => {
        if (!selectedFile) return;

        setIsLoading(true);
        try {
            await window.electronAPI.writeMetadata(selectedFile, metadata);
            setOriginalMetadata(metadata);
            setModalInfo({
                title: '✅ Success!',
                message: `Metadata saved successfully to:\n${selectedFile.split(/[\\/]/).pop()}`,
                type: 'success'
            });
        } catch (error: any) {
            setModalInfo({
                title: '❌ Error',
                message: `Failed to save metadata: ${error.message || 'Unknown error'}`,
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setMetadata(originalMetadata);
    };

    const hasChanges = JSON.stringify(metadata) !== JSON.stringify(originalMetadata);

    return (
        <div className="page-container">
            <h1 className="page-title">🏷️ Metadata Editor</h1>
            <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
                Edit audio file metadata (tags and cover art)
            </p>

            <div className="card">
                <h3>Select Audio File</h3>
                <div
                    className={`file-drop-zone ${selectedFile ? 'has-file' : ''}`}
                    onClick={handleSelectFile}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎵</div>
                    <p>{selectedFile ? 'Audio file loaded!' : 'Click to select an audio file'}</p>
                </div>
                {selectedFile && (
                    <div className="file-info">
                        📄 {selectedFile.split(/[\\/]/).pop()}
                    </div>
                )}
            </div>

            {selectedFile && !isLoading && (
                <>
                    <div className="card">
                        <h3>Cover Art</h3>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <div style={{
                                width: '200px',
                                height: '200px',
                                backgroundColor: '#f0f0f0',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #e0e0e0'
                            }}>
                                {metadata.coverArt ? (
                                    <img
                                        src={metadata.coverArt}
                                        alt="Cover Art"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '3rem', opacity: 0.3 }}>🎨</span>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <button onClick={handleCoverUpload} className="btn" style={{ marginBottom: '0.5rem' }}>
                                    📁 Upload Cover Art
                                </button>
                                {metadata.coverArt && (
                                    <button
                                        onClick={() => setMetadata({ ...metadata, coverArt: undefined })}
                                        className="btn"
                                        style={{ marginLeft: '0.5rem' }}
                                    >
                                        🗑️ Remove Cover
                                    </button>
                                )}
                                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                                    Supported formats: JPG, PNG
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3>Metadata Tags</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={metadata.title || ''}
                                    onChange={(e) => handleMetadataChange('title', e.target.value)}
                                    placeholder="Song title"
                                />
                            </div>

                            <div className="form-group">
                                <label>Artist</label>
                                <input
                                    type="text"
                                    value={metadata.artist || ''}
                                    onChange={(e) => handleMetadataChange('artist', e.target.value)}
                                    placeholder="Artist name"
                                />
                            </div>

                            <div className="form-group">
                                <label>Album</label>
                                <input
                                    type="text"
                                    value={metadata.album || ''}
                                    onChange={(e) => handleMetadataChange('album', e.target.value)}
                                    placeholder="Album name"
                                />
                            </div>

                            <div className="form-group">
                                <label>Album Artist</label>
                                <input
                                    type="text"
                                    value={metadata.albumArtist || ''}
                                    onChange={(e) => handleMetadataChange('albumArtist', e.target.value)}
                                    placeholder="Album artist"
                                />
                            </div>

                            <div className="form-group">
                                <label>Year</label>
                                <input
                                    type="text"
                                    value={metadata.year || ''}
                                    onChange={(e) => handleMetadataChange('year', e.target.value)}
                                    placeholder="Release year"
                                />
                            </div>

                            <div className="form-group">
                                <label>Track</label>
                                <input
                                    type="text"
                                    value={metadata.track || ''}
                                    onChange={(e) => handleMetadataChange('track', e.target.value)}
                                    placeholder="Track number"
                                />
                            </div>

                            <div className="form-group">
                                <label>Genre</label>
                                <input
                                    type="text"
                                    value={metadata.genre || ''}
                                    onChange={(e) => handleMetadataChange('genre', e.target.value)}
                                    placeholder="Music genre"
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label>Comment</label>
                            <textarea
                                value={metadata.comment || ''}
                                onChange={(e) => handleMetadataChange('comment', e.target.value)}
                                placeholder="Additional comments"
                                rows={3}
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                            <button
                                onClick={handleReset}
                                className="btn"
                                disabled={!hasChanges}
                                style={{ flex: 1 }}
                            >
                                🔄 Reset
                            </button>
                            <button
                                onClick={handleSave}
                                className="btn btn-primary"
                                disabled={!hasChanges}
                                style={{ flex: 2 }}
                            >
                                💾 Save Metadata
                            </button>
                        </div>
                    </div>
                </>
            )}

            {isLoading && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                    <p>Loading metadata...</p>
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
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
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
                            lineHeight: '1.6'
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

export default MetadataEditor;
