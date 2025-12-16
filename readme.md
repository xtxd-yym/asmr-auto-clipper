1. 转音频 (ASMR模式):
pnpm tsx convert.ts ./demo.mp4

2. 提取封面 (默认截取第 5 秒):
pnpm tsx get-cover.ts ./demo.mp4

3. 提取特定时间的封面 (例如截取第 60 秒):
pnpm tsx get-cover.ts ./demo.mp4 60