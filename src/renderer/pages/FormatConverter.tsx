import { useState, useEffect } from 'react';

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
        if (file) {
            setSelectedFile(file);

            // 智能设置默认输出格式
            const ext = file.split('.').pop()?.toLowerCase() || '';
            const audioFormats = ['mp3', 'aac', 'm4a', 'wav', 'flac', 'ogg', 'opus', 'wma'];
            const isInputAudio = audioFormats.includes(ext);

            // 如果是音频文件，默认转MP3；如果是视频，默认转MP4
            setOutputFormat(isInputAudio ? 'mp3' : 'mp4');
        }
    };

    // 根据输入文件类型获取可用的输出格式
    const getAvailableFormats = () => {
        if (!selectedFile) {
            // 未选择文件时显示所有格式
            return {
                audio: ['mp3', 'aac', 'm4a', 'wav', 'flac', 'ogg', 'opus', 'wma'],
                video: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv']
            };
        }

        const ext = selectedFile.split('.').pop()?.toLowerCase() || '';
        const audioFormats = ['mp3', 'aac', 'm4a', 'wav', 'flac', 'ogg', 'opus', 'wma'];
        const videoFormats = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'mpeg', 'mpg'];

        const isInputAudio = audioFormats.includes(ext);
        const isInputVideo = videoFormats.includes(ext);

        if (isInputAudio) {
            // 音频文件：可以转换为其他音频格式或视频容器（纯音频）
            return {
                audio: audioFormats.filter(f => f !== ext), // 排除自身格式
                video: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv']
            };
        } else if (isInputVideo) {
            // 视频文件：可以转换为音频（提取音轨）或其他视频格式
            return {
                audio: audioFormats,
                video: videoFormats.filter(f => f !== ext)
            };
        }

        // 未知格式：显示所有选项
        return {
            audio: audioFormats,
            video: videoFormats
        };
    };

    const availableFormats = getAvailableFormats();

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
                        {availableFormats.audio.length > 0 && (
                            <optgroup label="🎵 Audio Formats">
                                {availableFormats.audio.map(format => {
                                    const labels: Record<string, string> = {
                                        mp3: 'MP3 - Most Compatible',
                                        aac: 'AAC - High Quality',
                                        m4a: 'M4A - Apple Devices',
                                        wav: 'WAV - Lossless',
                                        flac: 'FLAC - Compressed Lossless',
                                        ogg: 'OGG - Open Source',
                                        opus: 'OPUS - Modern Codec',
                                        wma: 'WMA - Windows Media'
                                    };

                                    // 如果是视频转音频，添加提示
                                    const ext = selectedFile?.split('.').pop()?.toLowerCase() || '';
                                    const videoFormats = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'mpeg', 'mpg'];
                                    const isVideoToAudio = videoFormats.includes(ext);
                                    const suffix = isVideoToAudio ? ' (Extract Audio)' : '';

                                    return (
                                        <option key={format} value={format}>
                                            {labels[format] || format.toUpperCase()}{suffix}
                                        </option>
                                    );
                                })}
                            </optgroup>
                        )}
                        {availableFormats.video.length > 0 && (
                            <optgroup label="🎬 Video Formats">
                                {availableFormats.video.map(format => {
                                    const labels: Record<string, string> = {
                                        mp4: 'MP4 - Most Compatible',
                                        mov: 'MOV - Apple QuickTime',
                                        avi: 'AVI - Windows Classic',
                                        mkv: 'MKV - High Quality',
                                        webm: 'WebM - Web Optimized',
                                        flv: 'FLV - Flash Video'
                                    };

                                    // 如果是音频转视频，添加提示
                                    const ext = selectedFile?.split('.').pop()?.toLowerCase() || '';
                                    const audioFormats = ['mp3', 'aac', 'm4a', 'wav', 'flac', 'ogg', 'opus', 'wma'];
                                    const isAudioToVideo = audioFormats.includes(ext);
                                    const suffix = isAudioToVideo ? ' (Audio-only)' : '';

                                    return (
                                        <option key={format} value={format}>
                                            {labels[format] || format.toUpperCase()}{suffix}
                                        </option>
                                    );
                                })}
                            </optgroup>
                        )}
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
