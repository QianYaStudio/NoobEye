# NoobEye 统计

统计 Worker + D1 已于2026-09-13部署，实际接口已写入 ../site/config.json。本地浏览器验证了真实API响应；云端完成了开局、通关和幂等检查，测试记录随后定向删除。

发布方：QianYaStudio。允许来源为 QianYaStudio GitHub Pages 域和当前本地4173试玩端口。自定义域名确定后，把其来源加入 ALLOWED_ORIGINS 再部署。

## 零用户和小样本

- 无用户时，人数和通关数真实显示0。
- 没有其他可比成绩时，显示“记录已保存，等待更多玩家”。
- 1—19份可比成绩时显示样本数量，达到20份后才显示百分位。
- 接口失败时不展示在线统计，游戏、本地时间和存档照常可用，不将错误响应当成0人。

## 口径

人数按随机浏览器访客ID去重。换设备或清除浏览器存储会视为新访客，不宣称实名人数。开局和通关用 runId 幂等记录，重复请求不会重复计数。

百分位比较同一期、同一玩法版本、同一提示分组。每位其他访客取个人最佳，同分不算超越。旧存档中没有完整计时的尝试不参与排名。前端上报有效观察时间，后台做范围及开始时间校验；用于休闲游戏反馈，不作为防作弊竞赛系统。

数据库保存匿名ID、期号、版本、开始/结束、观察时长、提示和错误次数。游戏统计不保存姓名、邮箱和IP；主动邮件订阅的邮箱单独管理；平台日志独立按Cloudflare配置处理。

## 维护和自行部署

使用锁定的 Wrangler 4.131.1：`npm ci`。旧版本缺少新的 workers_scripts OAuth 权限支持。本次已完成必要授权。

`npm run deploy` 部署脚本；`npm run migrate` 执行 schema.sql。开发工作区的 wrangler.jsonc 指向实际数据库。公开发行副本会将数据库ID替换为占位符，供他人部署自己的服务：

1. 登录Cloudflare，并授权 account:read、user:read、workers:write、workers_scripts:write、workers_routes:write、d1:write。
2. `npx wrangler d1 create noobeye-stats`，填入返回ID。
3. `npm run migrate`，再 `npm run deploy`。
4. 将实际 API 地址写入 ../site/config.json，ALLOWED_ORIGINS 填网站来源（不含项目路径）。
5. 验证一次开局和通关；测试数据只按已记录测试runId/visitorId定向清理。

无需在前端放 Cloudflare API token。开源仓库不包含登录信息、.wrangler缓存或本地测试记录。

域名与国内访问方案见 [DEPLOYMENT.md](../DEPLOYMENT.md)。官方依据：[D1](https://developers.cloudflare.com/d1/get-started/)、[Worker自定义域名](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)。

## 邮件订阅（Resend）

订阅接口与统计共用 Worker。`POST /subscriptions` 接受邮箱、语言和明确同意；发送 48 小时有效的确认邮件。邮箱确认页可直接从邮件打开，只有确认按钮的 POST 才创建联系人。Resend 的一个 NoobEye 分组加三种语言主题保存订阅；主题默认 opt_out。重复确认幂等，重复请求有冷却，IP 有独立限流，过期确认请求每日清理。邮箱不与游戏统计关联。

`RESEND_API_KEY` 使用 Full access，保存在 Worker Secret；本地管理命令读取被忽略的 `.dev.vars` 或环境变量。Sending access 无法管理联系人。`MAIL_FROM` 使用已验证发信子域；`PUBLIC_API_URL` 必须是实际公开 Worker 地址。配置中 `RESEND_SEGMENT_ID` 和 `RESEND_TOPIC_ZH/EN/JA` 对应自己的 Resend 资源。换网站域名时，同时更新允许来源和前端 `subscriptionsApi`。

每封群发邮件使用 Resend 的 `{{{RESEND_UNSUBSCRIBE_URL}}}`；Resend 自动跳过退订者。重新订阅可恢复 NoobEye 主题，但如联系人曾选择“退订全部”，先通过上一封邮件的订阅管理页恢复全局订阅，程序不会替其恢复其他出版物。

发新刊时，在 magazine 目录运行：

```sh
node tools/newsletter-draft.mjs 013 https://实际杂志网址/
```

命令只允许当前公开目录中的期号，生成三语草稿，包含对应语言主题、玩法链接和退订入口。相同期号/语言已存在的草稿或已发广播会跳过；单人维护时顺序运行，不并发执行。到 Resend → Broadcasts 核对草稿和收件范围，再正式发送。不会随代码部署自动发信，也不会自动补发往期。当前 010–012 继续隐藏，未生成或发送新刊广播。

2026-09-13 官方价格：Transactional Free 每月 3,000 封、每天 100 封；Marketing Free 1,000 联系人，Broadcasts 不按发送数量计费。当前免费方案限制最多 3 个 segments；本项目只占 1 个，语言使用 topics。未开通付费方案。额度以 [Resend 定价](https://resend.com/pricing) 和账户控制台为准。

验证：`node --test tools/subscriptions.test.mjs tools/session-stats.test.mjs`（在 magazine 目录运行）覆盖确认、幂等、冷却、语言、退订保护、失效和统计回归。已用 Resend 官方测试收件地址完成真实投递、确认和主题退订验证，并清理专用测试联系人与 D1 请求。

确认页使用 Referrer-Policy: strict-origin，仅发送域名来源、不发送带令牌的路径；no-referrer 会让原生表单 POST 的 Origin 变成 null，导致来源检查误拒绝。浏览器回归脚本 tools/check-confirmation.mjs 覆盖实际按钮提交；2026-09-13已修复并重新部署。
