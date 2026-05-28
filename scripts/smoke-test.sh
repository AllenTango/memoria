#!/bin/bash
# scripts/smoke-test.sh
# Memoria 冒烟测试

set -e

TEST_DIR="$GITHUB_WORKSPACE/scripts/test-site"
OUT="/tmp/smoke-$$.log"

echo "=== Memoria 冒烟测试 ===" | tee "$OUT"
echo "时间: $(date)" | tee -a "$OUT"
echo "" | tee -a "$OUT"

cd "$TEST_DIR"

echo "--- 测试 memoria generate ---" | tee -a "$OUT"
if memoria generate 2>&1 | tee -a "$OUT"; then
    echo "[PASS] memoria generate 成功" | tee -a "$OUT"
else
    echo "[FAIL] memoria generate 失败" | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "--- 测试 memoria server ---" | tee -a "$OUT"
memoria server --watch &
SERVER_PID=$!
sleep 3
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "[PASS] memoria server 进程运行中 (PID: $SERVER_PID)" | tee -a "$OUT"
    kill $SERVER_PID 2>/dev/null || true
else
    echo "[FAIL] memoria server 进程未运行" | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "--- 检查输出文件 ---" | tee -a "$OUT"
if [ -d "$TEST_DIR/public" ]; then
    FILE_COUNT=$(find "$TEST_DIR/public" -type f | wc -l)
    echo "[PASS] public/ 目录存在，包含 $FILE_COUNT 个文件" | tee -a "$OUT"
else
    echo "[FAIL] public/ 目录不存在" | tee -a "$OUT"
fi

echo "" | tee -a "$OUT"
echo "=== 测试完成 ===" | tee -a "$OUT"
cat "$OUT"