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

// 黑名单：只过滤极明显的杂音（阈值很高，避免误杀）
const BLACKLIST_LABELS = [
    'Speech',               // 说话声
    'Conversation',         // 对话
    'Narration',            // 旁白
    'Vehicle',             // 车辆
    'Car',                 // 汽车
    'Motor vehicle (road)', // 机动车
    'Train',               // 火车
    'Truck',               // 卡车
];

// 极高阈值：只过滤非常明显的杂音（宁可错留，不可错丢）
const BLACKLIST_THRESHOLD = 0.20; // 20%以上才过滤

// 低置信度阈值：如果所有分类都很低，可能是舔耳
const LOW_CONFIDENCE_THRESHOLD = 0.15; // 所有标签都<15%时保留

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
    const discardedChunks: string[] = [];

    // 创建详细日志文件
    const logPath = path.join(aiToolDir, 'classification_detail.log');
    const logStream = fs.createWriteStream(logPath, { flags: 'w' });
    logStream.write(`=== Classification Log - Mode: ${mode}, Threshold: ${threshold} ===\n`);
    logStream.write(`Time: ${new Date().toISOString()}\n`);
    logStream.write(`Target Labels: ${TARGET_LABELS.join(', ')}\n`);
    logStream.write(`Blacklist Labels: ${BLACKLIST_LABELS.join(', ')}\n`);
    logStream.write(`Blacklist Threshold: ${BLACKLIST_THRESHOLD}\n\n`);
    logStream.write('='.repeat(80) + '\n\n');
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

        // 写入日志：片段基本信息
        logStream.write(`[${timestampName}] Chunk ${i + 1}/${chunkFiles.length}\n`);
        logStream.write(`Top 10 classifications:\n`);
        topClasses.slice(0, 10).forEach((c, idx) => {
            const marker = TARGET_LABELS.includes(c.label) ? '✓ TARGET' :
                BLACKLIST_LABELS.includes(c.label) ? '✗ BLACKLIST' : '';
            logStream.write(`  ${idx + 1}. ${c.label.padEnd(30)} ${(c.score * 100).toFixed(4)}% ${marker}\n`);
        });

        // 检查黑名单（优先级最高）
        const blacklistHit = topClasses.find(c =>
            BLACKLIST_LABELS.includes(c.label) && c.score >= BLACKLIST_THRESHOLD
        );

        // 检查目标标签
        const targetHit = topClasses.find(c =>
            TARGET_LABELS.includes(c.label) && c.score >= threshold
        );

        // 检查是否所有分类都很低（可能是舔耳）
        const maxScore = Math.max(...topClasses.map(c => c.score));
        const isLowConfidence = maxScore < LOW_CONFIDENCE_THRESHOLD;

        let decision = '';
        let reason = '';

        if (blacklistHit) {
            // 有极明显的杂音，丢弃
            decision = 'DISCARD';
            reason = `Strong blacklist hit: ${blacklistHit.label} (${(blacklistHit.score * 100).toFixed(4)}%)`;
            discardedChunks.push(file);
            fs.copyFileSync(path.join(TEMP_DIR, file), path.join(DISCARDED_DIR, timestampName));
        } else if (targetHit) {
            // 有目标命中，保留
            decision = 'KEEP';
            reason = `Target hit: ${targetHit.label} (${(targetHit.score * 100).toFixed(4)}%)`;
            validChunks.push(file);
            fs.copyFileSync(path.join(TEMP_DIR, file), path.join(KEPT_DIR, timestampName));
        } else if (isLowConfidence) {
            // 所有分类都很低，可能是舔耳，保留
            decision = 'KEEP';
            reason = `Low confidence (max: ${(maxScore * 100).toFixed(4)}%) - possible licking sound`;
            validChunks.push(file);
            fs.copyFileSync(path.join(TEMP_DIR, file), path.join(KEPT_DIR, timestampName));
        } else {
            // 无命中且有其他明显分类，丢弃
            decision = 'DISCARD';
            reason = `No target label, max confidence: ${topClasses[0].label} (${(topClasses[0].score * 100).toFixed(4)}%)`;
            discardedChunks.push(file);
            fs.copyFileSync(path.join(TEMP_DIR, file), path.join(DISCARDED_DIR, timestampName));
        }

        logStream.write(`Decision: ${decision} - ${reason}\n`);
        logStream.write('-'.repeat(80) + '\n\n');

        updateProgress('Analyzing', 30 + Math.floor((i / chunkFiles.length) * 50), 100);
    }

    // ========== 阶段2：段落连续性检测 ==========
    updateProgress('Detecting continuous segments', 80, 100);

    logStream.write('\n' + '='.repeat(80) + '\n');
    logStream.write('PHASE 2: Continuity Detection\n');
    logStream.write('='.repeat(80) + '\n\n');

    // 创建keep索引集合（秒为单位）
    const keptSeconds = new Set<number>();
    validChunks.forEach(file => {
        const match = file.match(/chunk_(\d+)\.wav/);
        if (match) {
            keptSeconds.add(parseInt(match[1]));
        }
    });

    // 检测连续段落
    const segments: { start: number, end: number, length: number }[] = [];
    let currentStart = -1;

    for (let i = 0; i < chunkFiles.length; i++) {
        if (keptSeconds.has(i)) {
            if (currentStart === -1) {
                currentStart = i; // 新段落开始
            }
        } else {
            if (currentStart !== -1) {
                // 段落结束
                segments.push({
                    start: currentStart,
                    end: i - 1,
                    length: i - currentStart
                });
                currentStart = -1;
            }
        }
    }
    // 处理最后一个段落
    if (currentStart !== -1) {
        segments.push({
            start: currentStart,
            end: chunkFiles.length - 1,
            length: chunkFiles.length - currentStart
        });
    }

    logStream.write(`Found ${segments.length} continuous segments:\n`);
    segments.forEach((seg, idx) => {
        logStream.write(`  Segment ${idx + 1}: ${formatTime(seg.start)} - ${formatTime(seg.end)} (${seg.length}s)\n`);
    });

    // 过滤规则：
    // 1. 连续 >= 3秒 → 保留
    // 2. 连续 < 3秒 → 丢弃（孤立噪点）
    const MIN_SEGMENT_LENGTH = 3;
    const finalSegments = segments.filter(seg => seg.length >= MIN_SEGMENT_LENGTH);

    logStream.write(`\nAfter filtering (min ${MIN_SEGMENT_LENGTH}s):\n`);
    logStream.write(`  Kept segments: ${finalSegments.length}\n`);
    finalSegments.forEach((seg, idx) => {
        logStream.write(`  Segment ${idx + 1}: ${formatTime(seg.start)} - ${formatTime(seg.end)} (${seg.length}s)\n`);
    });

    // 重新生成最终的kept列表
    const finalKeptSeconds = new Set<number>();
    finalSegments.forEach(seg => {
        for (let i = seg.start; i <= seg.end; i++) {
            finalKeptSeconds.add(i);
        }
    });

    // 清空kept和discarded文件夹，重新分配
    logStream.write('\nReorganizing files based on continuity...\n');
    fs.readdirSync(KEPT_DIR).forEach(f => fs.unlinkSync(path.join(KEPT_DIR, f)));
    fs.readdirSync(DISCARDED_DIR).forEach(f => fs.unlinkSync(path.join(DISCARDED_DIR, f)));

    const finalValidChunks: string[] = [];
    chunkFiles.forEach((file, i) => {
        const timestampName = `${formatTime(i)}.wav`;
        if (finalKeptSeconds.has(i)) {
            finalValidChunks.push(file);
            fs.copyFileSync(path.join(TEMP_DIR, file), path.join(KEPT_DIR, timestampName));
        } else {
            fs.copyFileSync(path.join(TEMP_DIR, file), path.join(DISCARDED_DIR, timestampName));
        }
    });

    // 关闭日志文件
    logStream.write('\n' + '='.repeat(80) + '\n');
    logStream.write(`\nFinal Summary:\n`);
    logStream.write(`  Total chunks: ${chunkFiles.length}\n`);
    logStream.write(`  Initial kept (before continuity): ${validChunks.length} (${(validChunks.length / chunkFiles.length * 100).toFixed(2)}%)\n`);
    logStream.write(`  Final kept (after continuity): ${finalValidChunks.length} (${(finalValidChunks.length / chunkFiles.length * 100).toFixed(2)}%)\n`);
    logStream.write(`  Continuous segments: ${finalSegments.length}\n`);
    logStream.write(`  Total duration: ${finalSegments.reduce((sum, seg) => sum + seg.length, 0)}s\n`);
    logStream.end();

    await browser.close();

    if (finalValidChunks.length === 0) {
        throw new Error('No continuous segments found');
    }

    updateProgress('Merging results', 85, 100);

    const listFile = path.join(TEMP_DIR, 'filelist.txt');
    const fileContent = finalValidChunks.map(f => `file '${path.join(TEMP_DIR, f)}'`).join('\n');
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
        keptCount: finalValidChunks.length,
        totalChunks: chunkFiles.length,
    };
}
