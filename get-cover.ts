import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

// 1. 指定本地 ffmpeg
const localFfmpegPath = path.join(__dirname, 'ffmpeg.exe');
ffmpeg.setFfmpegPath(localFfmpegPath);

// 2. 获取参数
const inputFile = process.argv[2];
// 可选：允许用户指定截取第几秒，默认第 5 秒
const timePoint = process.argv[3] || '5'; 

if (!inputFile || !fs.existsSync(inputFile)) {
  console.error('❌ 请指定 MP4 文件路径');
  process.exit(1);
}

// 生成同名的 jpg 文件
const outputFolder = path.dirname(inputFile);
const outputFileName = path.basename(inputFile, path.extname(inputFile)) + '.jpg';

console.log(`📸 正在截取第 ${timePoint} 秒的画面...`);

ffmpeg(inputFile)
  .screenshots({
    count: 1,             // 只截一张
    timemarks: [timePoint], // 时间点 (秒)，也可以写 '00:00:10'
    filename: outputFileName,
    folder: outputFolder
  })
  .on('end', () => {
    console.log(`✅ 封面已生成: ${outputFileName}`);
  })
  .on('error', (err) => {
    console.error('❌ 截图失败:', err.message);
  });