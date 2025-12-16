import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';

// 1. 设置 ffmpeg
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  console.error('❌ 未找到 ffmpeg-static');
  process.exit(1);
}

// 2. 获取参数
const inputPath = process.argv[2];
const timePoint = process.argv[3] || '5'; // 默认截取第 5 秒

if (!inputPath || !fs.existsSync(inputPath)) {
  console.error('❌ 请输入有效的 MP4 文件或文件夹路径');
  process.exit(1);
}

(async () => {
  const stats = fs.statSync(inputPath);

  if (stats.isDirectory()) {
    // 📂 批量模式
    const files = fs.readdirSync(inputPath).filter(f => f.toLowerCase().endsWith('.mp4'));
    console.log(`📂 [封面提取] 扫描到 ${files.length} 个视频`);

    for (const file of files) {
      await extractCover(path.join(inputPath, file), timePoint);
    }
    console.log('\n🎉 所有封面提取完毕！');

  } else {
    // 📄 单文件模式
    await extractCover(inputPath, timePoint);
  }
})();

function extractCover(inputFile: string, time: string): Promise<void> {
  return new Promise((resolve) => {
    const parsedPath = path.parse(inputFile);
    // 输出到同级目录，同名 jpg
    const outputFileName = `${parsedPath.name}.jpg`;
    const outputFolder = parsedPath.dir;
    const fullOutputPath = path.join(outputFolder, outputFileName);

    console.log(`\n▶️  处理: ${parsedPath.base}`);

    if (fs.existsSync(fullOutputPath)) {
      console.log('   ⏩ 跳过 (封面已存在)');
      resolve();
      return;
    }

    ffmpeg(inputFile)
      .screenshots({
        count: 1,
        timemarks: [time],
        filename: outputFileName,
        folder: outputFolder
      })
      .on('end', () => {
        console.log(`   ✅ 封面已生成`);
        resolve();
      })
      .on('error', (err) => {
        console.error('   ❌ 截图失败:', err.message);
        resolve();
      });
  });
}