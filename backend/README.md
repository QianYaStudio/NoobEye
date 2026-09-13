# 后端部署与维护

NoobEye 的静态网站可部署到 GitHub Pages。可选后端使用 Cloudflare Worker + D1 提供游玩统计，并通过 Resend 管理新刊邮件订阅。

## 自行部署

1. 在本目录执行 `npm ci`，登录 Wrangler，创建 D1 数据库。
2. 将数据库 ID 填入 `wrangler.jsonc`，将网站的完整来源加入 `ALLOWED_ORIGINS`，不含路径。
3. 执行 `npm run migrate` 初始化表，再执行 `npm run deploy`。
4. 在网站 `site/config.json` 中填写自己的 `statsApi` 与 `subscriptionsApi`。

公开配置是自行部署模板。生产绑定保存在各自的部署环境中；Secret 通过 Wrangler Secret 配置，不放入网页或 Git。更换网站域名后，更新允许来源，并验证浏览器跨域请求。

## 统计

访客数按随机浏览器 ID 去重；更换设备或清除浏览器存储会视为新访客。开局和通关使用 runId 幂等记录。

成绩比较同一期、玩法版本、提示分组中其他访客的个人最佳；至少有20位可比访客才显示百分位。零玩家显示0，样本不足提示等待更多成绩。接口不可用时保留本地游戏，不将错误响应显示为0人。

记录包含匿名访客 ID、期号、版本、开始和结束时间、用时、提示与错误次数。成绩用于休闲游玩反馈。清除本地游玩记录不删除线上累计统计。

## 邮件订阅

在 Resend 验证自己的发信域，创建一个杂志 segment 和中文、英文、日语三个 topics，主题默认选择 `opt_out`。填入 `RESEND_SEGMENT_ID`、`RESEND_TOPIC_ZH/EN/JA`、`MAIL_FROM` 和实际公开的 `PUBLIC_API_URL`。用 `wrangler secret put RESEND_API_KEY` 配置专用 Full access Key；仅 Sending access 无法管理联系人。

玩家提交邮箱、语言和同意后，收到48小时有效的确认链接。确认页只有按钮 POST 才创建订阅，打开链接不会自动生效。请求有冷却与限流，过期确认请求每日清理。Resend 管理联系人和退订状态，邮箱不与游玩成绩关联。

确认页使用 `Referrer-Policy: strict-origin`。改成 `no-referrer` 会让原生表单提交带上 `Origin: null`，与来源检查冲突；改动此流程时需测试实际按钮提交。全局退订者需要先通过历史邮件的管理入口恢复设置，程序不会自动恢复其他出版物的订阅。

## 新刊通知

网站部署不会自动发邮件。在仓库根目录执行以下命令，为已上线期号生成三语草稿：

```sh
node tools/newsletter-draft.mjs ISSUE_ID https://your-published-site/
```

脚本读取后端配置及环境变量 `RESEND_API_KEY`，也可读取被忽略的 `backend/.dev.vars`。仅允许发行目录中的期号；同一期号、语言的已有广播会跳过。顺序运行，避免并发创建重复草稿。

在 Resend Broadcasts 核对内容、主题、游玩链接、收件范围及是否已经发送，再发送。每封新刊邮件带有 Resend 退订入口，退订者由 Resend 排除。若操作结果不确定，先检查远程广播状态，再决定是否重试。

## 验证与参考

从仓库根目录执行 `node --test tools/subscriptions.test.mjs tools/session-stats.test.mjs` 检查确认、限流、幂等、过期、偏好与统计逻辑。浏览器流程另做实际点击验证；测试应隔离生产用户数据。真实邮件测试可使用 [Resend 官方测试地址](https://resend.com/docs/knowledge-base/what-email-addresses-to-use-for-testing)。

自行部署前查阅 [Wrangler](https://developers.cloudflare.com/workers/wrangler/)、[D1](https://developers.cloudflare.com/d1/get-started/)、[Resend 域名配置](https://resend.com/docs/dashboard/domains/introduction) 与 [当前定价](https://resend.com/pricing)。域名与访问部署方案见 [DEPLOYMENT.md](../DEPLOYMENT.md)。
