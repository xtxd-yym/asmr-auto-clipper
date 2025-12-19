import * as path from 'path';
import * as fs from 'fs';
import ffmpegModule from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

const ffmpeg = ffmpegModule as any;
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export interface ConvertConfig {
    inputPath: string;
    outputFormat: string;
    quality: number;
}

let currentProgress = {
    stage: '',
    percentage: 0,
    total: 100,
};

function updateProgress(stage: string, percentage: number, total: number) {
    currentProgress = { stage, percentage, total };
    console.log('[Progress Updated]', JSON.stringify(currentProgress));
}

export function getConverterProgress() {
    return { ...currentProgress };
}

export async function convertFormat(config: ConvertConfig): Promise<{ outputPath: string }> {
    const { inputPath, outputFormat, quality } = config;

    console.log('[Converter] Starting conversion');

    const projectRoot = process.cwd();
    const inputFile = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(projectRoot, `${inputFile}.${outputFormat}`);

    updateProgress('Starting', 0, 100);

    // 使用ffprobe获取视频总时长
    let totalDurationSeconds = 0;

    try {
        totalDurationSeconds = await new Promise<number>((resolve, reject) => {
            ffmpeg.ffprobe(inputPath, (err: Error, metadata: any) => {
                if (err) {
                    console.warn('[Converter] Failed to get duration via ffprobe:', err.message);
                    reject(err);
                } else {
                    const duration = metadata.format.duration;
                    console.log(`[Converter] Video duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s (${duration}s total)`);
                    resolve(duration);
                }
            });
        });
    } catch (error) {
        console.warn('[Converter] Could not determine video duration, progress will be estimated');
    }

    return new Promise((resolve, reject) => {
        try {
            const command = ffmpeg(inputPath);

            // 检测输入文件是否有视频流
            const inputExt = path.extname(inputPath).toLowerCase().slice(1);
            const audioOnlyFormats = ['mp3', 'aac', 'wav', 'flac', 'm4a', 'ogg', 'opus', 'wma'];
            const isInputAudioOnly = audioOnlyFormats.includes(inputExt);
            const isOutputAudioOnly = audioOnlyFormats.includes(outputFormat);

            // 根据格式设置参数
            if (isOutputAudioOnly) {
                // 输出纯音频格式
                command.noVideo();

                switch (outputFormat) {
                    case 'mp3':
                        command.audioCodec('libmp3lame');
                        command.audioBitrate(quality);
                        break;
                    case 'aac':
                        command.audioCodec('aac');
                        command.audioBitrate(quality);
                        break;
                    case 'm4a':
                        command.audioCodec('aac');
                        command.audioBitrate(quality);
                        command.outputOptions(['-f', 'ipod']); // M4A container
                        break;
                    case 'wav':
                        command.audioCodec('pcm_s16le');
                        command.audioFrequency(44100);
                        break;
                    case 'flac':
                        command.audioCodec('flac');
                        command.audioQuality(5); // 压缩等级
                        break;
                    case 'ogg':
                        command.audioCodec('libvorbis');
                        command.audioBitrate(quality);
                        break;
                    case 'opus':
                        command.audioCodec('libopus');
                        command.audioBitrate(quality);
                        break;
                    case 'wma':
                        command.audioCodec('wmav2');
                        command.audioBitrate(quality);
                        break;
                }
            } else if (isInputAudioOnly && !isOutputAudioOnly) {
                // 音频转视频容器（如MP3→MP4）：创建纯音频MP4
                console.log('[Converter] Converting audio to video container (audio-only)');
                command.noVideo(); // 不添加视频流

                switch (outputFormat) {
                    case 'mp4':
                    case 'mov':
                        command.audioCodec('aac');
                        command.audioBitrate(quality);
                        break;
                    case 'avi':
                        command.audioCodec('mp3');
                        command.audioBitrate(quality);
                        break;
                    case 'mkv':
                        command.audioCodec('aac');
                        command.audioBitrate(quality);
                        break;
                    case 'webm':
                        command.audioCodec('libopus');
                        command.audioBitrate(quality);
                        break;
                    case 'flv':
                        command.audioCodec('mp3');
                        command.audioBitrate(quality);
                        break;
                }
            } else {
                // 视频转视频：保留视频流,转换音频
                console.log('[Converter] Converting video format');

                switch (outputFormat) {
                    case 'mp4':
                        command.videoCodec('libx264');
                        command.audioCodec('aac');
                        command.audioBitrate(quality);
                        command.outputOptions([
                            '-preset', 'fast',
                            '-crf', '23'
                        ]);
                        break;
                    case 'mov':
                        command.videoCodec('libx264');
                        command.audioCodec('aac');
                        command.audioBitrate(quality);
                        break;
                    case 'avi':
                        command.videoCodec('mpeg4');
                        command.audioCodec('mp3');
                        command.audioBitrate(quality);
                        break;
                    case 'mkv':
                        command.videoCodec('libx264');
                        command.audioCodec('aac');
                        command.audioBitrate(quality);
                        break;
                    case 'webm':
                        command.videoCodec('libvpx-vp9');
                        command.audioCodec('libopus');
                        command.audioBitrate(quality);
                        command.outputOptions([
                            '-crf', '30',
                            '-b:v', '0'
                        ]);
                        break;
                    case 'flv':
                        command.videoCodec('flv');
                        command.audioCodec('mp3');
                        command.audioBitrate(quality);
                        break;
                }
            }

            command
                .output(outputPath)
                .on('start', () => {
                    console.log('[Converter] FFmpeg started');
                    updateProgress('Converting', 1, 100);
                })
                .on('progress', (progress: any) => {
                    if (totalDurationSeconds > 0 && progress.timemark) {
                        // 解析timemark格式：HH:MM:SS.ms
                        const timeMatch = progress.timemark.match(/(\d+):(\d+):(\d+)/);
                        if (timeMatch) {
                            const hours = parseInt(timeMatch[1]);
                            const minutes = parseInt(timeMatch[2]);
                            const seconds = parseInt(timeMatch[3]);
                            const currentSeconds = hours * 3600 + minutes * 60 + seconds;

                            // 使用真实的视频时长计算进度
                            const percent = Math.min(99, Math.max(1, Math.floor((currentSeconds / totalDurationSeconds) * 100)));

                            console.log(`[Converter] ${progress.timemark} / ${Math.floor(totalDurationSeconds / 60)}m${Math.floor(totalDurationSeconds % 60)}s - ${percent}%`);
                            updateProgress('Converting', percent, 100);
                        }
                    } else {
                        // 如果无法获取时长，至少显示timemark让用户知道在进行中
                        if (progress.timemark) {
                            console.log(`[Converter] Processing: ${progress.timemark}`);
                        }
                    }
                })
                .on('end', () => {
                    console.log('[Converter] Complete!');
                    updateProgress('Complete', 100, 100);
                    resolve({ outputPath });
                })
                .on('error', (err: Error) => {
                    console.error('[Converter] Error:', err);
                    updateProgress('Failed', 0, 100);
                    reject(new Error(`Conversion failed: ${err.message}`));
                })
                .run();
        } catch (error) {
            console.error('[Converter] Error:', error);
            reject(error);
        }
    });
}

// ================== Media Info Functions ==================

/**
 * Get accurate media duration using ffprobe
 */
export async function getMediaDuration(filePath: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err: Error, metadata: any) => {
            if (err) {
                console.error('[MediaInfo] Failed to get duration:', err.message);
                reject(err);
            } else {
                const duration = metadata.format.duration;
                console.log(`[MediaInfo] Duration: ${duration}s (${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s)`);
                resolve(duration);
            }
        });
    });
}

// ================== Media Editing Functions ==================

export interface TrimConfig {
    inputPath: string;
    outputPath: string;
    startTime: number;  // seconds
    endTime: number;    // seconds
    lossless?: boolean; // use stream copy (faster but less precise)
}

export async function trimMedia(config: TrimConfig): Promise<{ outputPath: string }> {
    const { inputPath, outputPath, startTime, endTime, lossless = false } = config;

    console.log(`[Trim] Start: ${startTime}s, End: ${endTime}s, Lossless: ${lossless}`);

    return new Promise((resolve, reject) => {
        try {
            const command = ffmpeg(inputPath);
            const duration = endTime - startTime;

            if (lossless) {
                // Fast mode: no re-encoding, just copy streams
                command
                    .setStartTime(startTime)
                    .setDuration(duration)
                    .outputOptions(['-c', 'copy']); // Copy codec (no re-encoding)
                console.log('[Trim] Using lossless mode (stream copy)');
            } else {
                // Precise mode: re-encode for frame-accurate trimming
                command
                    .setStartTime(startTime)
                    .setDuration(duration)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .outputOptions([
                        '-preset', 'fast',
                        '-crf', '23'
                    ]);
                console.log('[Trim] Using precise mode (re-encoding)');
            }

            command
                .output(outputPath)
                .on('start', () => {
                    console.log('[Trim] FFmpeg started');
                })
                .on('progress', (progress: any) => {
                    if (progress.percent) {
                        console.log(`[Trim] Progress: ${Math.floor(progress.percent)}%`);
                    }
                })
                .on('end', () => {
                    console.log('[Trim] Complete!');
                    resolve({ outputPath });
                })
                .on('error', (err: Error) => {
                    console.error('[Trim] Error:', err);
                    reject(new Error(`Trim failed: ${err.message}`));
                })
                .run();
        } catch (error) {
            console.error('[Trim] Error:', error);
            reject(error);
        }
    });
}

export interface ConcatConfig {
    inputPaths: string[];
    outputPath: string;
    outputFormat: string;
}

export async function concatMedia(config: ConcatConfig): Promise<{ outputPath: string }> {
    const { inputPaths, outputPath, outputFormat } = config;

    console.log(`[Concat] Merging ${inputPaths.length} clips`);

    if (inputPaths.length === 0) {
        throw new Error('No input files provided');
    }

    if (inputPaths.length === 1) {
        // Single file, just copy
        console.log('[Concat] Single file, copying...');
        fs.copyFileSync(inputPaths[0], outputPath);
        return { outputPath };
    }

    // FFmpeg concat demuxer requires a text file listing all inputs
    const listFilePath = path.join(path.dirname(outputPath), 'concat_list.txt');
    const listContent = inputPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');

    fs.writeFileSync(listFilePath, listContent, 'utf-8');
    console.log('[Concat] Created file list:', listFilePath);

    return new Promise((resolve, reject) => {
        try {
            ffmpeg()
                .input(listFilePath)
                .inputOptions([
                    '-f', 'concat',
                    '-safe', '0'
                ])
                .outputOptions(['-c', 'copy']) // No re-encoding for speed
                .output(outputPath)
                .on('start', (cmd: string) => {
                    console.log('[Concat] FFmpeg command:', cmd);
                    console.log('[Concat] Started');
                })
                .on('progress', (progress: any) => {
                    if (progress.percent) {
                        console.log(`[Concat] Progress: ${Math.floor(progress.percent)}%`);
                    }
                })
                .on('end', () => {
                    console.log('[Concat] Complete!');
                    // Clean up temp file
                    try {
                        fs.unlinkSync(listFilePath);
                    } catch (e) {
                        console.warn('[Concat] Could not delete temp file:', e);
                    }
                    resolve({ outputPath });
                })
                .on('error', (err: Error) => {
                    console.error('[Concat] Error:', err);
                    // Clean up temp file on error
                    try {
                        fs.unlinkSync(listFilePath);
                    } catch (e) {
                        // ignore
                    }
                    reject(new Error(`Concatenation failed: ${err.message}`));
                })
                .run();
        } catch (error) {
            console.error('[Concat] Error:', error);
            // Clean up temp file
            try {
                fs.unlinkSync(listFilePath);
            } catch (e) {
                // ignore
            }
            reject(error);
        }
    });
}
