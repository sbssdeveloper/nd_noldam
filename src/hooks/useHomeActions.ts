import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { 
  loadHomeData, 
  loadProfileData, 
  clearHomeData, 
  setFetchedData, 
  clearHomeError 
} from '@/store/slices/homeSlice'

export const useHomeActions = () => {
  const dispatch = useAppDispatch()
  const { 
    sliderData,
    typeAData,
    typeBData,
    loading,
    error,
    hasFetchedData
  } = useAppSelector((state) => state.homeReducer)

  const loadHomeDataAction = () => {
    dispatch(loadHomeData())
  }

  const loadProfileDataAction = () => {
    dispatch(loadProfileData())
  }

  const clearDataAction = () => {
    dispatch(clearHomeData())
  }

  const setFetchedDataAction = (fetched: boolean) => {
    dispatch(setFetchedData(fetched))
  }

  const clearErrorAction = () => {
    dispatch(clearHomeError())
  }

  return {
    // Data
    sliderData,
    typeAData,
    typeBData,
    
    // Loading states
    loading,
    error,
    hasFetchedData,
    
    // Actions
    loadHomeData: loadHomeDataAction,
    loadProfileData: loadProfileDataAction,
    clearData: clearDataAction,
    setFetchedData: setFetchedDataAction,
    clearError: clearErrorAction
  }
}