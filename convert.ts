import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';

// 1. 自动设置 ffmpeg 路径 (使用依赖包，不再依赖本地 exe)
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  console.error('❌ 未找到 ffmpeg-static，请执行 pnpm install');
  process.exit(1);
}

// 2. 获取参数
const inputPath = process.argv[2];

if (!inputPath || !fs.existsSync(inputPath)) {
  console.error('❌ 请输入有效的 MP4 文件或文件夹路径');
  console.error('   示例: pnpm tsx convert.ts ./video.mp4');
  console.error('   示例: pnpm tsx convert.ts ./videos/');
  process.exit(1);
}

// 主流程
(async () => {
  const stats = fs.statSync(inputPath);

  if (stats.isDirectory()) {
    // 📂 批量模式
    const files = fs.readdirSync(inputPath)
      .filter(f => f.toLowerCase().endsWith('.mp4'));

    console.log(`📂 检测到文件夹，共找到 ${files.length} 个 MP4 文件`);
    console.log('🚀 开始批量转换 (按顺序执行)...');

    for (const file of files) {
      await convertToMp3(path.join(inputPath, file));
    }
    console.log('\n🎉 所有任务处理完毕！');

  } else {
    // 📄 单文件模式
    await convertToMp3(inputPath);
  }
})();


/**
 * 封装转换逻辑为 Promise，方便 await
 */
function convertToMp3(inputFile: string): Promise<void> {
  return new Promise((resolve) => {
    // 自动替换扩展名 .mp4 -> .mp3
    // 使用 path.parse 处理路径，更稳健
    const parsedPath = path.parse(inputFile);
    const outputFile = path.join(parsedPath.dir, `${parsedPath.name}.mp3`);

    console.log(`\n▶️  正在处理: ${parsedPath.base}`);

    if (fs.existsSync(outputFile)) {
      console.log('   ⏩ 跳过 (目标文件已存在)');
      resolve();
      return;
    }

    ffmpeg(inputFile)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioQuality(0)          // VBR 0 (最高音质)
      .audioChannels(2)         // 强制双声道
      .on('progress', (progress) => {
        // 进度回调可能不准确，暂时简化
        // process.stdout.write(`   processing...\r`);
      })
      .on('end', () => {
        process.stdout.write('\n'); // 换行
        console.log('   ✅ 转换成功');
        resolve();
      })
      .on('error', (err) => {
        process.stdout.write('\n');
        console.error('   ❌ 失败:', err.message);
        resolve(); // 即使失败也继续下一个，不中断循环
      })
      .save(outputFile);
  });
}