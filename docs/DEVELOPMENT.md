# 开发手册与接口

## 架构

`index.html`：页面框架与指南对话框。`src/app.js`：导航、表单、过程可视化、导入导出与用户交互。`src/styles.css`：响应式样式和减少动画偏好。`src/sdes.js`：无浏览器依赖的纯函数算法。`src/worker.js`：后台完整搜索与碰撞统计。`reference/sdes.py`：独立的 Python 列表位运算实现。`scripts/verify.mjs`：穷举比对、原始证据和报告生成。

没有后端、运行期 npm 依赖、网络计算或数据存储。算法 API 可在 Node.js 或浏览器 ES Module 中导入。密钥扩展结果使用最多 1024 项缓存，数据不可变；参数表深冻结，防止被意外修改。

## 位序与参数

输入从左至右编号为 1–N；文档 P10 / P8 图中 `0` 表示第 10 位。

```js
P10 = [3,5,2,7,4,10,1,9,8,6]
P8 = [6,3,7,4,8,5,10,9]
IP = [2,6,3,1,4,8,5,7]
IP_INV = [4,1,3,5,7,2,8,6]
EP = [4,1,2,3,2,3,4,1]
P4 = [2,4,3,1]
S0 = [[1,0,3,2],[3,2,1,0],[0,2,1,3],[3,1,0,2]]
S1 = [[0,1,2,3],[2,3,1,0],[3,0,1,2],[2,1,0,3]]
```

代码 S0 / S1 对应课程 S-box1 / S-box2。S 盒行取输入最外两位，列取中间两位。密钥流程：P10 → 分别 LS-1 → P8 得 K₁；从 LS-1 结果分别再 LS-2 → P8 得 K₂。加密流程：IP → fₖ(K₁) → SW → fₖ(K₂) → IP⁻¹。解密仅反转轮密钥顺序。

## 公开 API

| 接口 | 返回值 | 约束 |
| --- | --- | --- |
| `bits(value, width=8)` | 补零二进制字符串 | 内部有效非负整数用 |
| `validateBits(value, width, label)` | 解析后的整数 | 长度严格匹配，仅 0 / 1；无效抛 Error |
| `expandKey(key)` | `{p10,ls1,ls2,k1,k2}` | key 是 10 位字符串 |
| `encrypt(plain,key)` | 8 位密文字符串 | plain 8 位，key 10 位 |
| `decrypt(cipher,key)` | 8 位明文字符串 | cipher 8 位，key 10 位 |
| `traceBlock(input,key,decrypting=false)` | 两轮详细轨迹对象 | input 8 位，包含每步输入输出和 S 盒结果 |
| `encodeText(text,key,encoding='ascii')` | 空格分隔大写 Hex | ascii / utf8；ASCII 拒绝 >127 字符 |
| `decodeText(hex,key,encoding='ascii')` | 解密文本 | Hex 必须完整字节；严格检验 ASCII / UTF-8 |
| `findKeys(pairs)` | 所有匹配的 10 位密钥数组 | 非空 `{plain,cipher}` 数组；不提前停止 |
| `collisionProfile(plain)` | `{plain,distinct,maxCollision,groups}` | 全部 1024 密钥；groups 包含密文和全部密钥 |

```js
import {encrypt, decrypt, findKeys} from './src/sdes.js';
const key = '1010000010';
const cipher = encrypt('11010111', key); // 10001100
decrypt(cipher, key); // 11010111
findKeys([{plain: '11010111', cipher}]); // 所有匹配密钥
```

`traceBlock.first` 和 `.second` 包含 `input,left,right,ep,key,mixed,s0,s1,p4,output`。全部为补足位宽的二进制字符串，便于显示与独立复核。

## Worker 消息

请求 `{id,kind,payload}`。kind 为 `crack`（payload 明密文对数组）、`collision`（payload 明文字符串）、`all`（遍历全部明文）。响应 `{id,result,startedAt,endedAt,elapsedMs}`，失败为 `{id,error}`；全部明文测试阶段响应 `{id,progress}`。时间戳采用 ISO UTC，耗时采用 performance.now 单调时钟，UI 中无人工等待时间。每次任务创建 Worker，任务结束后终止。

## 测试与复现

`npm test` 使用 Node 内置测试器。`npm run verify` 调用本机 Python（可设置环境变量 PYTHON 为解释器绝对路径），对全部 262,144 个输入比较加密结果并生成 `docs/test-results.json`、`docs/cross-vectors.json` 和 `docs/TEST-REPORT.md`。`python scripts/render-demo.py` 需要 Pillow，使用实测日志生成 GIF；图片动画仅是阅读回放。

`npm run build` 复制 HTML、src 和 assets 到 dist，保留相对路径。`npm start` 仅监听 127.0.0.1，不暴露本机服务器至公网。项目可部署在 GitHub Pages 子目录；Worker URL 通过 import.meta.url 解析。

## 维护说明

更改参数后须同时核对独立 Python 表，重新执行测试与生成报告。不要以修改测试预期掩盖算法错误。若课程向量与常见教材不符，应先核对完整 S 盒、位序和 LS-2 累计移位，再用独立实现验证。真实组间测试需要记录对方结果，不得伪造小组或分工完成经历。
