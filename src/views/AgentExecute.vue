<template>
  <div class="agent-execute-container">
    <!-- 开场白编辑对话框 -->
    <el-dialog
      v-model="openingDialogueEditorVisible"
      title="编辑开场白"
      width="600px"
      :before-close="handleOpeningDialogueClose"
    >
      <RichTextEditor v-model="openingDialogueTemp" :height="300" />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="openingDialogueEditorVisible = false">取消</el-button>
          <el-button type="primary" @click="saveOpeningDialogue">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 工具选择对话框 -->
    <ToolSelectionDialog
      v-model:visible="toolSelectionVisible"
      :tools="availableTools"
      :tool-type-map="toolTypeMap"
      @submit="handleToolsSelected"
      @cancel="toolSelectionVisible = false"
    />

    <!-- 工作流选择对话框 -->
    <WorkflowSelectionDialog
      v-model:visible="workflowSelectionVisible"
      :available-workflows="availableWorkflows"
      @submit="handleWorkflowsSelected"
      @cancel="workflowSelectionVisible = false"
    />

    <!-- 知识库选择对话框 -->
    <KnowledgeBaseSelectionDialog
      v-model:visible="knowledgeBaseSelectionVisible"
      :available-knowledge-bases="availableKnowledgeBases"
      @submit="handleKnowledgeBasesSelected"
      @cancel="knowledgeBaseSelectionVisible = false"
    />

    <!-- Agent选择对话框 -->
    <AgentSelectionDialog
      v-model:visible="agentSelectionVisible"
      :current-agent-id="agentId"
      @submit="handleAgentCalled"
      @cancel="agentSelectionVisible = false"
    />

    <!-- 智能体信息编辑对话框 -->
    <el-dialog v-model="agentInfoEditorVisible" title="编辑智能体信息" width="500px">
      <el-form :model="agentInfoForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="agentInfoForm.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="agentInfoForm.description" type="textarea" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="agentInfoForm.status" style="width: 100%">
            <el-option
              v-for="status in statusOptions"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="agentInfoEditorVisible = false">取消</el-button>
          <el-button type="primary" @click="saveAgentInfo">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 会话管理器 -->
    <el-drawer v-model="sessionManagerVisible" title="会话管理" direction="rtl" size="400px">
      <SessionManager
        :agent-id="agentId"
        :sessions="sessions"
        :current-session="currentSession"
        @switch-session="handleSwitchSession"
        @refresh-sessions="loadSessions"
        @create-new-session="createNewSession"
      />
    </el-drawer>

    <!-- 返回按钮 -->
    <div class="return-header">
      <el-button @click="returnToAgentList" type="primary" plain class="return-button">
        <el-icon><ArrowLeft /></el-icon>
        返回智能体列表
      </el-button>
    </div>

    <!-- 主要内容区：分为左侧配置、中间资源和右侧聊天 -->
    <div class="main-content">
      <!-- 左侧：系统提示词、开场白、模型设置等配置信息 -->
      <div class="config-section">
        <el-card class="config-card">
          <template #header>
            <div class="config-header">
              <span>基础配置</span>
              <el-button link type="primary" @click="openAgentInfoEditor" class="edit-button">
                <el-icon><Edit /></el-icon>编辑
              </el-button>
            </div>
          </template>
          <el-form :model="agent" label-width="100px" label-position="left">
            <el-form-item label="名称">
              <div class="agent-basic-info">
                <span class="agent-name">{{ agent.name }}</span>
              </div>
            </el-form-item>

            <el-form-item label="描述">
              <div class="agent-basic-info">
                <span class="agent-description">{{ agent.description }}</span>
              </div>
            </el-form-item>

            <el-form-item label="状态">
              <el-tag :type="getStatusTagType(agent.status)" class="agent-status">
                {{ getStatusLabel(agent.status) }}
              </el-tag>
            </el-form-item>

            <el-form-item label="系统提示词">
              <MilkdownEditor v-model="agent.systemPrompt" class="system-prompt-editor" />
            </el-form-item>

            <el-form-item label="开场白">
              <div class="opening-dialogue-container">
                <div class="opening-dialogue-preview" @click="openOpeningDialogueEditor">
                  <div v-if="agent.openingDialogue" v-html="agent.openingDialogue"></div>
                  <div v-else class="placeholder">点击编辑开场白</div>
                </div>
              </div>
            </el-form-item>

            <el-form-item label="模型提供商" v-if="!agent.a2aEndpoint">
              <el-select
                v-model="selectedProvider"
                placeholder="请选择模型提供商"
                style="width: 100%"
                @change="handleProviderChange"
              >
                <el-option
                  v-for="provider in chatModelProviders"
                  :key="provider.id"
                  :label="getProviderName(provider.provider)"
                  :value="provider.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="模型" v-if="!agent.a2aEndpoint">
              <el-select
                v-model="selectedModel"
                placeholder="请选择模型"
                style="width: 100%"
                :disabled="!selectedProvider"
                @change="handleModelChange"
              >
                <el-option
                  v-for="model in chatModels"
                  :key="model.id"
                  :label="model.name"
                  :value="model.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="温度" v-if="!agent.a2aEndpoint">
              <el-slider
                v-model="agent.modelParameters.temperature"
                :min="0"
                :max="1"
                :step="0.1"
                show-input
              />
            </el-form-item>

            <el-form-item label="最大Token数" v-if="!agent.a2aEndpoint">
              <el-input-number
                v-model="agent.modelParameters.maxTokens"
                :min="100"
                :max="10000000"
                :step="100"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="Top P" v-if="!agent.a2aEndpoint">
              <el-slider
                v-model="agent.modelParameters.topP"
                :min="0"
                :max="1"
                :step="0.1"
                show-input
              />
            </el-form-item>

            <el-form-item label="A2A端点" v-if="agent.a2aEndpoint">
              <el-input v-model="agent.a2aEndpoint" disabled />
            </el-form-item>
            <div class="config-actions">
              <el-button type="primary" @click="saveConfig">保存配置</el-button>
            </div>
          </el-form>
        </el-card>
      </div>

      <!-- 中间：工具、工作流、知识库等资源区域 -->
      <div class="resources-section">
        <el-tabs type="border-card" class="resources-tabs">
          <el-tab-pane label="工具">
            <div class="resources-content">
              <div class="resources-header">
                <el-button @click="addTool" type="primary" size="small">
                  <el-icon><Plus /></el-icon>添加工具
                </el-button>
              </div>
              <div v-if="agent?.tools && agent.tools.length > 0">
                <el-table :data="agent.tools" style="width: 100%" size="small">
                  <el-table-column prop="name" label="工具名称" />
                  <el-table-column prop="description" label="描述">
                    <template #default="{ row }">
                      <span :title="row.description" class="description-cell">
                        {{
                          row.description?.length > 50
                            ? row.description.substring(0, 50) + '...'
                            : row.description || '-'
                        }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="150">
                    <template #default="{ row }">
                      <el-button size="small" type="danger" @click="removeTool(row)"
                        >移除</el-button
                      >
                    </template>
                  </el-table-column>
                </el-table>
              </div>
              <div v-else class="empty-resources">
                <el-empty description="暂无工具" />
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="工作流">
            <div class="resources-content">
              <div class="resources-header">
                <el-button @click="addWorkflow" type="primary" size="small">
                  <el-icon><Plus /></el-icon>添加工作流
                </el-button>
              </div>
              <div v-if="agent?.workflows && agent.workflows.length > 0">
                <el-table :data="agent.workflows" style="width: 100%" size="small">
                  <el-table-column prop="name" label="工作流名称" />
                  <el-table-column prop="description" label="描述">
                    <template #default="{ row }">
                      <span :title="row.description" class="description-cell">
                        {{
                          row.description?.length > 50
                            ? row.description.substring(0, 50) + '...'
                            : row.description || '-'
                        }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="默认" width="80">
                    <template #default="{ row }">
                      <el-tag v-if="row.is_default" type="success">默认</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="状态" width="80">
                    <template #default="{ row }">
                      <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
                        {{ row.status === 'enabled' ? '启用' : '禁用' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="200">
                    <template #default="{ row }">
                      <el-button
                        size="small"
                        type="success"
                        @click="setDefaultWorkflow(row)"
                        :disabled="row.is_default"
                      >
                        设为默认
                      </el-button>
                      <el-button
                        size="small"
                        :type="row.status === 'enabled' ? 'info' : 'success'"
                        @click="toggleWorkflowStatus(row)"
                      >
                        {{ row.status === 'enabled' ? '禁用' : '启用' }}
                      </el-button>
                      <el-button size="small" type="danger" @click="removeWorkflow(row)"
                        >移除</el-button
                      >
                    </template>
                  </el-table-column>
                </el-table>
              </div>
              <div v-else class="empty-resources">
                <el-empty description="暂无工作流" />
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="知识库">
            <div class="resources-content">
              <div class="resources-header">
                <el-button @click="addKnowledgeBase" type="primary" size="small">
                  <el-icon><Plus /></el-icon>添加知识库
                </el-button>
              </div>
              <div v-if="agent?.knowledgeBases && agent.knowledgeBases.length > 0">
                <el-table :data="agent.knowledgeBases" style="width: 100%" size="small">
                  <el-table-column prop="name" label="知识库名称" />
                  <el-table-column prop="description" label="描述">
                    <template #default="{ row }">
                      <span :title="row.description" class="description-cell">
                        {{
                          row.description?.length > 50
                            ? row.description.substring(0, 50) + '...'
                            : row.description || '-'
                        }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="file_count" label="文件数" width="80" />
                  <el-table-column label="状态" width="80">
                    <template #default="{ row }">
                      <el-tag :type="row.status === 'enabled' ? 'success' : 'info'">
                        {{ row.status === 'enabled' ? '启用' : '禁用' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="150">
                    <template #default="{ row }">
                      <el-button
                        size="small"
                        :type="row.status === 'enabled' ? 'info' : 'success'"
                        @click="toggleKnowledgeBaseStatus(row)"
                      >
                        {{ row.status === 'enabled' ? '禁用' : '启用' }}
                      </el-button>
                      <el-button size="small" type="danger" @click="removeKnowledgeBase(row)"
                        >移除</el-button
                      >
                    </template>
                  </el-table-column>
                </el-table>
              </div>
              <div v-else class="empty-resources">
                <el-empty description="暂无知识库" />
              </div>
            </div>
          </el-tab-pane>

          <!-- 新增智能体Tab -->
          <el-tab-pane label="智能体">
            <div class="resources-content">
              <div class="resources-header">
                <el-button @click="addAgent" type="primary" size="small">
                  <el-icon><Plus /></el-icon>添加智能体
                </el-button>
              </div>
              <div v-if="agent?.agentMarkets && agent.agentMarkets.length > 0">
                <el-table :data="agent.agentMarkets" style="width: 100%" size="small">
                  <el-table-column prop="name" label="智能体名称" />
                  <el-table-column prop="description" label="描述">
                    <template #default="{ row }">
                      <span :title="row.description" class="description-cell">
                        {{
                          row.description?.length > 50
                            ? row.description.substring(0, 50) + '...'
                            : row.description || '-'
                        }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="150">
                    <template #default="{ row }">
                      <el-button size="small" type="danger" @click="removeAgent(row)"
                        >移除</el-button
                      >
                    </template>
                  </el-table-column>
                </el-table>
              </div>
              <div v-else class="empty-resources">
                <el-empty description="暂无关联智能体" />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 右侧：聊天区域 -->
      <div class="chat-section-wrapper">
        <div class="chat-header">
          <div class="session-info"></div>
          <div class="chat-actions">
            <el-button type="primary" size="small" @click="createNewSession" :icon="Plus">
              新建会话
            </el-button>
            <el-button type="default" size="small" @click="showSessionManager" :icon="Clock">
              会话历史
            </el-button>
          </div>
        </div>
        <ChatSection
          :messages="messages"
          v-model:userInput="userInput"
          :loading="loading"
          @sendMessage="sendMessage"
          @insertCodeBlock="insertCodeBlock"
          @insertLink="insertLink"
          @handleImageUpload="handleImageUpload"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Connection, Edit, Plus, More, Clock } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

import ChatSection from '@/components/agent/ChatSection.vue'
import RichTextEditor from '@/components/RichTextEditor.vue'
import MilkdownEditor from '@/components/MilkdownEditor.vue'
import ToolSelectionDialog from '@/components/dialogs/ToolSelectionDialog.vue'
import WorkflowSelectionDialog from '@/components/dialogs/WorkflowSelectionDialog.vue'
import KnowledgeBaseSelectionDialog from '@/components/dialogs/KnowledgeBaseSelectionDialog.vue'
import AgentSelectionDialog from '@/components/dialogs/AgentSelectionDialog.vue'
import SessionManager from '@/components/agent/SessionManager.vue'
import { AgentService } from '@/api/agentService'
import { ToolService } from '@/api/toolService'
import * as WorkflowService from '@/api/workflow'
import { KnowledgeBaseService } from '@/api/knowledgeBaseService'
import { ModelService } from '@/api/modelService'
import { a2aService } from '@/api/a2aService'
import { extractHtmlFromMarkdown } from '@/utils/md'

const route = useRoute()
const router = useRouter()

const agent = ref({
  name: '',
  description: '',
  status: 'draft',
  systemPrompt: '',
  openingDialogue: '',
  modelProvider: '',
  modelName: '',
  modelParameters: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1.0,
  },
  // 向量化模型配置
  embeddingModelProvider: '',
  embeddingModelName: '',
  embeddingModelParameters: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1.0,
  },
  tools: [],
  workflows: [],
  knowledgeBases: [],
  agentMarkets: [],
})

// 对话模型相关数据
const chatModelProviders = ref([])
const chatModels = ref([])
const selectedProvider = ref('')
const selectedModel = ref('')

// 向量化模型相关数据
const embeddingModelProviders = ref([])
const embeddingModels = ref([])
const selectedEmbeddingProvider = ref('')
const selectedEmbeddingModel = ref('')

// 视觉模型相关数据
const visionModelProviders = ref([])
const visionModels = ref([])
const selectedVisionProvider = ref('')
const selectedVisionModel = ref('')

const agentId = ref('')
// 开场白编辑器相关
const openingDialogueEditorVisible = ref(false)
const openingDialogueTemp = ref('')

// 智能体信息编辑相关
const agentInfoEditorVisible = ref(false)
const agentInfoForm = ref({
  name: '',
  description: '',
  status: 'draft',
})

// 状态选项
const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'testing', label: '测试中' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
]

// 工具选择相关
const toolSelectionVisible = ref(false)
const availableTools = ref([])
const selectedTools = ref([])

// 工作流选择相关
const workflowSelectionVisible = ref(false)
const availableWorkflows = ref([])

// 知识库选择相关
const knowledgeBaseSelectionVisible = ref(false)
const availableKnowledgeBases = ref([])

// 会话管理相关
const currentSession = ref(null)
const sessions = ref([])
const sessionManagerVisible = ref(false)

const messages = ref([])
const userInput = ref('')
const loading = ref(false)

// 工具类型映射
const toolTypeMap = {
  mcp: { name: 'MCP工具', tagType: 'success' },
  system: { name: '系统工具', tagType: 'primary' },
}

// 状态标签类型
const getStatusTagType = (status) => {
  switch (status) {
    case 'draft':
      return 'info'
    case 'testing':
      return 'warning'
    case 'published':
      return 'success'
    case 'archived':
      return ''
    default:
      return 'info'
  }
}

// 状态标签文本
const getStatusLabel = (status) => {
  return statusOptions.find((opt) => opt.value === status)?.label || status
}

// 打开智能体信息编辑器
const openAgentInfoEditor = () => {
  agentInfoForm.value = {
    name: agent.value.name,
    description: agent.value.description,
    status: agent.value.status,
  }
  agentInfoEditorVisible.value = true
}

// 保存智能体信息
const saveAgentInfo = async () => {
  try {
    await AgentService.updateAgent({
      id: agentId.value,
      name: agentInfoForm.value.name,
      description: agentInfoForm.value.description,
      status: agentInfoForm.value.status,
    })

    // 更新本地agent数据
    agent.value.name = agentInfoForm.value.name
    agent.value.description = agentInfoForm.value.description
    agent.value.status = agentInfoForm.value.status

    agentInfoEditorVisible.value = false
    ElMessage.success('智能体信息保存成功')
  } catch (error) {
    ElMessage.error(`保存失败: ${error.message || '未知错误'}`)
  }
}

// 获取提供商显示名称
const getProviderName = (provider) => {
  const providerNames = {
    openai: 'OpenAI',
    azure_openai: 'Azure OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    local: '本地模型',
    ollama: 'Ollama',
    bailian: '百炼',
    baichuan: '百川',
    zhipu: '智谱',
    tencent: '腾讯',
    deepseek: 'DeepSeek',
  }
  return providerNames[provider] || provider
}

// 获取模型提供商和模型列表
const loadModelProviders = async () => {
  try {
    // 加载对话模型提供商
    const chatProvidersResponse = await ModelService.listProviderConfigs()
    chatModelProviders.value = chatProvidersResponse.providerConfigs

    // 如果还没有选择提供商，则默认选择第一个
    if (chatModelProviders.value.length > 0 && !selectedProvider.value) {
      selectedProvider.value = chatModelProviders.value[0].id
      await loadChatModels(selectedProvider.value)
    }
  } catch (error) {
    ElMessage.error(`获取模型提供商失败: ${error.message || '未知错误'}`)
  }
}

// 根据提供商加载对话模型列表
const loadChatModels = async (providerConfigId) => {
  try {
    const response = await ModelService.listLLMs({ modelType: 'chat' })
    // 过滤出指定提供商的模型
    chatModels.value = response.llms.filter((model) => model.providerConfigId === providerConfigId)

    // 如果还没有选择模型，且有模型列表，则默认选择第一个
    if (!selectedModel.value && chatModels.value.length > 0) {
      selectedModel.value = chatModels.value[0].id
    }
  } catch (error) {
    ElMessage.error(`获取对话模型列表失败: ${error.message || '未知错误'}`)
  }
}

// 根据提供商加载向量化模型列表
const loadEmbeddingModels = async (providerConfigId) => {
  try {
    const response = await ModelService.listLLMs({ modelType: 'embedding' })
    // 过滤出指定提供商的模型
    embeddingModels.value = response.llms.filter(
      (model) => model.providerConfigId === providerConfigId,
    )

    // 如果还没有选择模型，且有模型列表，则默认选择第一个
    if (!selectedEmbeddingModel.value && embeddingModels.value.length > 0) {
      selectedEmbeddingModel.value = embeddingModels.value[0].id
    }
  } catch (error) {
    ElMessage.error(`获取向量化模型列表失败: ${error.message || '未知错误'}`)
  }
}

// 根据提供商加载视觉模型列表
const loadVisionModels = async (providerConfigId) => {
  try {
    const response = await ModelService.listLLMs({ modelType: 'vision' })
    // 过滤出指定提供商的模型
    visionModels.value = response.llms.filter(
      (model) => model.providerConfigId === providerConfigId,
    )

    // 如果还没有选择模型，且有模型列表，则默认选择第一个
    if (!selectedVisionModel.value && visionModels.value.length > 0) {
      selectedVisionModel.value = visionModels.value[0].id
    }
  } catch (error) {
    ElMessage.error(`获取视觉模型列表失败: ${error.message || '未知错误'}`)
  }
}

// 处理对话模型提供商变更
const handleProviderChange = async (providerConfigId) => {
  selectedModel.value = ''
  if (providerConfigId) {
    await loadChatModels(providerConfigId)
  }
}

// 处理向量化模型提供商变更
const handleEmbeddingProviderChange = async (providerConfigId) => {
  selectedEmbeddingModel.value = ''
  if (providerConfigId) {
    await loadEmbeddingModels(providerConfigId)
  }
}

// 处理对话模型变更
const handleModelChange = (modelId) => {
  // 模型变更时可以添加额外的处理逻辑
  console.log('选择的对话模型:', modelId)
}

// 在组件挂载时加载智能体数据
onMounted(async () => {
  // 从路由参数中获取智能体ID
  agentId.value = route.params.id

  // 加载模型提供商和模型
  await loadModelProviders()

  if (agentId.value) {
    try {
      // 调用API获取智能体数据
      const agentData = await AgentService.getAgent(agentId.value)

      // 映射模型数据
      agent.value = {
        ...agentData,
        modelProvider: agentData.modelProvider || '',
        modelName: agentData.modelName || '',
        modelParameters: {
          temperature: agentData.modelParameters?.temperature || 0.7,
          maxTokens: agentData.modelParameters?.maxTokens || 2000,
          topP: agentData.modelParameters?.topP || 1.0,
        },
      }
      // 设置选中的对话模型提供商和模型
      if (agent.value.modelProvider) {
        // 查找对应的提供商ID
        const provider = chatModelProviders.value.find(
          (p) => p.provider === agent.value.modelProvider,
        )
        if (provider) {
          selectedProvider.value = provider.id
          await loadChatModels(provider.id)
        }
      }

      if (agent.value.modelName) {
        // 查找对应的模型ID
        const model = chatModels.value.find((m) => m.modelName === agent.value.modelName)
        if (model) {
          selectedModel.value = model.id
        }
      }

      // 加载会话数据
      await loadSessions()
    } catch (error) {
      ElMessage.error(`加载智能体数据失败: ${error.message}`)
      console.error('加载智能体数据失败:', error)
    }
  }
})

// 加载会话数据
const loadSessions = async () => {
  try {
    const sessionList = await AgentService.listSession(agentId.value)
    sessions.value = sessionList

    // 如果有会话历史，加载最新会话的消息
    if (sessionList.length > 0) {
      const latestSession = [...sessionList].sort((a, b) => {
        const timeA = a.timestamp || a.createdAt || 0
        const timeB = b.timestamp || b.createdAt || 0
        return new Date(timeB) - new Date(timeA)
      })[0]
      if (!currentSession.value) {
        currentSession.value = latestSession
        await loadSessionMessages(latestSession.id)
      }
    } else {
      // 没有会话历史，清空当前会话和消息
      if (!currentSession.value) {
        currentSession.value = null
        messages.value = []
      }
    }
  } catch (error) {
    console.error('加载会话数据失败:', error)
    sessions.value = []
    if (!currentSession.value) {
      currentSession.value = null
      messages.value = []
    }
  }
}

// 加载会话消息
const loadSessionMessages = async (sessionId) => {
  try {
    const messageList = await AgentService.sessionMessages(sessionId)
    // 转换消息格式以匹配前端组件需要的格式
    messages.value = messageList.map((msg) => {
      // 解析时间戳
      const timestamp = new Date(msg.createdAt * 1000)

      // 处理用户消息
      if (msg.role === 'user') {
        return {
          id: msg.id,
          role: msg.role,
          contents: [{ type: 'text', content: msg.content }],
          timestamp: timestamp,
          status: 'received',
        }
      }

      // 处理助手消息
      if (msg.role === 'assistant') {
        try {
          // 尝试解析JSON格式的内容
          const parsedContent = JSON.parse(msg.content)

          // 如果是agent_answer类型的消息
          if (parsedContent.action === 'agent_answer') {
            var isThinking = false
            var content = parsedContent.content
            if (parsedContent.reasoningContent) {
              isThinking = true
              content = parsedContent.reasoningContent
            }
            return {
              id: msg.id,
              role: msg.role,
              contents: [
                {
                  type: 'agent_call',
                  agentName: parsedContent.agentName,
                  toolName: parsedContent.toolName,
                  content: content,
                  isThinking: isThinking,
                },
              ],
              timestamp: timestamp,
              status: 'received',
            }
          }

          // 其他类型的JSON消息
          return {
            id: msg.id,
            role: msg.role,
            contents: [{ type: 'text', content: msg.content }],
            timestamp: timestamp,
            status: 'received',
          }
        } catch (e) {
          // 如果不是JSON格式，作为普通文本处理
          return {
            id: msg.id,
            role: msg.role,
            contents: [{ type: 'text', content: msg.content }],
            timestamp: timestamp,
            status: 'received',
          }
        }
      }

      // 其他角色的消息
      return {
        id: msg.id,
        role: msg.role,
        contents: [{ type: 'text', content: msg.content }],
        timestamp: timestamp,
        status: 'received',
      }
    })
  } catch (error) {
    console.error('加载会话消息失败:', error)
    messages.value = []
  }
}

// 创建新会话（根据新需求，不调用createSession接口，只是清空当前会话）
const createNewSession = () => {
  // 清空当前会话和消息，后端会在第一次发送消息时自动创建会话
  currentSession.value = null
  messages.value = []
  ElMessage.success('已创建新会话')
}

// 显示会话管理器
const showSessionManager = async () => {
  try {
    // 重新加载会话列表
    await loadSessions()
    sessionManagerVisible.value = true
  } catch (error) {
    ElMessage.error(`加载会话历史失败: ${error.message || '未知错误'}`)
    console.error('加载会话历史失败:', error)
  }
}

// 处理切换会话
const handleSwitchSession = async (session) => {
  try {
    // 切换到新会话
    currentSession.value = session
    // 加载会话消息
    await loadSessionMessages(session.id)

    // 关闭会话管理器
    sessionManagerVisible.value = false

    ElMessage.success('已切换会话')
  } catch (error) {
    ElMessage.error(`切换会话失败: ${error.message || '未知错误'}`)
    console.error('切换会话失败:', error)
  }
}

// 处理会话命令（重命名、删除）
const handleSessionCommand = async (command) => {
  const { action, session } = command

  switch (action) {
    case 'rename':
      sessionToRename.value = session
      sessionNameToRename.value = session.title || ''
      renameSessionVisible.value = true
      break
    case 'delete':
      await deleteSession(session)
      break
  }
}

// 删除会话
const deleteSession = async (session) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除会话 "${session.title || '未命名会话'}" 吗？此操作不可撤销。`,
      '确认删除',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )

    // 删除会话
    await AgentService.deleteSession(session.id)

    // 从会话列表中删除
    const index = sessions.value.findIndex((s) => s.id === session.id)
    if (index !== -1) {
      sessions.value.splice(index, 1)

      // 如果删除的是当前会话，清空当前会话
      if (session.id === currentSession.value?.id) {
        currentSession.value = null
        messages.value = []

        // 如果还有其他会话，切换到第一个会话
        if (sessions.value.length > 0) {
          await switchToSession(sessions.value[0])
        }
      }

      ElMessage.success('会话删除成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`删除失败: ${error.message || '未知错误'}`)
    }
  }
}

// 确认重命名会话
const confirmRenameSession = async () => {
  if (sessionToRename.value) {
    try {
      // 注意：API中没有直接重命名会话的方法，这里可能需要通过更新会话来实现
      // 如果有更新会话的API，可以在这里调用
      ElMessage.info('会话重命名功能待实现')
    } catch (error) {
      ElMessage.error(`重命名失败: ${error.message || '未知错误'}`)
    }
  }

  renameSessionVisible.value = false
  sessionToRename.value = null
  sessionNameToRename.value = ''
}

// 处理会话历史关闭
const handleSessionHistoryClose = (done) => {
  sessionHistoryVisible.value = false
  done()
}

// 格式化会话时间
const formatSessionTime = (timestamp) => {
  if (!timestamp) return ''
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm')
}

const sendMessage = async () => {
  if (!userInput.value.trim()) return

  // 创建用户消息
  const userMessage = {
    id: Date.now().toString(),
    role: 'user',
    contents: [{ type: 'text', content: userInput.value }],
    timestamp: new Date(),
    status: 'sent',
  }

  // 添加用户消息到消息列表
  messages.value.push(userMessage)

  // 清空输入框
  const inputContent = userInput.value
  userInput.value = ''

  // 设置加载状态
  loading.value = true

  // 创建助手消息占位符
  const assistantMessage = {
    id: `response_${Date.now()}`,
    role: 'assistant',
    contents: [{ type: 'text', content: '' }],
    timestamp: new Date(),
    status: 'sending',
    thinking: true,
    thinkingContent: '',
    thinkingCompleted: false,
    interactionStatus: [],
  }

  // 添加助手消息占位符到消息列表
  messages.value.push(assistantMessage)
  const messageIndex = messages.value.length - 1

  try {
    // 使用流式传输方式发送消息
    let finalAnswerReceived = false
    // 用于处理跨chunk的数据缓冲区
    let buffer = ''
    await AgentService.sendMessageStream(
      agentId.value,
      {
        message: inputContent,
        sessionId: currentSession.value?.id, // 传递当前会话ID，如果没有会话，后端会自动创建
      },
      (chunk) => {
        console.log('Received chunk:', chunk)
        // 确保消息索引仍然有效
        if (messageIndex >= messages.value.length) {
          console.warn('Message index is out of bounds')
          return
        }
        // 将当前chunk与缓冲区连接
        const rawChunk = buffer + chunk.toString()
        // 清空缓冲区
        buffer = ''

        // // 按照 SSE 消息分隔符分割消息
        const messagesList = rawChunk.split('\n\n')

        // 如果最后一个元素不是以\n\n结尾，说明是不完整的，需要缓存到下一次处理
        if (!rawChunk.endsWith('\n\n') && messagesList.length > 0) {
          buffer = messagesList[messagesList.length - 1]
          messagesList.pop()
        }
        console.log('Messages list:', messagesList)
        for (const message of messagesList) {
          if (!message) continue
          let payload = message + '\n\n'
          if (message.startsWith('data: ')) {
            payload = message.substring(5) // 截取 "data:" 之后的所有内容
          }
          // 如果 "data:" 后面紧跟着一个空格，则移除这个空格。
          // 这符合 SSE 规范，并且不会影响内容内部的空格。
          if (payload.startsWith(' ')) {
            payload = payload.substring(1)
          }

          // 检测会话创建事件
          if (payload.startsWith('{"action":"session_created"')) {
            try {
              const sessionData = JSON.parse(payload)
              if (sessionData.sessionId && sessionData.title) {
                // 更新当前会话
                currentSession.value = {
                  id: sessionData.sessionId,
                  title: sessionData.title,
                  agentId: agentId.value,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }

                // 添加到会话列表
                sessions.value.unshift(currentSession.value)
              }
              continue
            } catch (e) {
              console.error('解析会话创建消息失败:', e)
            }
          }

          // 检测特殊标记
          // if (payload.trim() === '<think>') {
          //   if (messageIndex < messages.value.length) {
          //     messages.value[messageIndex].thinking = true
          //   }
          //   continue
          // }
          // if (payload.startsWith('{"action":"thinking"')) {
          //   if (messageIndex < messages.value.length) {
          //     messages.value[messageIndex].thinking = true
          //   }
          //   const finalAnswerData = JSON.parse(payload)
          //   if (finalAnswerData.data) {
          //     messages.value[messageIndex].thinkingContent =
          //       (messages.value[messageIndex].thinkingContent || '') + finalAnswerData.data
          //   }
          //   continue
          // }
          // if (!payload.startsWith('{"action":"thinking"')) {
          //   if (messageIndex < messages.value.length) {
          //     messages.value[messageIndex].thinking = false
          //   }
          // }
          // if (payload.trim() === '</think>') {
          //   if (messageIndex < messages.value.length) {
          //     messages.value[messageIndex].thinking = false
          //   }
          //   continue
          // }

          // if (payload.trim() === '\u001a') {
          //   // END_OF_TEXT unicode字符
          //   if (messageIndex < messages.value.length) {
          //     messages.value[messageIndex].thinking = false
          //   }
          //   continue
          // }

          // // 检测HTML显示内容 (新格式)
          // if (payload.startsWith('{"action":"final_answer"')) {
          //   try {
          //     const finalAnswerData = JSON.parse(payload)
          //     console.log('final_answer:', finalAnswerData)
          //     if (
          //       finalAnswerData.data &&
          //       finalAnswerData.data.type === 'html_display' &&
          //       finalAnswerData.data.htmlContent
          //     ) {
          //       // 创建新的HTML内容消息
          //       const htmlContent = {
          //         type: 'htmlDisplay',
          //         content: extractHtmlFromMarkdown(finalAnswerData.data.htmlContent),
          //       }
          //       // 确保消息仍然存在再更新内容
          //       if (messageIndex < messages.value.length) {
          //         messages.value[messageIndex].contents = [htmlContent]
          //         finalAnswerReceived = true
          //       }
          //       console.log('final_answer messages:', messages.value)
          //       continue
          //     } else {
          //       if (finalAnswerData.data) {
          //         messages.value[messageIndex].contents = [
          //           {
          //             type: 'text',
          //             content: finalAnswerData.data,
          //           },
          //         ]
          //         finalAnswerReceived = true
          //         console.log('final_answer text messages:', messages.value)
          //         continue
          //       }
          //     }
          //   } catch (e) {
          //     console.debug('Error parsing final answer data:', e)
          //   }
          // }
          console.log('Received message-------:', payload)
          if (payload.startsWith('{"action":"agent_answer"')) {
            const agentCardData = JSON.parse(payload)
            console.log('agent_answer:', agentCardData)
            // 处理 agent 返回的内容，支持连续调用
            if (agentCardData.content && agentCardData.agentName) {
              // 确保消息仍然存在再更新内容
              if (messageIndex < messages.value.length) {
                // 查找是否已存在相同 agent 的内容块
                let agentContentIndex = -1
                for (let i = 0; i < messages.value[messageIndex].contents.length; i++) {
                  const c = messages.value[messageIndex].contents[i]
                  if (
                    c.type === 'agent_call' &&
                    c.agentName === agentCardData.agentName &&
                    !c.isThinking &&
                    c.toolName === agentCardData.toolName
                  ) {
                    agentContentIndex = i
                    break
                  }
                }

                // 如果是纯文本内容且不是状态标记（如"completed"）
                if (
                  typeof agentCardData.content === 'string' &&
                  agentCardData.content !== 'completed' &&
                  agentCardData.content !== ''
                ) {
                  if (agentCardData.isErr) {
                    const errContent = {
                      type: 'agent_call',
                      agentName: agentCardData.agentName,
                      toolName: agentCardData.toolName,
                      content: agentCardData.content,
                      isThinking: false,
                      isErr: true,
                    }
                    messages.value[messageIndex].contents.push(errContent)
                  } else if (agentContentIndex >= 0) {
                    if (
                      !messages.value[messageIndex].contents[agentContentIndex].content.includes(
                        agentCardData.content,
                      )
                    ) {
                      messages.value[messageIndex].contents[agentContentIndex].content +=
                        agentCardData.content
                    }
                  } else {
                    const workflowResult = processWorkflowContent(
                      agentCardData.content,
                      agentCardData.toolName,
                    )
                    if (workflowResult) {
                      // 创建新的内容块用于显示 agent 调用信息
                      const newContent = {
                        type: 'agent_call',
                        agentName: agentCardData.agentName,
                        toolName: agentCardData.toolName,
                        content: workflowResult,
                        isThinking: false,
                        isErr: agentCardData.isErr ? true : false,
                      }
                      messages.value[messageIndex].contents.push(newContent)
                    } else {
                      // 创建新的内容块用于显示 agent 调用信息
                      const newContent = {
                        type: 'agent_call',
                        agentName: agentCardData.agentName,
                        toolName: agentCardData.toolName,
                        content: agentCardData.content,
                        isThinking: false,
                        isErr: agentCardData.isErr ? true : false,
                      }
                      messages.value[messageIndex].contents.push(newContent)
                    }
                  }
                }
              }
              continue
            } else if (agentCardData.reasoningContent) {
              if (messageIndex < messages.value.length) {
                let thinkingIndex = -1
                for (let i = 0; i < messages.value[messageIndex].contents.length; i++) {
                  const c = messages.value[messageIndex].contents[i]
                  if (
                    c.type === 'agent_call' &&
                    c.agentName === agentCardData.agentName &&
                    c.isThinking &&
                    c.toolName === agentCardData.toolName
                  ) {
                    thinkingIndex = i
                    break
                  }
                }
                if (thinkingIndex >= 0) {
                  messages.value[messageIndex].contents[thinkingIndex].content +=
                    agentCardData.reasoningContent
                } else {
                  const newContent = {
                    type: 'agent_call',
                    agentName: agentCardData.agentName,
                    toolName: agentCardData.toolName,
                    content: agentCardData.reasoningContent,
                    isThinking: true,
                    isErr: agentCardData.isErr ? true : false,
                  }
                  messages.value[messageIndex].contents.push(newContent)
                }
              }
              continue
            } else if (agentCardData.isErr) {
              const newContent = {
                type: 'agent_call',
                agentName: agentCardData.agentName,
                toolName: agentCardData.toolName,
                content: agentCardData.content,
                isThinking: false,
                isErr: agentCardData.isErr ? true : false,
              }
              if (messageIndex < messages.value.length) {
                messages.value[messageIndex].contents.push(newContent)
              }
              continue
            }
          }
          if (payload.trim() === '[DONE]') {
            continue
          }

          // 其他非事件文本，作为流式文本内容实时渲染到 contents[0]
          const payloadTrimmed = payload.trim()
          if (payloadTrimmed && !payloadTrimmed.startsWith('{')) {
            if (messageIndex < messages.value.length) {
              messages.value[messageIndex].contents[0].content += payloadTrimmed
            }
          }
        }
      },
      () => {
        if (currentSession.value?.id) {
          loadSessionMessages(currentSession.value.id)
        } else if (messageIndex < messages.value.length) {
          const msg = { ...messages.value[messageIndex] }
          msg.thinking = false
          msg.status = 'received'
          msg.timestamp = new Date()
          msg.contents = [...msg.contents.map((c) => ({ ...c }))]
          messages.value.splice(messageIndex, 1, msg)
        }
      },
      (error) => {
        // 流传输错误
        console.error('流式传输错误:', error)
        // 确保消息仍然存在
        if (messageIndex < messages.value.length) {
          messages.value[messageIndex].status = 'error'
          messages.value[messageIndex].contents = [
            {
              type: 'text',
              content: `消息响应出错: ${error.message || '未知错误'}`,
            },
          ]
        }
      },
    )
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error(`发送消息失败: ${error.message || '未知错误'}`)

    // 更新错误状态，确保消息仍然存在
    if (messageIndex < messages.value.length) {
      messages.value[messageIndex].status = 'error'
      messages.value[messageIndex].contents = [
        {
          type: 'text',
          content: `消息发送失败: ${error.message || '未知错误'}`,
        },
      ]
    }
  } finally {
    // 结束加载状态
    loading.value = false
  }
}

// 处理工作流执行结果内容
const processWorkflowContent = (content, toolName) => {
  // 检查是否是工作流执行工具调用
  if (toolName && toolName.startsWith('execute_workflow_')) {
    try {
      // 尝试解析JSON内容
      const jsonData = JSON.parse(content)

      // 检查是否符合指定的格式
      if (
        jsonData.result &&
        jsonData.result.input &&
        jsonData.result.input.type === 'htmlDisplay' &&
        jsonData.result.input.htmlContent
      ) {
        // 返回处理后的HTML显示内容
        return {
          type: 'htmlDisplay',
          content: jsonData.result.input.htmlContent,
        }
      }
    } catch (e) {
      // JSON解析失败，按普通文本处理
      console.warn('Failed to parse workflow content as JSON:', e)
    }
  }

  // 不符合特殊处理条件，按原样返回
  return null
}

const insertCodeBlock = () => {
  // 打开代码块插入对话框
  ElMessageBox.prompt('请输入代码', '插入代码块', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputPlaceholder: '在此输入代码...',
    customClass: 'code-input-dialog',
  })
    .then(({ value }) => {
      if (!value) return

      // 默认为 JavaScript 代码
      const codeContent = {
        type: 'code',
        language: 'javascript',
        content: value,
      }

      // 插入到用户输入中
      userInput.value += `
\`\`\`javascript
${value}
\`\`\`
`
    })
    .catch(() => {
      // 用户取消操作
    })
}

const insertLink = () => {
  // 打开链接插入对话框
  ElMessageBox.prompt('请输入链接地址', '插入链接', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPlaceholder: 'https://example.com',
  })
    .then(({ value }) => {
      if (!value) return

      // 插入到用户输入中
      userInput.value += ` [链接](${value}) `
    })
    .catch(() => {
      // 用户取消操作
    })
}

const handleImageUpload = (file) => {
  // 处理图片上传
  const reader = new FileReader()
  reader.onload = (e) => {
    // 插入到用户输入中
    userInput.value += `\n![图片](${e.target.result})\n`
  }
  reader.readAsDataURL(file)
}

// 保存配置
const saveConfig = async () => {
  try {
    // 查找选中的模型和提供商信息
    const selectedChatModel = chatModels.value.find((m) => m.id === selectedModel.value)
    const selectedChatProvider = chatModelProviders.value.find(
      (p) => p.id === selectedProvider.value,
    )

    const selectedEmbeddingModelObj = embeddingModels.value.find(
      (m) => m.id === selectedEmbeddingModel.value,
    )
    const selectedEmbeddingProviderObj = embeddingModelProviders.value.find(
      (p) => p.id === selectedEmbeddingProvider.value,
    )

    const selectedVisionModelObj = visionModels.value.find(
      (m) => m.id === selectedVisionModel.value,
    )
    const selectedVisionProviderObj = visionModelProviders.value.find(
      (p) => p.id === selectedVisionProvider.value,
    )

    await AgentService.updateAgent({
      id: agentId.value,
      systemPrompt: agent.value.systemPrompt,
      openingDialogue: agent.value.openingDialogue,
      modelProvider: selectedChatProvider?.provider || '',
      modelName: selectedChatModel?.modelName || '',
      modelParameters: agent.value.modelParameters,
      embeddingModelProvider: selectedEmbeddingProviderObj?.provider || '',
      embeddingModelName: selectedEmbeddingModelObj?.modelName || '',
      visionModelProvider: selectedVisionProviderObj?.provider || '',
      visionModelName: selectedVisionModelObj?.modelName || '',
    })
    ElMessage.success('配置保存成功')
  } catch (error) {
    ElMessage.error(`配置保存失败: ${error.message || '未知错误'}`)
  }
}

// 打开开场白编辑器
const openOpeningDialogueEditor = () => {
  openingDialogueTemp.value = agent.value.openingDialogue
  openingDialogueEditorVisible.value = true
}

// 保存开场白
const saveOpeningDialogue = () => {
  agent.value.openingDialogue = openingDialogueTemp.value
  openingDialogueEditorVisible.value = false
  ElMessage.success('开场白已保存')
}

// 处理开场白编辑器关闭
const handleOpeningDialogueClose = (done) => {
  ElMessageBox.confirm('确定要关闭吗？未保存的更改将会丢失')
    .then(() => {
      done()
    })
    .catch(() => {
      // 用户取消关闭
    })
}

// 返回智能体列表
const returnToAgentList = () => {
  router.push({ name: 'agents' })
}

// 添加工具
const addTool = async () => {
  // 先显示对话框
  toolSelectionVisible.value = true

  // 然后加载系统工具数据
  try {
    const response = await ToolService.getTools({ type: 'system' })
    availableTools.value = response.list || []
  } catch (error) {
    ElMessage.error(`获取工具列表失败: ${error.message || '未知错误'}`)
    // 如果加载失败，也要关闭对话框
    toolSelectionVisible.value = false
  }
}

const handleAgentCalled = async (agentMarket) => {
  const agentMarketIds = agentMarket.map((item) => item.id)
  await AgentService.addAgentToAgent(agentId.value, agentMarketIds)
  // 重新加载智能体数据以更新工具列表
  agent.value = await AgentService.getAgent(agentId.value)
}
const handleToolsSelected = async (toolsWithType) => {
  try {
    // 构造包含工具ID和类型的参数
    const toolParams = toolsWithType.map((item) => ({
      id: item.tool.id,
      type: item.type, // 'system' 或 'mcp'
    }))

    // 使用统一接口添加工具，传递工具ID和类型信息
    await AgentService.addToolsToAgent(agentId.value, toolParams)

    // 重新加载智能体数据以更新工具列表
    agent.value = await AgentService.getAgent(agentId.value)

    toolSelectionVisible.value = false
    ElMessage.success('工具添加成功')
  } catch (error) {
    ElMessage.error(`添加工具失败: ${error.message || '未知错误'}`)
  }
}

// 移除工具
const removeTool = async (tool) => {
  try {
    await ElMessageBox.confirm(`确定要从智能体中移除工具 "${tool.name}" 吗？`, '确认移除', {
      type: 'warning',
      confirmButtonText: '移除',
      cancelButtonText: '取消',
    })

    await AgentService.removeToolFromAgent(agentId.value, tool.id)

    // 重新加载智能体数据以更新工具列表
    agent.value = await AgentService.getAgent(agentId.value)

    ElMessage.success(`工具 ${tool.name} 移除成功`)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`移除工具失败: ${error.message || '未知错误'}`)
    }
  }
}

// 添加工作流
const addWorkflow = async () => {
  try {
    console.log('开始获取工作流列表...')
    // 获取所有可用的工作流
    const response = await WorkflowService.getWorkflowList()
    console.log('获取到的工作流列表:', response)

    // 检查响应数据结构并正确设置availableWorkflows
    if (Array.isArray(response)) {
      availableWorkflows.value = response
    } else if (response && Array.isArray(response.items)) {
      availableWorkflows.value = response.items
    } else if (response && Array.isArray(response.data)) {
      availableWorkflows.value = response.data
    } else if (response && Array.isArray(response.list)) {
      availableWorkflows.value = response.list
    } else {
      // 如果响应不是数组，尝试查找可能包含数组的属性
      let foundArray = false
      if (response && typeof response === 'object') {
        for (const key in response) {
          if (Array.isArray(response[key])) {
            availableWorkflows.value = response[key]
            foundArray = true
            break
          }
        }
      }

      if (!foundArray) {
        availableWorkflows.value = []
      }
    }

    console.log('设置availableWorkflows:', availableWorkflows.value)
    workflowSelectionVisible.value = true
    console.log('设置workflowSelectionVisible为true')
  } catch (error) {
    console.error('获取工作流列表失败:', error)
    ElMessage.error(`获取工作流列表失败: ${error.message || error.toString() || '未知错误'}`)
  }
}

const handleWorkflowsSelected = async (workflows) => {
  try {
    // 将选中的工作流添加到当前智能体
    const promises = workflows.map((workflow) =>
      AgentService.addWorkflowToAgent(agentId.value, workflow.id, {}),
    )

    await Promise.all(promises)

    // 重新加载智能体数据以更新工作流列表
    agent.value = await AgentService.getAgent(agentId.value)

    workflowSelectionVisible.value = false
    ElMessage.success('工作流添加成功')
  } catch (error) {
    ElMessage.error(`添加工作流失败: ${error.message || '未知错误'}`)
  }
}

// 设置默认工作流
const setDefaultWorkflow = async (workflow) => {
  try {
    await AgentService.setDefaultWorkflow(agentId.value, workflow.id)

    // 重新加载智能体数据以更新工作流列表
    agent.value = await AgentService.getAgent(agentId.value)

    ElMessage.success(`工作流 ${workflow.name} 已设为默认`)
  } catch (error) {
    ElMessage.error(`设置默认工作流失败: ${error.message || '未知错误'}`)
  }
}

// 切换工作流状态
const toggleWorkflowStatus = async (workflow) => {
  try {
    const newStatus = workflow.status === 'enabled' ? 'disabled' : 'enabled'
    await AgentService.updateAgentWorkflow(agentId.value, workflow.id, { status: newStatus })

    // 重新加载智能体数据以更新工作流列表
    agent.value = await AgentService.getAgent(agentId.value)

    ElMessage.success(`工作流 ${workflow.name} 状态已更新`)
  } catch (error) {
    ElMessage.error(`更新工作流状态失败: ${error.message || '未知错误'}`)
  }
}

// 移除工作流
const removeWorkflow = async (workflow) => {
  try {
    await ElMessageBox.confirm(`确定要从智能体中移除工作流 "${workflow.name}" 吗？`, '确认移除', {
      type: 'warning',
      confirmButtonText: '移除',
      cancelButtonText: '取消',
    })

    await AgentService.removeWorkflowFromAgent(agentId.value, workflow.id)

    // 重新加载智能体数据以更新工作流列表
    agent.value = await AgentService.getAgent(agentId.value)

    ElMessage.success(`工作流 ${workflow.name} 移除成功`)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`移除工作流失败: ${error.message || '未知错误'}`)
    }
  }
}

// 添加知识库
const addKnowledgeBase = async () => {
  try {
    // 获取所有可用的知识库
    const response = await KnowledgeBaseService.getKnowledgeBases()
    availableKnowledgeBases.value = response.knowledgeBases || []
    knowledgeBaseSelectionVisible.value = true
  } catch (error) {
    ElMessage.error(`获取知识库列表失败: ${error.message || '未知错误'}`)
  }
}

const handleKnowledgeBasesSelected = async (knowledgeBases) => {
  try {
    // 将选中的知识库添加到当前智能体
    const promises = knowledgeBases.map((kb) =>
      AgentService.addKnowledgeBaseToAgent(agentId.value, kb.id),
    )

    await Promise.all(promises)

    // 重新加载智能体数据以更新知识库列表
    agent.value = await AgentService.getAgent(agentId.value)

    knowledgeBaseSelectionVisible.value = false
    ElMessage.success('知识库添加成功')
  } catch (error) {
    ElMessage.error(`添加知识库失败: ${error.message || '未知错误'}`)
  }
}

// 移除知识库
const removeKnowledgeBase = async (knowledgeBase) => {
  try {
    await ElMessageBox.confirm(
      `确定要从智能体中移除知识库 "${knowledgeBase.name}" 吗？`,
      '确认移除',
      {
        type: 'warning',
        confirmButtonText: '移除',
        cancelButtonText: '取消',
      },
    )

    await AgentService.removeKnowledgeBaseFromAgent(agentId.value, knowledgeBase.id)

    // 重新加载智能体数据以更新知识库列表
    agent.value = await AgentService.getAgent(agentId.value)

    ElMessage.success(`知识库 ${knowledgeBase.name} 移除成功`)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`移除知识库失败: ${error.message || '未知错误'}`)
    }
  }
}

// 切换知识库状态
const toggleKnowledgeBaseStatus = async (knowledgeBase) => {
  try {
    // 知识库对象中可能没有status字段，需要从关联信息中获取
    const kbStatus = knowledgeBase.status || 'enabled'
    const newStatus = kbStatus === 'enabled' ? 'disabled' : 'enabled'

    // 查找对应的关联信息
    const agentKb = agent.value.knowledge_bases.find((kb) => kb.id === knowledgeBase.id)
    if (agentKb) {
      await AgentService.updateAgentKnowledgeBase(agentId.value, knowledgeBase.id, newStatus)

      // 重新加载智能体数据以更新知识库列表
      agent.value = await AgentService.getAgent(agentId.value)

      ElMessage.success(`知识库 ${knowledgeBase.name} 状态已更新`)
    }
  } catch (error) {
    ElMessage.error(`更新知识库状态失败: ${error.message || '未知错误'}`)
  }
}

const executeAgent = async () => {
  if (!agentId.value) {
    ElMessage.warning('请先保存智能体')
    return
  }

  try {
    await ElMessageBox.confirm('确定要执行智能体吗？这将启动一个新的对话会话。', '确认执行', {
      type: 'warning',
      confirmButtonText: '执行',
      cancelButtonText: '取消',
    })

    // 这里应该调用实际的执行API
    // 为演示目的，我们只是添加一条系统消息
    const systemMessage = {
      id: Date.now().toString(),
      role: 'system',
      contents: [
        {
          type: 'text',
          content: '智能体已启动，开始对话...',
        },
      ],
      timestamp: new Date().toISOString(),
      status: 'completed',
    }

    messages.value.push(systemMessage)
    userInput.value = ''
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`执行失败: ${error.message || '未知错误'}`)
    }
  }
}

// Agent选择相关
const agentSelectionVisible = ref(false)

// 新增添加智能体相关
const addAgent = () => {
  agentSelectionVisible.value = true
}

// 移除关联的智能体
const removeAgent = async (agentMarket) => {
  try {
    await ElMessageBox.confirm(`确定要从智能体中移除 "${agentMarket.name}" 吗？`, '确认移除', {
      type: 'warning',
      confirmButtonText: '移除',
      cancelButtonText: '取消',
    })

    await AgentService.removeAgentFromAgent(agentId.value, agentMarket.id)

    // 重新加载智能体数据以更新智能体列表
    agent.value = await AgentService.getAgent(agentId.value)

    ElMessage.success(`智能体 ${agentMarket.name} 移除成功`)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`移除智能体失败: ${error.message || '未知错误'}`)
    }
  }
}
</script>

<style scoped>
.description-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
.agent-execute-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0;
  background-color: var(--el-bg-color-page);
}

.return-header {
  flex-shrink: 0;
  padding: 16px 24px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.return-header .el-button {
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.return-header .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.return-button {
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.header {
  padding: 16px 24px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-area h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.description {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.actions {
  display: flex;
  gap: 12px;
}

.main-content {
  display: flex;
  flex: 1;
  padding: 16px;
  gap: 16px;
  overflow: hidden;
  min-height: 0;
}

.config-section {
  width: 400px;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color);
  overflow: hidden;
  box-shadow: var(--el-box-shadow-light);
  transition: all 0.3s ease;
  flex-shrink: 0;
  height: 100%;
}

.config-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: none;
  height: 100%;
  overflow: hidden;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.config-header .edit-button {
  padding: 4px 8px;
}

.config-card :deep(.el-card__header) {
  font-weight: 600;
  font-size: 16px;
  background-color: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color);
  flex-shrink: 0;
}

.config-card :deep(.el-card__body) {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--el-border-color-light);
}

.agent-basic-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--el-fill-color-light);
  border-radius: var(--el-border-radius-base);
  min-height: 40px;
}

.agent-name {
  font-weight: 500;
  font-size: 16px;
  color: var(--el-text-color-primary);
}

.agent-description {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.edit-button {
  padding: 4px 8px;
}

.opening-dialogue-container {
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  min-height: 100px;
  cursor: pointer;
  transition: all 0.3s;
  background-color: var(--el-fill-color-light);
}

.opening-dialogue-container:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 6px rgba(0, 123, 255, 0.15);
}

.opening-dialogue-preview {
  padding: 12px;
  min-height: 100px;
}

.opening-dialogue-preview .placeholder {
  color: var(--el-text-color-placeholder);
  font-style: italic;
}

.resources-section {
  width: 250px;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color);
  overflow: hidden;
  box-shadow: var(--el-box-shadow-light);
  transition: all 0.3s ease;
  flex-shrink: 0;
  height: 100%;
}

.resources-section:hover {
  box-shadow: var(--el-box-shadow);
}

.resources-tabs {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  border: none;
  border-radius: 0;
  height: 100%;
}

.resources-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
  background-color: var(--el-bg-color-page);
  flex-shrink: 0;
}

.resources-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.resources-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.resources-header {
  margin-bottom: 12px;
  display: flex;
  justify-content: flex-end;
}

.resources-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
  padding-top: 15px;
  border-top: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.empty-resources {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-section-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color);
  overflow: hidden;
  box-shadow: var(--el-box-shadow-light);
  transition: all 0.3s ease;
  min-height: 0;
}

.chat-section-wrapper:hover {
  box-shadow: var(--el-box-shadow);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-bg-color-page);
}

.session-info .el-tag {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-actions {
  display: flex;
  gap: 8px;
}

.system-prompt-editor {
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  width: 100%;
  height: 300px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tool-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-type-tag {
  height: 20px;
  line-height: 18px;
}

/* 会话历史样式 */
.session-history-content {
  max-height: 400px;
  overflow-y: auto;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  cursor: pointer;
  transition: all 0.3s;
}

.session-item:hover {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.session-item.active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  box-shadow: 0 0 0 1px var(--el-color-primary);
}

.session-info {
  flex: 1;
}

.session-name {
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--el-text-color-primary);
}

.session-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.message-count::after {
  content: '·';
  margin-left: 12px;
}

.session-actions {
  flex-shrink: 0;
}

@media (max-width: 1400px) {
  .config-section {
    width: 320px;
  }

  .resources-section {
    width: 360px;
  }
}

@media (max-width: 1200px) {
  .main-content {
    flex-direction: column;
  }

  .config-section,
  .resources-section {
    width: 100%;
    max-height: 300px;
  }

  .chat-section-wrapper {
    min-height: 50%;
    margin-top: 16px;
    flex: 1;
  }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .main-content {
    padding: 12px;
    gap: 12px;
  }

  .resources-section {
    display: none;
  }

  .config-section {
    max-height: 250px;
  }

  .return-header {
    padding: 12px 16px;
  }

  .chat-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .chat-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
