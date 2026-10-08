"""将真实搜索日志渲染为可读的计时回放，不将动画时间冒充破解时间。"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
data = json.loads((root / 'docs/test-results.json').read_text(encoding='utf-8'))['brute']
font_path = Path('C:/Windows/Fonts/consola.ttf')
font = ImageFont.truetype(str(font_path), 20) if font_path.exists() else ImageFont.load_default()
title_font = ImageFont.truetype(str(font_path), 32) if font_path.exists() else font
frames = []
steps = [{'checked': 0, 'elapsedMs': 0, 'matches': []}] + data['snapshots']
for step in steps:
    image = Image.new('RGB', (1000, 620), '#101715')
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((35, 30, 965, 585), 18, fill='#19241e', outline='#395243', width=2)
    draw.text((65, 60), 'S-DES LAB / KEY RECOVERY', font=title_font, fill='#a4edbd')
    draw.text((65, 117), 'Actual search-log replay (slowed for readability)', font=font, fill='#839c8d')
    draw.text((65, 170), 'Started: ' + data['startedAt'], font=font, fill='#bbcfc0')
    for index, pair in enumerate(data['pairs']):
        draw.text((65, 216 + index * 30), f"P{index+1} {pair['plain']}  ->  C{index+1} {pair['cipher']}", font=font, fill='#99b7a4')
    draw.text((65, 390), f"Checked keys: {step['checked']:4d} / 1024", font=font, fill='#cbe2d2')
    draw.rounded_rectangle((65, 430, 930, 446), 6, fill='#2c4134')
    if step['checked']:
        draw.rounded_rectangle((65, 430, 65 + int(865 * step['checked'] / 1024), 446), 6, fill='#a4edbd')
    draw.text((65, 474), f"Actual compute elapsed: {step['elapsedMs']:.3f} ms", font=title_font, fill='#a4edbd')
    draw.text((65, 530), 'Candidates: ' + (', '.join(step['matches']) or '(none yet)'), font=font, fill='#c0d9c8')
    frames.append(image)
frames[-1].save(root / 'docs/bruteforce-last.png')
frames[0].save(root / 'docs/bruteforce.gif', save_all=True, append_images=frames[1:], duration=[500] * (len(frames) - 1) + [2400], loop=0)
print('Generated docs/bruteforce.gif from actual measured search log.')
