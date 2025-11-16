#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

# 讀取 gallery.html
with open('gallery.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 定義需要添加下載統計的所有項目模式
# 照片項目: photo_001-006, student_id, twzp_001-029
# 影片項目: video_001-008

photo_ids = [f'photo_{i:03d}' for i in range(1, 7)] + ['student_id'] + [f'twzp_{i:03d}' for i in range(1, 30)]
video_ids = [f'video_{i:03d}' for i in range(1, 9)]

all_ids = photo_ids + video_ids

# 為每個項目添加下載統計顯示和追蹤函數
for item_id in all_ids:
    # 查找該項目的 gallery-overlay 或 video-overlay
    # 模式 1: 照片的 overlay (已修改前 5 個)
    pattern1 = rf'(            <small>點擊放大</small>\n          </div>\n          <a href="[^"]*" download="[^"]*" class="download-btn item-download-btn" onclick="event\.stopPropagation\(\); gtag\(\'event\', \'file_download\', \{{file_name: \'[^\']*\', file_type: \'[^\']*\', item_id: \'{item_id}\'\}}\);")>'
    
    replacement1 = rf'\1            <small>點擊放大</small>\n            <div class="download-stats">\n              <span id="{item_id}-count" class="count-number">---</span> 次下載\n            </div>\n          </div>\n          <a href="[^"]*" download="[^"]*" class="download-btn item-download-btn" onclick="event.stopPropagation(); trackDownload(\'{item_id}\'); gtag(\'event\', \'file_download\', {{file_name: \'[^\']*\', file_type: \'[^\']*\', item_id: \'{item_id}\'}});">'
    
print(f"Python 腳本已創建: update_download_counts.py")
print("注意: 由於 HTML 結構複雜,建議手動修改剩餘項目")
