<template>
  <div class="agent-management">
    <el-card class="main-card">
      <template #header>
        <div class="header">
          <div class="header-content">
            <h2 class="page-title">智能体管理</h2>
            <div class="header-actions">
              <el-button type="primary" @click="handleCreate" class="create-button">
                <el-icon><Plus /></el-icon>
                新建智能体
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <!-- 搜索和筛选 -->
      <div class="filters">
        <el-input
          v-model="searchQuery"
          placeholder="搜索智能体名称或描述"
          clearable
          class="search-input"
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="statusFilter"
          placeholder="状态筛选"
          clearable
          class="status-filter"
          @change="handleSearch"
        >
          <el-option
            v-for="status in statusOptions"
            :key="status.value"
            :label="status.label"
            :value="status.value"
          />
        </el-select>

        <el-button type="primary" class="search-button" @click="handleSearch">
          <el-icon><Search /></el-icon>
          搜索
        </el-button>

        <el-button class="reset-button" @click="resetFilters"> 重置 </el-button>
      </div>

      <!-- 智能体列表 - 网格卡片布局 -->
      <div v-loading="agentStore.isLoading" class="agent-grid">
        <el-card
          v-for="agent in filteredAgents"
          :key="agent.id"
          class="agent-card"
          :class="{ 'is-draft': agent.status === 'draft' }"
          shadow="hover"
        >
          <div class="agent-card-header">
            <div class="agent-icon">
              <el-avatar :size="48" :src="agent.icon || undefined" class="agent-avatar">
                <el-icon :size="24"><Avatar /></el-icon>
              </el-avatar>
            </div>
            <div class="agent-info">
              <h3 class="agent-name">{{ agent.name }}</h3>
              <div class="agent-meta">
                <el-tag :type="getStatusType(agent.status)" size="small" class="status-tag">
                  {{ getStatusLabel(agent.status) }}
                </el-tag>
                <!-- <el-tag v-if="agent.status" type="success" size="small" class="a2a-tag">
                  A2A
                </el-tag> -->
                <span class="agent-date">{{ formatDate(agent.updatedAt) }}</span>
              </div>
            </div>
          </div>

          <div class="agent-description">
            {{ agent.description || '暂无描述' }}
          </div>

          <div class="agent-actions">
            <el-button size="small" @click="handleExecute(agent)" class="execute-button">
              <el-icon><VideoPlay /></el-icon>
              执行
            </el-button>
            <el-dropdown @command="handleCommand" class="more-dropdown">
              <el-button size="small" class="more-button">
                更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'edit', agent }" class="dropdown-item">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'copy', agent }" class="dropdown-item">
                    <el-icon><CopyDocument /></el-icon>
                    复制
                  </el-dropdown-item>
                  <el-dropdown-item
                    :command="{ action: 'delete', agent }"
                    class="dropdown-item delete-item"
                    divided
                  >
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-card>

        <div v-if="filteredAgents.length === 0 && !agentStore.isLoading" class="no-agents">
          <el-empty description="暂无智能体">
            <el-button type="primary" @click="handleCreate" class="create-empty-button"
              >创建第一个智能体</el-button
            >
          </el-empty>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :total="agentStore.totalAgents"
          :page-sizes="[8, 16, 32, 64]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          background
        />
      </div>
    </el-card>

    <el-dialog
      v-model="createDialogVisible"
      :title="dialogTitle"
      width="500px"
      :before-close="handleDialogClose"
    >
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入智能体名称" clearable />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入智能体描述"
            show-word-limit
            maxlength="200"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="createForm.status" placeholder="请选择状态">
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
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" @click="handleDialogConfirm" :loading="isSubmitting">
            {{ dialogMode === 'edit' ? '确认保存' : '确认创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Search,
  Plus,
  Avatar,
  ArrowDown,
  VideoPlay,
  Edit,
  CopyDocument,
  Delete,
  Connection,
} from '@element-plus/icons-vue'
import { useAgentStore } from '@/stores/agentStore'
import type { Agent } from '@/types/agent'
import { AgentService } from '@/api/agentService'
import { v4 as uuidv4 } from 'uuid'

const router = useRouter()
const agentStore = useAgentStore()

// 搜索和筛选
const searchQuery = ref('')
const statusFilter = ref('')
const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '测试中', value: 'testing' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' },
]

// 分页
const pagination = ref({
  currentPage: 1,
  pageSize: 8,
})

const createDialogVisible = ref(false)
const createFormRef = ref<FormInstance>()
const isSubmitting = ref(false)
const dialogMode = ref<'create' | 'edit' | 'copy'>('create')
const editingAgentId = ref<string | null>(null)

const dialogTitle = computed(() => {
  if (dialogMode.value === 'edit') return '编辑智能体'
  if (dialogMode.value === 'copy') return '复制智能体'
  return '新建智能体'
})

const createForm = ref({
  name: '',
  description: '',
  status: 'draft',
})

const createRules = ref<FormRules>({
  name: [
    { required: true, message: '请输入智能体名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度应在1到50个字符之间', trigger: 'blur' },
  ],
  description: [{ max: 200, message: '长度不能超过200个字符', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
})

// 计算属性
const filteredAgents = computed(() => agentStore.agents)

// 方法
const loadAgents = async () => {
  await agentStore.loadAgents({
    name: searchQuery.value,
    status: statusFilter.value,
    page: pagination.value.currentPage,
    pageSize: pagination.value.pageSize,
  })
}

const handleSearch = () => {
  pagination.value.currentPage = 1
  loadAgents()
}

const resetFilters = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  pagination.value.currentPage = 1
  loadAgents()
}

const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  loadAgents()
}

const handleCurrentChange = (page: number) => {
  pagination.value.currentPage = page
  loadAgents()
}

// 新建智能体
const handleCreate = () => {
  dialogMode.value = 'create'
  editingAgentId.value = null
  createForm.value = {
    name: '',
    description: '',
    status: 'draft',
  }
  createDialogVisible.value = true
}

const handleDialogClose = () => {
  createDialogVisible.value = false
  dialogMode.value = 'create'
  editingAgentId.value = null
  if (createFormRef.value) {
    createFormRef.value.resetFields()
  }
}

const handleDialogConfirm = async () => {
  if (!createFormRef.value) return

  await createFormRef.value.validate(async (valid) => {
    if (!valid) return
    isSubmitting.value = true
    try {
      if (dialogMode.value === 'edit') {
        await AgentService.updateAgent({
          id: editingAgentId.value!,
          name: createForm.value.name,
          description: createForm.value.description,
          status: createForm.value.status as Agent['status'],
        })
        ElMessage.success('智能体更新成功')
      } else {
        const agentData: any = {
          name: createForm.value.name,
          description: createForm.value.description,
          status: createForm.value.status as 'draft' | 'published' | 'archived',
          modelProvider: 'openai',
          modelName: 'gpt-3.5-turbo',
          modelParameters: {
            temperature: 0.7,
            maxTokens: 2000,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
          systemPrompt: '',
          openingDialogue: '',
          suggestedQuestions: [],
          creatorId: 'user',
          version: 1,
          visibility: 'private' as const,
          invocation_count: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        await AgentService.createAgent(agentData)
        ElMessage.success(dialogMode.value === 'copy' ? '智能体复制成功' : '智能体创建成功')
      }

      handleDialogClose()
      await loadAgents()
    } catch (error) {
      console.error('操作失败:', error)
      ElMessage.error('操作失败: ' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      isSubmitting.value = false
    }
  })
}

const handleEdit = (agent: Agent) => {
  dialogMode.value = 'edit'
  editingAgentId.value = agent.id
  createForm.value = {
    name: agent.name,
    description: agent.description || '',
    status: agent.status,
  }
  createDialogVisible.value = true
}

const handleCopy = (agent: Agent) => {
  dialogMode.value = 'copy'
  editingAgentId.value = null
  createForm.value = {
    name: agent.name + ' (副本)',
    description: agent.description || '',
    status: 'draft',
  }
  createDialogVisible.value = true
}

const handleExecute = (agent: Agent) => {
  router.push(`/agents/${agent.id}/execute`)
}

const handleCommand = async (command: { action: string; agent: Agent }) => {
  const { action, agent } = command

  switch (action) {
    case 'edit':
      handleEdit(agent)
      break
    case 'copy':
      handleCopy(agent)
      break
    case 'delete':
      try {
        await ElMessageBox.confirm(
          `确定要删除智能体 "${agent.name}" 吗？此操作不可撤销。`,
          '确认删除',
          {
            type: 'warning',
          },
        )
        await agentStore.deleteAgent(agent.id.toString())
        ElMessage.success('删除成功')
        loadAgents()
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败')
        }
      }
      break
  }
}

const getStatusType = (status: string) => {
  switch (status) {
    case 'draft':
      return 'info'
    case 'testing':
      return 'warning'
    case 'published':
      return 'success'
    case 'archived':
      return 'danger'
    default:
      return 'info'
  }
}

const getStatusLabel = (status: string) => {
  return statusOptions.find((opt) => opt.value === status)?.label || status
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// 生命周期
onMounted(() => {
  loadAgents()
})

// 监听路由变化，重新加载数据
watch(
  () => router.currentRoute.value,
  () => {
    loadAgents()
  },
)
</script>

<style scoped>
.agent-management {
  padding: var(--spacing-base);
  background-color: var(--background-color);
  min-height: calc(100vh - var(--header-height) - var(--footer-height));
}

.main-card {
  border-radius: var(--border-radius-medium);
  box-shadow: var(--box-shadow-card);
  border: 1px solid var(--border-color-light);
  overflow: hidden;
}

.main-card :deep(.el-card__header) {
  padding: 0;
  border-bottom: 1px solid var(--border-color-light);
}

.header {
  padding: var(--spacing-base) var(--spacing-large);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-base);
}

.page-title {
  margin: 0;
  font-size: var(--font-size-h2);
  color: var(--text-primary);
  font-weight: 600;
}

.filters {
  display: flex;
  align-items: center;
  padding: var(--spacing-base) var(--spacing-large);
  flex-wrap: wrap;
  gap: var(--spacing-small);
  background-color: var(--background-color-light);
  border-bottom: 1px solid var(--border-color-light);
}

.search-input {
  width: 300px;
}

.status-filter {
  width: 120px;
}

.search-button,
.reset-button {
  border-radius: var(--border-radius-base);
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-base);
  padding: var(--spacing-base);
}

.agent-card {
  transition: var(--transition-all);
  border: 1px solid var(--border-color-light);
  border-radius: var(--border-radius-medium);
  overflow: hidden;
  background: var(--background-color-white);
}

.agent-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--box-shadow-hover);
  border-color: var(--primary-color-light);
}

.agent-card.is-draft {
  opacity: 0.8;
}

.agent-card-header {
  display: flex;
  padding: var(--spacing-base);
  border-bottom: 1px solid var(--border-color-light);
}

.agent-icon {
  margin-right: var(--spacing-small);
}

.agent-avatar {
  background-color: var(--background-color);
}

.agent-info {
  flex: 1;
  min-width: 0;
}

.agent-name {
  margin: 0 0 8px 0;
  font-size: var(--font-size-medium);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.status-tag,
.a2a-tag {
  border-radius: var(--border-radius-small);
}

.agent-date {
  font-size: var(--font-size-small);
  color: var(--text-secondary);
}

.agent-description {
  padding: var(--spacing-base);
  color: var(--text-regular);
  font-size: var(--font-size-base);
  line-height: 1.6;
  min-height: 80px;
}

.agent-actions {
  display: flex;
  gap: var(--spacing-small);
  padding: var(--spacing-base);
  border-top: 1px solid var(--border-color-light);
  justify-content: flex-end;
}

.execute-button,
.more-button {
  border-radius: var(--border-radius-base);
}

.more-dropdown {
  display: flex;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-mini);
}

.delete-item {
  color: var(--danger-color);
}

.delete-item :deep(.el-dropdown-menu__item:hover) {
  background-color: var(--el-color-danger-light-9);
}

.create-empty-button {
  border-radius: var(--border-radius-base);
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  padding: var(--spacing-base);
  border-top: 1px solid var(--border-color-light);
}

:deep(.el-pagination) {
  padding: 0;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .agent-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }

  .search-input {
    width: 240px;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .status-filter {
    width: 100%;
  }

  .agent-grid {
    grid-template-columns: 1fr;
  }

  .agent-card {
    max-width: 100%;
  }
}
</style>
