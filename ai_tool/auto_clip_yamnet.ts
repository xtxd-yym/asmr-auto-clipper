import puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Config and Paths
const HTML_PATH = 'file://' + path.join(__dirname, 'runner_yamnet.html');
const INPUT_MP4 = path.join(__dirname, '../legacy_scripts/demo/demo.mp4');
const TEMP_DIR = path.join(__dirname, 'temp_chunks_yamnet');
const KEPT_DIR = path.join(__dirname, 'kept');
const DISCARDED_DIR = path.join(__dirname, 'discarded');

// Smart Filter Modes
const MODES: Record<string, string[]> = {
    default: ['Kiss', 'Lip smack', 'Chewing, mastication', 'Drinking', 'Breathing'],
    licking: ['Kiss', 'Lip smack', 'Chewing, mastication', 'Drinking', 'Water', 'Liquid', 'Gurgling', 'Stomach rumble', 'Drip', 'Trickle, dribble', 'Slurp', 'Fizzy drink'],
    talking: ['Speech', 'Whispering', 'Conversation', 'Narration'],
    sleep: ['Rain', 'Water', 'Wind', 'Silence', 'White noise']
};

const BLACKLIST = ['Speech', 'Conversation', 'Narration', 'Laughter', 'Giggle'];

// Parse CLI Args
const args = process.argv.slice(2);
if (args.includes('--help')) {
    console.log(`
    Usage: npx ts-node auto_clip_yamnet.ts [options]
    Options:
      --mode=[licking|talking|sleep]   Set filter mode (default: licking)
      --threshold=0.0001               Search sensitivity
    `);
    process.exit(0);
}

const modeArg = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'licking';
const thresholdArg = parseFloat(args.find(a => a.startsWith('--threshold='))?.split('=')[1] || '0.0001');

const TARGET_LABELS = MODES[modeArg] || MODES['licking'];

// Cleanup helper (Raw chunks only)
function cleanup() {
    if (fs.existsSync(TEMP_DIR)) {
        console.log("🧹 Cleaning up raw temp chunks...");
        try {
            fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        } catch (e) {
            console.error("Warning: Failed to clean up temp dir:", e);
        }
    }
}

async function main() {
    console.log(`🎯 AI Auto-Clipper: mode=${modeArg.toUpperCase()}, threshold=${thresholdArg}`);
    const logFile = path.join(__dirname, 'classification.log');
    fs.writeFileSync(logFile, "timestamp,label,score,status,music_score\n"); // Updated Header

    try {
        // 1. Prepare Folders
        cleanup(); // Wipe old raw chunks
        fs.mkdirSync(TEMP_DIR, { recursive: true });

        // Reset Audit Folders (Stable inside ai_tool)
        console.log("📁 Preparing Audit Folders (kept/discarded)...");
        if (fs.existsSync(KEPT_DIR)) fs.rmSync(KEPT_DIR, { recursive: true, force: true });
        if (fs.existsSync(DISCARDED_DIR)) fs.rmSync(DISCARDED_DIR, { recursive: true, force: true });
        fs.mkdirSync(KEPT_DIR, { recursive: true });
        fs.mkdirSync(DISCARDED_DIR, { recursive: true });

        // 2. Split Audio using FFmpeg
        console.log("🔪 Splitting audio into 1s chunks...");
        await new Promise<void>((resolve, reject) => {
            ffmpeg(INPUT_MP4)
                .noVideo()
                .audioFrequency(44100)
                .output(path.join(TEMP_DIR, 'chunk_%03d.wav'))
                .outputOptions('-f', 'segment', '-segment_time', '1')
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });

        const chunkFiles = fs.readdirSync(TEMP_DIR).filter(f => f.endsWith('.wav')).sort();
        console.log(`   Generated ${chunkFiles.length} chunks.`);

        // 3. Launch Browser Environment
        console.log("🌍 Launching Browser (Chrome)...");
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--allow-file-access-from-files',
                '--disable-web-security'
            ]
        });
        const page = await browser.newPage();
        page.on('console', msg => { if (msg.text().includes('Loaded')) console.log('PAGE LOG:', msg.text()); });
        await page.goto(HTML_PATH);

        // 4. Load Model
        console.log("🧠 Loading YAMNet...");
        const loaded = await page.evaluate(async () => {
            // @ts-ignore
            return await window.runner.loadModel();
        });

        if (!loaded) {
            console.error("❌ Failed to load model.");
            await browser.close();
            return;
        }

        // 5. Inference Loop
        console.log(`🔍 Scanning chunks...`);
        const validChunks: string[] = [];
        let processed = 0;

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

            // Inference
            const topClasses: { label: string, score: number }[] = await page.evaluate(async (fUrl) => {
                // @ts-ignore
                return await window.runner.processAudioFile(fUrl);
            }, fileUrl);

            const top1 = topClasses[0] || { label: 'Unknown', score: 0 };
            const musicScore = topClasses.find(c => ['Music', 'Singing', 'Musical instrument'].includes(c.label))?.score || 0;
            const deepHit = topClasses.find(c => TARGET_LABELS.includes(c.label) && c.score >= thresholdArg);

            let status = 'MISS';
            if (deepHit) {
                validChunks.push(file);
                status = `HIT:${deepHit.label}(${deepHit.score.toFixed(5)})`;
                console.log(`   [${timestampName}] ${status} | Music:${musicScore.toFixed(2)}`);
            }

            // Copy to Audit Folders
            const destDir = status.startsWith('HIT') ? KEPT_DIR : DISCARDED_DIR;
            fs.copyFileSync(path.join(TEMP_DIR, file), path.join(destDir, timestampName));

            // Log
            fs.appendFileSync(logFile, `${timestampName},${top1.label},${top1.score.toFixed(5)},${status},${musicScore.toFixed(3)}\n`);

            processed++;
            if (processed % 100 === 0) console.log(`   ...processed ${processed}/${chunkFiles.length}`);
        }

        await browser.close();

        // 6. Merge Hits
        if (validChunks.length === 0) {
            console.log("⚠️ No matches found.");
            return;
        }

        console.log(`✨ Merging ${validChunks.length} chunks into result...`);
        const listFile = path.join(TEMP_DIR, 'filelist.txt');
        const fileContent = validChunks.map(f => `file '${path.join(TEMP_DIR, f)}'`).join('\n');
        fs.writeFileSync(listFile, fileContent);

        const finalOutput = path.join(__dirname, `../output_${modeArg}.mp3`);
        await new Promise<void>((resolve, reject) => {
            ffmpeg()
                .input(listFile)
                .inputOptions('-f', 'concat', '-safe', '0')
                .output(finalOutput)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });

        console.log("✅ DONE! Final product:", finalOutput);

    } catch (error) {
        console.error("❌ Fatal Error:", error);
    } finally {
        cleanup(); // Cleanup raw chunks
    }
}

main();
