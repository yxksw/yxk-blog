# waline使用neon数据库和在vercel部署

> 由于[Leancloud](https://console.leancloud.app/)已于26年年初开始逐步停止服务，并在明年年初将停运，于是，使用neon数据库来替代，基于Waline的[官方文档](https://waline.js.org/guide/get-started/#%E5%88%9B%E5%BB%BA%E6%95%B0%E6%8D%AE%E5%BA%93)来进行部署，但是遇到了问题，再参考[文章](https://www.dearom.com/blog/20260222-waline-neon-database-guide)来完善部署方案。

在部署博客的过程中，我选取Waline作为评论系统，于是根据文档来部署：

<p align="center">
  <a href="https://vercel.com/button">
    <img src="https://vercel.com/button" alt="Deploy to Vercel" />
  </a>
</p>

> 点击上方按钮来部署

但是目前部署会出现下图的问题

![](https://cdn.jsdmirror.com/gh/zsxcoder/github-img@main/img/waline-1.avif)

## 创建数据库

1. 点击顶部的 `Storage` 进入存储服务配置页，选择 `Create Database` 创建数据库。`Marketplace Database Providers` 数据库服务选择 `Neon`，点击 `Continue` 进行下一步。
   ![](https://cdn.jsdmirror.com/gh/zsxcoder/github-img@main/img/waline-2.avif)

2. 此时会让你创建一个 `Neon` 账号，此时选择 `Accept and Create` 接受并创建。后续选择数据库的套餐配置，包括地区和额度。这里可以什么都不操作直接选择 `Continue` 下一步。
   ![](https://cdn.jsdmirror.com/gh/zsxcoder/github-img@main/img/waline-3.avif)

3. 此时会让你定义数据库名称，这里也可以不用修改直接 `Continue` 进行下一步。
   ![](https://cdn.jsdmirror.com/gh/zsxcoder/github-img@main/img/waline-4.avif)

4. 这时候 `Storage` 下就有你创建的数据库服务了，点击进去选择 `Open in Neon` 跳转到 `Neon`。在 `Neon` 界面左侧选择 `SQL Editor`，将 `waline.pgsql` 中的 `SQL` 语句粘贴进编辑器中，点击 `Run` 执行创建表操作。
   ![](https://cdn.jsdmirror.com/gh/zsxcoder/github-img@main/img/waline-5.avif)

![](https://cdn.jsdmirror.com/gh/zsxcoder/github-img@main/img/waline-6.avif)

4. 稍等片刻之后会告知你创建成功。此时回到 Vercel，点击顶部的 `Deployments` 点击顶部最新的一次部署右侧的 `Redeploy` 按钮进行重新部署。该步骤是为了让刚才配置的数据库服务生效。
   ![](https://cdn.jsdmirror.com/gh/zsxcoder/github-img@main/img/waline-7.avif)

5. 此时会跳转到 `Overview` 界面开始部署，等待片刻后 `STATUS` 会变成 `Ready`。此时请点击 `Visit` ，即可跳转到部署好的网站地址，此地址即为你的服务端地址。
   ![](https://cdn.jsdmirror.com/gh/zsxcoder/github-img@main/img/waline-8.avif)

以上就是官方文档相关部分，接下来是补充：

**Neon数据库配置信息**

![](https://cdn.jsdmirror.com/gh/zsxcoder/github-img@main/img/waline-9.avif)

在上图部分复制数据库信息：

| 变量          | 值                      |
| ------------- | ----------------------- |
| `PG_HOST`     | 取`PGHOST_UNPOOLED`的值 |
| `PG_DB`       | 取`PGDATABASE`的值      |
| `PG_USER`     | 取`POSTGRES_USER`的值   |
| `PG_PASSWORD` | 取`PGPASSWORD`的值      |
| `PG_SSL`      | 填`true`                |

**Vercel环境变量设置**

![](https://cdn.jsdmirror.com/gh/zsxcoder/github-img@main/img/waline-10.avif)

> 提示： 添加环境变量后，需要进入`Vercel`项目的`Deployments`页面，找到最新部署点击 "Redeploy"，变量才会生效。
