import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import router from '@/router'
import type { AuthData, RefreshTokenResponse } from '@/types/auth'

// 重试相关常量
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

// 标志位，防止重复刷新 token
let isRefreshing = false
// 存储在刷新 token 期间失败的请求队列
// 队列中的每个项都是一个 Promise 的 resolve/reject 函数
let failedQueue: Array<{ resolve: (value: string) => void; reject: (reason?: any) => void }> = []

// 处理队列中的请求
const processQueue = (error: Error | null, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// 检查 token 是否即将过期（提前5分钟刷新）
const isTokenExpiringSoon = (expire: number): boolean => {
  if (!expire) return false
  // 获取当前时间戳（毫秒）
  const now = Date.now()
  // 如果 token 将在5分钟内过期，返回 true
  return expire - now < 5 * 60 * 1000
}

// 刷新 token 的函数
const refreshAccessToken = async (): Promise<string | null> => {
  const userStore = useUserStore()

  if (!userStore.refreshToken) {
    return null
  }

  if (isRefreshing) {
    // 如果正在刷新，返回一个 Promise，等待刷新完成
    return new Promise<string>((resolve, reject) => {
      failedQueue.push({ resolve, reject })
    })
  }

  isRefreshing = true

  try {
    const authData = await refreshTokenApi({
      refreshToken: userStore.refreshToken,
    })

    userStore.setAuthData(authData.data)
    processQueue(null, authData.data.token)
    return authData.data.token
  } catch (refreshError: any) {
    userStore.logout()
    processQueue(refreshError, null)
    ElMessage.error('您的登录已过期，请重新登录')
    router.push('/login')
    return null
  } finally {
    isRefreshing = false
  }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API || '/api',
  timeout: 1000000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const userStore = useUserStore()
    if (userStore.token) {
      // 检查 token 是否即将过期
      if (isTokenExpiringSoon(userStore.expire)) {
        try {
          const newToken = await refreshAccessToken()
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`
          } else {
            // 如果刷新失败，但仍有原 token，继续使用原 token
            config.headers.Authorization = `Bearer ${userStore.token}`
          }
        } catch (error) {
          // 如果刷新过程中出错，仍然使用原 token
          config.headers.Authorization = `Bearer ${userStore.token}`
        }
      } else {
        config.headers.Authorization = `Bearer ${userStore.token}`
      }
    }
    return config
  },
  (error: any) => {
    return Promise.reject(error)
  },
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 后端返回的数据结构如果是 { code, data, msg }
    // 可以在这里进行第一层解析，直接返回 data
    // 例如：
    const res = response.data
    if (res.code !== 200) {
      ElMessage.error(res.msg || '请求失败')
      return Promise.reject(new Error(res.msg || '请求失败'))
    } else {
      return res.data
    }
  },
  async (error: any) => {
    const userStore = useUserStore()
    const originalRequest: InternalAxiosRequestConfig & {
      _retry?: boolean
      headers: any
    } = error.config

    // 检查是否需要重试（网络错误或服务器错误）
    const retryCount = parseInt(originalRequest.headers['x-retry-count']) || 0
    const shouldRetry =
      (error.code === 'ECONNABORTED' || // 超时
        error.code === 'ERR_NETWORK' || // 网络错误
        (error.response && (error.response.status >= 500 || error.response.status === 429))) && // 服务器错误或限流
      retryCount < MAX_RETRIES

    if (shouldRetry) {
      originalRequest.headers['x-retry-count'] = retryCount + 1

      // 指数退避策略
      const delay = RETRY_DELAY * Math.pow(2, retryCount)

      console.log(`请求失败，正在进行第 ${retryCount + 1} 次重试，延迟 ${delay}ms...`)

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(api(originalRequest))
        }, delay)
      })
    }

    // 假设 token 过期的错误码是 401
    if (error.response?.status === 401) {
      userStore.logout()
      router.push('/login')
      return Promise.reject(error)
    }

    // 增强错误信息
    let errorMessage = error.message

    // 添加重试信息
    const finalRetryCount = parseInt(originalRequest.headers['x-retry-count']) || 0
    if (finalRetryCount > 0) {
      errorMessage += ` (已重试 ${finalRetryCount} 次)`
    }

    // 添加请求URL信息（仅开发环境）
    if (import.meta.env.DEV) {
      const baseUrl = originalRequest.baseURL ?? ''
      const requestUrl = originalRequest.url ?? ''
      const url = baseUrl + requestUrl
      errorMessage += ` [${originalRequest.method?.toUpperCase() ?? 'UNKNOWN'} ${url}]`
    }

    const message = error.response?.data?.message || errorMessage || '请求失败，请稍后重试'
    ElMessage.error(message)
    return Promise.reject(new Error(message))
  },
)

/**
 * 刷新 Token 的 API 函数
 * 使用一个独立的、干净的 axios 实例来调用
 */
async function refreshTokenApi(data: { refreshToken: string }): Promise<RefreshTokenResponse> {
  const cleanApi = axios.create({
    baseURL: import.meta.env.VITE_APP_BASE_API || '/api',
    timeout: 5000,
  })
  // 明确指定返回类型，axios 会尝试解析为该类型
  const response = await cleanApi.post<RefreshTokenResponse>('/v1/auth/refresh-token', data)
  return response.data
}
