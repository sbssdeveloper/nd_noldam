// Frontend Store Types
import type { AuthState } from './auth'
import type { UserProfile } from '../../userApi'

export interface RootState {
  auth: AuthState
  user: UserState
  post: any // Post slice state
  feed: any // Feed slice state
  home: any // Home slice state
  Mypage: any // Mypage slice state
}

export interface AppDispatch {
  (action: any): any
}

export interface UserState {
  profile: UserProfile | null
  loading: boolean
  error: string | null
}
