# XY-AI

一个基于 Vue 3 的 AI Agent 工作流管理平台，提供智能体管理、工作流编排、知识库管理等功能。

## 项目简介

Faber-AI 是一个现代化的 AI 应用开发平台，旨在帮助用户快速构建、部署和管理 AI 智能体及其工作流程。通过直观的可视化界面，用户可以轻松创建复杂的 AI 工作流，管理知识库，配置工具和模板。

## 核心功能

### 🤖 智能体管理 (Agent Management)

- 创建和配置 AI 智能体
- 智能体执行和监控
- 智能体市场，共享和发现新智能体
- A2A (Agent-to-Agent) 通信协议支持

### 🔄 工作流编排 (Workflow Editor)

- 基于 Vue Flow 的可视化工作流编辑器
- 拖拽式节点编排
- 支持多种节点类型（LLM、工具、条件判断等）
- 工作流测试和调试

### 📚 知识库管理 (Knowledge Base)

- 创建和管理知识库
- 文档上传和解析
- 知识库搜索功能
- 支持多种数据源

### 🛠️ 工具管理 (Tool Management)

- 工具注册和配置
- MCP (Model Context Protocol) 市场
- 自定义工具开发

### 📝 模板管理 (Template Management)

- 预定义模板库
- 自定义模板创建
- 模板分类和搜索

### 💾 云存储 (Cloud Storage)

- 文件上传和管理
- 云端资源组织

### 🎯 模型管理 (Model Management)

- 多种 AI 模型配置
- 模型参数调优
- 模型性能监控

### 👤 用户系统

- 用户注册和登录
- 个人资料管理
- 订阅管理
- 权限控制

## 技术栈

### 前端框架

- **Vue 3.3.4** - 渐进式 JavaScript 框架
- **TypeScript 5.1.6** - 类型安全的 JavaScript 超集
- **Vite 4.4.6** - 下一代前端构建工具

### 状态管理

- **Pinia 2.1.4** - Vue 状态管理库
- **pinia-plugin-persistedstate** - Pinia 持久化插件

### UI 组件库

- **Element Plus 2.3.8** - 基于 Vue 3 的组件库
- **@element-plus/icons-vue** - Element Plus 图标库
- **@mdi/font** - Material Design 图标

### 工作流可视化

- **@vue-flow/core 1.44.0** - Vue 流程图组件
- **@vue-flow/background** - 背景网格
- **@vue-flow/controls** - 控制组件
- **@vue-flow/minimap** - 小地图
- **D3 7.9.0** - 数据可视化库

### 编辑器

- **@milkdown/core 7.15.5** - Markdown 编辑器框架
- **@wangeditor/editor 5.1.23** - 富文本编辑器

### 工具库

- **Axios 1.9.0** - HTTP 客户端
- **Vue Router 4.2.4** - 路由管理
- **Day.js 1.11.13** - 日期处理
- **marked 15.0.12** - Markdown 解析器
- **highlight.js 11.11.1** - 代码高亮
- **DOMPurify 3.2.6** - XSS 防护
- **QRCode 1.5.4** - 二维码生成

### 开发工具

- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Sass** - CSS 预处理器
- **Vue TSC** - Vue TypeScript 编译器

## 项目结构

```
Faber-AI/
├── public/                  # 静态资源
├── src/
│   ├── api/                # API 接口
│   │   ├── agentService.ts
│   │   ├── auth.ts
│   │   ├── modelService.ts
│   │   ├── workflow.ts
│   │   ├── knowledgeBaseService.ts
│   │   └── ...
│   ├── assets/             # 资源文件
│   ├── components/         # Vue 组件
│   │   ├── WorkflowEditor/ # 工作流编辑器组件
│   │   ├── agent/          # 智能体组件
│   │   ├── knowledge/      # 知识库组件
│   │   ├── tools/          # 工具组件
│   │   └── ...
│   ├── composables/        # 组合式函数
│   ├── constants/          # 常量定义
│   ├── hooks/              # 自定义钩子
│   ├── mocks/              # Mock 数据
│   ├── router/             # 路由配置
│   ├── stores/             # Pinia 状态管理
│   ├── styles/             # 全局样式
│   ├── templates/          # 模板文件
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # 工具函数
│   ├── views/              # 页面视图
│   ├── App.vue             # 根组件
│   └── main.ts             # 入口文件
├── .env.development        # 开发环境变量
├── .env.production         # 生产环境变量
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
└── package.json            # 项目依赖
```

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0 或 pnpm >= 6.0.0

### 安装依赖

```bash
# 使用 npm
npm install

# 或使用 pnpm
pnpm install
```

### 开发环境运行

```bash
npm run dev
```

应用将在 http://127.0.0.1:5173 启动

### 生产环境构建

```bash
npm run build
```

### 代码检查

```bash
# 运行 ESLint
npm run lint

# 格式化代码
npm run format
```

### 类型检查

```bash
npm run type-check
```

## 环境配置

### 开发环境 (.env.development)

```
VITE_API_BASE_URL=http://localhost:8888/api
VITE_APP_TITLE=AI Agent Workflow
```

### 生产环境 (.env.production)

根据实际部署环境配置 API 地址

## API 代理配置

开发环境下，Vite 会自动将 `/api` 路径的请求代理到 `http://localhost:8888`，详见 `vite.config.ts`。

## 主要页面路由

### 公开页面

- `/login` - 登录页面
- `/register` - 注册页面
- `/forgot-password` - 忘记密码

### 需要认证的页面

- `/` - 首页
- `/profile` - 个人资料
- `/settings` - 设置
- `/tasks` - 任务列表
- `/agents` - 智能体管理
- `/agents/:id/execute` - 智能体执行
- `/models` - 模型管理
- `/knowledge` - 知识库管理
- `/knowledge/:id` - 知识库详情
- `/tools` - 工具管理
- `/templates` - 模板管理
- `/workflows` - 工作流管理
- `/workflows/:id` - 工作流编辑器
- `/mcp-market` - MCP 市场
- `/agent-market` - 智能体市场
- `/cloud-storage` - 云存储
- `/subscription` - 订阅管理

## 开发指南

### 代码规范

- 遵循 ESLint 和 Prettier 配置
- 使用 TypeScript 进行类型安全开发
- 组件命名采用 PascalCase
- 文件命名采用 camelCase

### Git 提交规范

建议使用语义化提交信息：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

### 组件开发

- 优先使用 Composition API
- 使用 `<script setup>` 语法糖
- 合理使用 Pinia 进行状态管理
- 组件按功能模块组织

## 浏览器支持

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## 许可证

私有项目 - 保留所有权利

## 联系方式

如有问题或建议，请联系项目维护团队。

---

**XY-AI** - 让 AI 开发更简单、更高效
