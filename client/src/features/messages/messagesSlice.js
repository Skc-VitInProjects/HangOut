import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';
import api from '../../api/axios';


const initialState = {
     messages: [],
     loading: false,
     error: null,

}

export const fetchMessages = createAsyncThunk('messages/fetchMessages', async ({token, userId}, {rejectWithValue}) => {
     try {
          const {data} = await api.get(`/api/message/${userId}`, {
               headers: {Authorization: `Bearer ${token}`},
          })

          return data.success ? data.messages : rejectWithValue(data.message || 'Unable to fetch messages')
     } catch (error) {
          return rejectWithValue(error.response?.data?.message || error.message)
     }
})

const messagesSlice = createSlice({
     name: 'messages',
     initialState,
     reducers:{
          setMessages: (state, action)=> {
              state.messages = action.payload;
          },
          
          addMessage: (state, action)=> {
               state.messages = [...state.messages, action.payload]
          },

          resetMessages: (state) => {
               state.messages = [];
               state.error = null;
          },


     },
     extraReducers: (builder)=>{
          builder.addCase(fetchMessages.pending, (state)=>{
               state.loading = true
               state.error = null
          }).addCase(fetchMessages.fulfilled , (state, action)=>{
               state.loading = false
               state.messages = action.payload
          }).addCase(fetchMessages.rejected, (state, action)=>{
               state.loading = false
               state.error = action.payload || action.error.message
          })
     }
});

export const {setMessages, addMessage, resetMessages} = messagesSlice.actions;

export default messagesSlice.reducer
