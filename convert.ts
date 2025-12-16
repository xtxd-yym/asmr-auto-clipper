import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

// 1. 指定本地 ffmpeg.exe 路径 (关键: 必须和脚本在同级目录)
const localFfmpegPath = path.join(__dirname, 'ffmpeg.exe');
ffmpeg.setFfmpegPath(localFfmpegPath);

// 2. 获取文件名参数
const inputFile = process.argv[2];

if (!inputFile || !fs.existsSync(inputFile)) {
  console.error('❌ 请在命令后指定有效的 MP4 文件路径');
  process.exit(1);
}

const outputFile = path.basename(inputFile, path.extname(inputFile)) + '.mp3';

console.log(`🚀 开始转换 (ASMR优化模式): ${inputFile} -> ${outputFile}`);
console.log('   (已开启: 极致VBR音质 + 强制双声道立体声)');

// 3. 执行转换
ffmpeg(inputFile)
  .noVideo()                // 移除视频流
  .audioCodec('libmp3lame') // 编码器
  .audioQuality(0)          // 🔥【关键】0 = 最高 VBR 音质 (细节最丰富)
  .audioChannels(2)         // 🔥【关键】强制双声道 (保留左右耳方位感)
  .on('progress', (progress) => {
    if (progress.percent) {
      process.stdout.write(`进度: ${Math.floor(progress.percent)}%\r`);
    }
  })
  .on('end', () => {
    console.log('\n✅ 转换成功！');
  })
  .on('error', (err) => {
    console.error('\n❌ 发生错误:', err.message);
  })
  .save(outputFile);