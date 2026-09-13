# NoobEye · FindPuzzle

FindPuzzle by QianYaStudio — 一本可以玩的找物杂志 / A hidden-object journal you can play / 遊べるもの探しマガジン。

当前公开九期（001—009）、76件藏品。中文、English、日本語可切换。完整封面书架、找物波纹、提示、存档、计时和通关庆祝；音乐播放时出现带音频波纹的悬浮控制栏。

Play at https://qianyastudio.github.io/NoobEye/ · Source: https://github.com/QianYaStudio/NoobEye

Music files are requested only after an explicit playback action in the current page. Closing the player stops and releases the audio source. Near the page bottom, the player docks at the footer boundary without adding a spacer below the footer.

The Find list includes Clear records: clear this issue or every issue, including personal bests. Language, sound preferences and online totals are preserved.


010、011、012暂不公开，发布后再同步。当前默认入口为009；旧隐藏期号链接会回到009，原有游玩记录保留。

## Run

`python -m http.server 4173 --bind 127.0.0.1` → http://localhost:4173/site/

## Publish

Published by **QianYaStudio**. GitHub Actions deploys site/ to GitHub Pages when main is updated, without a frontend build.

## Statistics

The publisher’s live statistics API is configured in site/config.json. Set statsApi to an empty string to disable collection, or deploy your own backend. See [backend setup](backend/README.md). Zero visitors are shown as zero. Percentiles require at least 20 comparable other players; no invented rankings.

Self-hosted copies should configure their own API and allowed origins. Production database identifiers and authentication data are not included.

## License

Software: [MIT](LICENSE). Illustrations: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), credit **QianYaStudio** and retain existing artwork signatures. Recordings are for magazine playback; separate reuse is not covered by these licenses. See [NOTICE](NOTICE).

Chinese domain and CDN planning: [DEPLOYMENT.md](DEPLOYMENT.md).

## Email subscriptions

中英日新刊订阅已接入 Resend，先确认邮箱，每封新刊邮件可退订。发送域为 `updates.deadnine.com`。Subscription requests use the Worker endpoint in `subscriptionsApi`; self-hosted copies should configure their own backend and verified sending domain. Keys belong in Worker Secrets, never the static site.

`node tools/newsletter-draft.mjs ISSUE_ID https://your-published-site/` prepares three language drafts for a published issue. Review and send in Resend Broadcasts. See [backend setup](backend/README.md).
