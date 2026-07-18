import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {toast} from 'react-hot-toast';
import api from '../../api/axios.js';

const initialState = {
     value: null,
     loading: false,
     error: null,
}

export const fetchUser = createAsyncThunk('user/fetchUser', async (token, {rejectWithValue}) => {
    try {
        const {data} = await api.get('/api/user/data', {
            headers: {Authorization: `Bearer ${token}`}
        })

        return data.success ? data.user : rejectWithValue(data.message || 'Unable to load user')
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || error.message)
    }
})

export const updateUser = createAsyncThunk('user/update', async ({userData, token}, {rejectWithValue}) => {
    try {
        const {data} = await api.post('/api/user/update', userData, {
            headers: {Authorization: `Bearer ${token}`}
        })

        if (!data.success) return rejectWithValue(data.message || 'Unable to update user')
        toast.success(data.message)
        return data.user
    } catch (error) {
        return rejectWithValue(error.response?.data?.message || error.message)
    }
})

const userSlice = createSlice({
     name: 'user',
     initialState,
     reducers:{
         resetUser: () => initialState,
     },
     extraReducers: (builder)=> {
         builder.addCase(fetchUser.pending, (state)=>{
             state.loading = true
             state.error = null
         }).addCase(fetchUser.fulfilled, (state, action)=>{
             state.value = action.payload
             state.loading = false
         }).addCase(fetchUser.rejected, (state, action)=>{
             state.loading = false
             state.error = action.payload || action.error.message
         }).addCase(updateUser.fulfilled, (state, action)=>{
            if (action.payload) state.value = action.payload
         }).addCase(updateUser.rejected, (state, action)=>{
            state.error = action.payload || action.error.message
         })
     }
});

export const {resetUser} = userSlice.actions
export default userSlice.reducer
