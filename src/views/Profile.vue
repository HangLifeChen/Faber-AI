<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span>个人资料</span>
        </div>
      </template>
      
      <el-form
        ref="profileFormRef"
        :model="profileForm"
        :rules="profileRules"
        label-width="120px"
        class="profile-form"
        v-loading="loading"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="avatar-section">
              <el-avatar :size="100" :src="profileForm.avatar" class="avatar-preview" />
              <el-upload
                class="avatar-uploader"
                action=""
                :http-request="handleAvatarUpload"
                :show-file-list="false"
                :before-upload="beforeAvatarUpload"
              >
                <el-button size="small" type="primary">更换头像</el-button>
              </el-upload>
            </div>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="profileForm.username" disabled />
            </el-form-item>
            
            <el-form-item label="姓名" prop="name">
              <el-input v-model="profileForm.name" />
            </el-form-item>
            
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="profileForm.email" />
            </el-form-item>
            
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="profileForm.phone" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="个人简介" prop="bio">
          <el-input
            v-model="profileForm.bio"
            type="textarea"
            :rows="4"
            placeholder="请输入个人简介"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="saveProfile" :loading="saving">保存资料</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-card class="security-card">
      <template #header>
        <div class="card-header">
          <span>安全设置</span>
        </div>
      </template>
      
      <el-form
        ref="securityFormRef"
        :model="securityForm"
        :rules="securityRules"
        label-width="120px"
        class="security-form"
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            v-model="securityForm.oldPassword"
            type="password"
            show-password
            placeholder="请输入原密码"
          />
        </el-form-item>
        
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="securityForm.newPassword"
            type="password"
            show-password
            placeholder="请输入新密码"
          />
        </el-form-item>
        
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="securityForm.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入新密码"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleChangePassword" :loading="changingPassword">修改密码</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { getCurrentUser, updateUser, changePassword as changePasswordApi, uploadAvatar, getUser } from '@/api/user'
import type { UserInfo } from '@/types/user'

const userStore = useUserStore()

const profileFormRef = ref()
const securityFormRef = ref()

const loading = ref(false)
const saving = ref(false)
const changingPassword = ref(false)

// 存储原始用户数据用于重置
let originalUserData: UserInfo | null = null

const profileForm = reactive({
  id: '',
  username: '',
  name: '',
  email: '',
  phone: '',
  bio: '',
  avatar: ''
})

const securityForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const profileRules: FormRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

const securityRules: FormRules = {
  oldPassword: [
    { required: true, message: '请输入原密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: (error?: Error) => void) => {
        if (value !== securityForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 加载用户信息
onMounted(() => {
  loadProfile()
})

const loadProfile = async () => {
  loading.value = true
  try {
    let id =userStore.userInfo.id
    const userData = await getUser(id)
    originalUserData = userData
    
    profileForm.id = userData.id
    profileForm.username = userData.username
    profileForm.name = userData.username || ''
    profileForm.email = userData.email || ''
    profileForm.phone = userData.telephoneNumber || ''
    profileForm.bio = userData.introduction || ''
    profileForm.avatar = userData.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
    
    // 同步更新 store 中的用户信息
    userStore.setUser(userData)
  } catch (error) {
    console.error('加载用户信息失败:', error)
    ElMessage.error('加载用户信息失败')
  } finally {
    loading.value = false
  }
}

const handleAvatarUpload = async (options: any) => {
  try {
    const result = await uploadAvatar(options.file)
    profileForm.avatar = result.url
    ElMessage.success('头像上传成功')
  } catch (error) {
    console.error('头像上传失败:', error)
    ElMessage.error('头像上传失败')
  }
}

const beforeAvatarUpload = (rawFile: File) => {
  if (rawFile.type !== 'image/jpeg' && rawFile.type !== 'image/png') {
    ElMessage.error('头像必须是 JPG 或 PNG 格式!')
    return false
  } else if (rawFile.size / 1024 / 1024 > 2) {
    ElMessage.error('头像大小不能超过 2MB!')
    return false
  }
  return true
}

const saveProfile = async () => {
  if (!profileFormRef.value) return
  
  await profileFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      saving.value = true
      try {
        await updateUser({
          id: profileForm.id,
          name: profileForm.name,
          email: profileForm.email,
          telephone_number: profileForm.phone,
          introduction: profileForm.bio,
          avatar: profileForm.avatar
        })
        ElMessage.success('资料保存成功')
        
        // 重新加载用户信息
        await loadProfile()
      } catch (error) {
        console.error('保存用户信息失败:', error)
        ElMessage.error('保存用户信息失败')
      } finally {
        saving.value = false
      }
    } else {
      ElMessage.error('请检查表单信息')
    }
  })
}

const handleChangePassword = async () => {
  if (!securityFormRef.value) return
  
  await securityFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      changingPassword.value = true
      try {
        await changePasswordApi({
          oldPassword: securityForm.oldPassword,
          newPassword: securityForm.newPassword
        })
        ElMessage.success('密码修改成功')
        // 重置表单
        securityForm.oldPassword = ''
        securityForm.newPassword = ''
        securityForm.confirmPassword = ''
      } catch (error) {
        console.error('修改密码失败:', error)
        ElMessage.error('修改密码失败')
      } finally {
        changingPassword.value = false
      }
    } else {
      ElMessage.error('请检查密码信息')
    }
  })
}

const resetForm = () => {
  if (originalUserData) {
    profileForm.id = originalUserData.id
    profileForm.username = originalUserData.username
    profileForm.name = originalUserData.username || ''
    profileForm.email = originalUserData.email || ''
    profileForm.phone = originalUserData.telephoneNumber || ''
    profileForm.bio = originalUserData.introduction || ''
    profileForm.avatar = originalUserData.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
  }
  ElMessage.info('表单已重置')
}
</script>

<style scoped>
.profile-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.profile-card,
.security-card {
  margin-bottom: 20px;
}

.card-header {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.avatar-preview {
  margin-bottom: 15px;
  border: 2px solid #ebeef5;
}

.avatar-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.avatar-uploader .el-upload:hover {
  border-color: var(--el-color-primary);
}

.profile-form,
.security-form {
  margin-top: 20px;
}

.el-form-item {
  margin-bottom: 22px;
}
</style>
