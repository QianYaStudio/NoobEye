# 域名与访问部署

NoobEye 由 QianYaStudio 发布：[在线杂志](https://qianyastudio.github.io/NoobEye/) · [源代码](https://github.com/QianYaStudio/NoobEye)。静态网页、插画和音乐由网站托管服务提供，统计与订阅使用独立后端。以下是配置自定义访问域名时可选的部署方案，开通前应核对供应商条件与实际访问效果。

## 优先方案：备案域名 + 国内对象存储 + 国内 CDN

GitHub 继续保存开源代码；把相同的 `site/` 发布产物同步到阿里云 OSS 等国内对象存储，再用国内 CDN 绑定自定义域名。主站、插画、音乐都走这一条国内静态访问链路。

这个结构适合当前无需服务端渲染的网站，也避免用户的正常游玩依赖从 GitHub 回源。阿里云官方说明：CDN可以使用OSS作为源站；使用中国内地或全球（含内地）加速区域时，域名需要备案。[添加加速域名](https://help.aliyun.com/zh/cdn/add-a-domain-name)

统计独立使用 `api.你的域名`。现阶段可映射至已部署的 Cloudflare Worker；如果面向国内的多运营商测试显示统计链路不稳定，再把同一接口迁到国内函数服务/服务器，或配置经过实际验证的API转发。仅加速图片和音乐，不能保证另一个跨境API域名也稳定。

## 暂不备案的过渡方案

可以使用香港等境外源站、自定义域名和境外 CDN。阿里云“全球（不包含中国内地）”会把内地访客调度到香港、日本、新加坡等节点，并对这个加速区域不要求ICP备案；它仍有跨境链路，不能视为国内节点的等价替代。[加速区域说明](https://help.aliyun.com/zh/cdn/add-a-domain-name)

普通 Cloudflare 全球网络也不等于它的中国网络。Cloudflare China Network 是 Enterprise 的独立附加服务，并要求ICP备案/许可；对当前小型杂志，先比较国内对象存储+CDN方案更合适。[Cloudflare China Network](https://developers.cloudflare.com/china-network/get-started/)

## 落地时的具体配置

- 域名购买地和后缀本身不决定源站线路。先确定访问地区、域名、备案状态和预算，再选CDN区域。
- `index.html`、`config.json`、`catalog.json` 使用短缓存；插画和音频采用内容版本或发布版本路径后长缓存。当前素材路径会随编辑覆写，不直接套一年不可变缓存。
- MP3 保持 `audio/mpeg` 类型和 Range 支持。若音频与页面使用不同域名，配置正确 CORS，确保音频频谱分析也能读取声音数据。
- `/runs/start` 和 `/runs/complete` 不缓存；`/stats` 当前响应为 `no-store`，避免人数与排名过时。
- 上线前对页面、图片、音频和统计 API 分别进行内地电信/联通/移动的多地访问测试，再切换正式DNS。

Cloudflare Worker 支持在已接入 Cloudflare 的域中绑定自定义域名，由平台配置对应 DNS 和证书。[Worker 自定义域名](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

## 邮件发信域

邮件发信子域和网站访问域分别配置。邮箱确认链接使用 `PUBLIC_API_URL`；绑定 API 自定义域名后需同步此值。`/subscriptions` 与确认路径同样不缓存。国内访问验证应增加“订阅请求→收到确认邮件→确认链接”完整链路。
