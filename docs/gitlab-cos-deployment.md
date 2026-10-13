# GitLab → 腾讯云 COS 发布

配置参考 `https://gitlab.aiecnu.net/elion/elion-student`，复用
`devops/ci-templates/templates/fe-deploy-template.yaml` 的部署镜像和发布规则。
模板固定在提交 `078b05d50486264e02187a89f351f77cb4dd32e0`。
当前项目分别配置测试和正式环境的桶、地域与 CDN 域名，不使用共享模板自动拼接的资源名称；认证配置按对应环境地域生成。

## 测试环境（已确认）

| 项目 | 配置 |
| --- | --- |
| COS 桶 | `psych-new-1308722423` |
| 地域 | `ap-shanghai` |
| 上传目录 | 桶根目录 |
| COS 控制台 | https://console.cloud.tencent.com/cos/bucket?bucket=psych-new-1308722423&region=ap-shanghai&isPublic=true |
| CDN 控制台 | https://console.cloud.tencent.com/cdn/domains/cdn-64ott7a3 |
| CDN 加速域名 | `psych-user.xhpolaris.com`（中国境内，CDN 网页小文件） |

控制台中的 `cdn-64ott7a3` 是资源标识，不能作为缓存刷新域名。

## 正式环境（已确认）

| 项目 | 配置 |
| --- | --- |
| COS 桶 | `psych-user-1332239649` |
| 地域 | `ap-shanghai` |
| 上传目录 | 桶根目录 |
| COS 控制台 | https://console.cloud.tencent.com/cos/bucket?bucket=psych-user-1332239649&region=ap-shanghai |
| CDN 加速域名 | `psych-user.aiecnu.net`（中国境内，CDN 网页小文件） |
| CDN CNAME | `psych-user.aiecnu.net.cdn.dnsv1.com` |

正式发布使用独立的 COS 桶和 CDN，发布前会拒绝缺失配置或误用测试资源。

## 流水线行为

- 分支提交和合并请求执行两个构建：`build-test` 使用 `.env.development`，`build-prod` 使用 `.env.production`，均执行 TypeScript 检查并生成 `dist/`。
- 默认分支的 push 流水线通过 `deploy-test` 自动发布测试构建到测试桶，并刷新测试 CDN。
- 同一流水线提供 `deploy-prod` 手动按钮，发布生产构建到独立的正式桶，并刷新正式 CDN。
- 部署先上传资源，全部成功后再上传 `index.html`，最后提交腾讯云 CDN 目录缓存刷新任务。
- 上传保留旧版本对象，保证已打开页面仍能访问旧的哈希资源。旧文件可在确认不再被使用后单独清理。
- 同一站点的部署串行执行。构建产物保留 7 天，超期需重新推送默认分支产生可发布的流水线。
- 手动运行流水线及非默认分支只构建，不发布，遵循参考模板的发布触发规则。

## GitLab 配置

当前本地仓库的 origin 是 GitHub。需将本配置提交到目标 GitLab 仓库，该仓库必须能读取 `devops/ci-templates`。

在 **Settings → CI/CD → Variables** 配置下列变量，或确认组变量已继承：

| 变量 | 用途 |
| --- | --- |
| `FE_COS_ACCESS_KEY` | 腾讯云 SecretId，设为 Masked、Protected |
| `FE_COS_SECRET_KEY` | 腾讯云 SecretKey，设为 Masked、Protected |
| `COS_PROD_BUCKET` | 可选覆盖，默认 `psych-user-1332239649` |
| `COS_PROD_REGION` | 可选覆盖，默认 `ap-shanghai` |
| `CDN_PROD_DOMAIN` | 可选覆盖，默认 `psych-user.aiecnu.net`，不带协议、路径或结尾斜杠 |

无需配置原模板的 `PROJECT_NAME`、`TEST_WEBSITE_HOST`、`PROD_WEBSITE_HOST`。
测试配置分别是 `COS_TEST_BUCKET=psych-new-1308722423`、`COS_TEST_REGION=ap-shanghai`、`CDN_TEST_DOMAIN=psych-user.xhpolaris.com`，一般无需覆盖。

部署任务声明了 `test`、`production` 两个 GitLab 环境。两个桶的 APPID 不同，云凭据需要分别具备对应账号资源的权限；如果使用不同凭据，可将同名 `FE_COS_ACCESS_KEY`、`FE_COS_SECRET_KEY` 分别配置为对应 Environment scope。正式环境变量请用 `*` 或 `production` 作用域。

默认分支需设为受保护分支，才能取得 Protected 变量。凭据需具备目标桶的读取、上传权限和 CDN 目录缓存刷新权限。不要把云凭据放入 `VITE_*` 变量，Vite 会将它们打包到浏览器代码。

## COS、CDN 和 Runner 前置条件

1. 在目标 COS 桶开启静态网站，默认首页设为 `index.html`。流水线不会自动更改桶权限。
2. 当前项目使用 `BrowserRouter`，需为前端路由设置回退到 `index.html`，并验证子路由刷新。只设置错误页可能仍返回 404，按 COS/CDN 实际回源行为配置重写。
3. 确认所提供的 CDN 域名回源到此桶的静态网站端点，并已配置 HTTPS。首页应设置短缓存或不缓存，哈希资源可使用长期缓存。
4. API 与 WebSocket 地址由对应 `.env` 文件决定，COS 只托管前端。
5. Runner 使用 Docker 或 Kubernetes executor，能够拉取 Node 镜像以及 `harbor.harbor/elion/deploy-helper:v1.0.0`；后者依赖你们内部网络和镜像仓库认证。Runner 若有标签限制，需补充相匹配的 `tags`。

## 验证发布

推送默认分支后，确认两个构建和自动测试部署成功，先验证 `https://psych-user.xhpolaris.com/`，再手动运行 `deploy-prod`。确认正式资源上传、首页上传及 CDN 刷新提交成功后，在 `https://psych-user.aiecnu.net/` 验证首页、子路由刷新、登录和 WebSocket 连接。CDN 刷新任务提交成功不代表所有节点立即完成刷新。

本地构建验证命令为 `npm ci`、`npm run build:dev` 和 `npm run build:prod`。GitLab 的 **Build → Pipeline editor → Validate** 可验证包含共享模板后的完整配置。实际云发布还依赖上述桶、变量、域名和 Runner。

`package-lock.json` 已同步当前依赖声明，并将原先的内部 npm 下载地址改为公共 npm 地址，避免 Runner 依赖内部包源。已有依赖版本保持不变；新增当前构建需要的 `vite-plugin-compression` 及其依赖，移除已不在 `package.json` 中的 `lucide-react`。
