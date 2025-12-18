import puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

interface ProcessConfig {
    inputPath: string;
    mode: 'licking' | 'talking' | 'sleep';
    threshold: number;
}

interface ProgressData {
    stage: string;
    current: number;
    total: number;
    percentage: number;
}

let currentProgress: ProgressData = {
    stage: 'idle',
    current: 0,
    total: 0,
    percentage: 0,
};

const MODES: Record<string, string[]> = {
    licking: ['Kiss', 'Lip smack', 'Chewing, mastication', 'Drinking', 'Water', 'Liquid', 'Gurgling', 'Stomach rumble', 'Drip', 'Trickle, dribble', 'Slurp', 'Fizzy drink'],
    talking: ['Speech', 'Whispering', 'Conversation', 'Narration'],
    sleep: ['Rain', 'Water', 'Wind', 'Silence', 'White noise']
};

export function getAIProgress(): ProgressData {
    return { ...currentProgress };
}

function updateProgress(stage: string, current: number, total: number) {
    currentProgress = {
        stage,
        current,
        total,
        percentage: total > 0 ? Math.round((current / total) * 100) : 0,
    };
}

export async function startAIProcessing(config: ProcessConfig) {
    const { inputPath, mode, threshold } = config;
    const TARGET_LABELS = MODES[mode];

    // 使用 process.cwd() 获取项目根目录（开发和生产环境都适用）
    const projectRoot = process.cwd();
    const aiToolDir = path.join(projectRoot, 'ai_tool');
    const TEMP_DIR = path.join(aiToolDir, 'temp_chunks');
    const KEPT_DIR = path.join(aiToolDir, 'kept');
    const DISCARDED_DIR = path.join(aiToolDir, 'discarded');
    const HTML_PATH = 'file://' + path.join(aiToolDir, 'runner_yamnet.html');

    updateProgress('Preparing', 0, 100);

    // Cleanup
    if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    if (fs.existsSync(KEPT_DIR)) fs.rmSync(KEPT_DIR, { recursive: true, force: true });
    if (fs.existsSync(DISCARDED_DIR)) fs.rmSync(DISCARDED_DIR, { recursive: true, force: true });

    fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.mkdirSync(KEPT_DIR, { recursive: true });
    fs.mkdirSync(DISCARDED_DIR, { recursive: true });

    // Split audio
    updateProgress('Splitting audio', 10, 100);
    await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
            .noVideo()
            .audioFrequency(44100)
            .output(path.join(TEMP_DIR, 'chunk_%03d.wav'))
            .outputOptions('-f', 'segment', '-segment_time', '1')
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });

    const chunkFiles = fs.readdirSync(TEMP_DIR).filter(f => f.endsWith('.wav')).sort();
    updateProgress('Loading AI model', 20, 100);

    // Launch browser
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files', '--disable-web-security']
    });
    const page = await browser.newPage();
    await page.goto(HTML_PATH);

    const loaded = await page.evaluate(async () => {
        // @ts-ignore
        return await window.runner.loadModel();
    });

    if (!loaded) {
        await browser.close();
        throw new Error('Failed to load AI model');
    }

    updateProgress('Analyzing chunks', 30, 100);

    const validChunks: string[] = [];
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${h}-${m}-${s}`;
    };

    for (let i = 0; i < chunkFiles.length; i++) {
        const file = chunkFiles[i];
        const fileUrl = 'file://' + path.join(TEMP_DIR, file);
        const timestampName = `${formatTime(i)}.wav`;

        const topClasses: { label: string, score: number }[] = await page.evaluate(async (fUrl) => {
            // @ts-ignore
            return await window.runner.processAudioFile(fUrl);
        }, fileUrl);

        const deepHit = topClasses.find(c => TARGET_LABELS.includes(c.label) && c.score >= threshold);

        if (deepHit) {
            validChunks.push(file);
            fs.copyFileSync(path.join(TEMP_DIR, file), path.join(KEPT_DIR, timestampName));
        } else {
            fs.copyFileSync(path.join(TEMP_DIR, file), path.join(DISCARDED_DIR, timestampName));
        }

        updateProgress('Analyzing', 30 + Math.floor((i / chunkFiles.length) * 50), 100);
    }

    await browser.close();

    if (validChunks.length === 0) {
        throw new Error('No matching segments found');
    }

    updateProgress('Merging results', 85, 100);

    const listFile = path.join(TEMP_DIR, 'filelist.txt');
    const fileContent = validChunks.map(f => `file '${path.join(TEMP_DIR, f)}'`).join('\n');
    fs.writeFileSync(listFile, fileContent);

    const finalOutput = path.join(projectRoot, `output_${mode}.mp3`);

    await new Promise<void>((resolve, reject) => {
        ffmpeg()
            .input(listFile)
            .inputOptions('-f', 'concat', '-safe', '0')
            .output(finalOutput)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });

    // Cleanup temp
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });

    updateProgress('Complete', 100, 100);

    return {
        outputPath: finalOutput,
        keptCount: validChunks.length,
        totalChunks: chunkFiles.length,
    };
}
