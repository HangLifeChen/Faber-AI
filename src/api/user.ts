import { api } from './http'
import type { UserInfo } from '@/types/user'

// 创建用户请求
export interface CreateUserReq {
  username: string
  email: string
  password: string
  name?: string
  telephone_number?: string
  avatar?: string
}

// 更新用户请求
export interface UpdateUserReq {
  id: string
  name?: string
  email?: string
  telephone_number?: string
  introduction?: string
  avatar?: string
}

// 用户列表请求
export interface ListUsersReq {
  page?: number
  pageSize?: number
  keyword?: string
  status?: number
}

// 用户列表响应
export interface ListUsersResp {
  list: UserInfo[]
  total: number
  page: number
  pageSize: number
}

// 修改密码请求
export interface ChangePasswordReq {
  oldPassword: string
  newPassword: string
}

/**
 * 创建用户
 */
export function createUser(data: CreateUserReq): Promise<UserInfo> {
  return api.post('/user', data)
}

/**
 * 获取用户信息
 * @param id 用户ID
 */
export function getUser(id: string): Promise<UserInfo> {
  return api.get('/user', { params: { id } })
}

/**
 * 获取当前登录用户信息
 */
export function getCurrentUser(): Promise<UserInfo> {
  return api.get('/user/current')
}

/**
 * 更新用户信息
 */
export function updateUser(data: UpdateUserReq): Promise<UserInfo> {
  return api.put('/user', data)
}

/**
 * 删除用户
 * @param id 用户ID
 */
export function deleteUser(id: string): Promise<void> {
  return api.delete('/api/user', { params: { id } })
}

/**
 * 获取用户列表
 */
export function listUsers(params: ListUsersReq): Promise<ListUsersResp> {
  return api.get('/api/user/list', { params })
}

/**
 * 修改密码
 */
export function changePassword(data: ChangePasswordReq): Promise<void> {
  return api.post('/api/user/password', data)
}

/**
 * 上传头像
 * @param file 头像文件
 */
export function uploadAvatar(file: File): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/api/upload/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
