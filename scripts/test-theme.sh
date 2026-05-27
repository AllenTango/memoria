#!/bin/bash
# scripts/test-theme.sh
# 验证主题结构完整性

set -e

THEME_DIR="/home/dev/memoria/memoria-core/themes/dracula"
REPORT="/tmp/theme-verify-$$.txt"

echo "=== Memoria 主题验证报告 ===" > "$REPORT"
echo "时间: $(date)" >> "$REPORT"
echo "" >> "$REPORT"

PASS=0
FAIL=0

check_file() {
    if [ -f "$THEME_DIR/$1" ]; then
        echo "[PASS] $1 存在" | tee -a "$REPORT"
        ((PASS++))
    else
        echo "[FAIL] $1 不存在" | tee -a "$REPORT"
        ((FAIL++))
    fi
}

echo "--- 文件结构检查 ---" | tee -a "$REPORT"
check_file "template.html"
check_file "colors.css"
check_file "layout.css"

echo "" >> "$REPORT"
echo "--- 渲染测试 ---" | tee -a "$REPORT"

cd /home/dev/memoria/scripts/test-site
if npx memoria generate 2>&1 | tee -a "$REPORT"; then
    echo "[PASS] memoria generate 执行成功" | tee -a "$REPORT"
    ((PASS++))
else
    echo "[FAIL] memoria generate 执行失败" | tee -a "$REPORT"
    ((FAIL++))
fi

echo "" >> "$REPORT"
echo "--- 结果摘要 ---" | tee -a "$REPORT"
echo "通过: $PASS" >> "$REPORT"
echo "失败: $FAIL" >> "$REPORT"

cat "$REPORT"
exit $FAIL