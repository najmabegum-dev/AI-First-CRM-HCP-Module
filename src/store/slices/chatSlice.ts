import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { autoFillFields } from './interactionSlice';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  autoFillConfirmation: string | null;
}

const initialState: ChatState = {
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Log interaction details here (e.g., "Met Dr. Smith, discussed Prodo-X efficacy, positive sentiment, shared brochure") or ask for help.',
      timestamp: new Date().toISOString(),
    }
  ],
  isProcessing: false,
  autoFillConfirmation: null,
};

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ message, currentFormData }: { message: string, currentFormData: any }, { dispatch }) => {
    // 1. Add user message optimistic
    dispatch(addUserMessage(message));
    
    try {
      const response = await axios.post('/api/agent/process', {
        message,
        current_form_data: currentFormData
      });
      
      const { form_updates, response_message } = response.data;
      
      if (form_updates && Object.keys(form_updates).length > 0) {
         dispatch(autoFillFields(form_updates));
         // Clear highlights after 2 seconds
         setTimeout(() => {
             dispatch({ type: 'interaction/clearHighlights' });
         }, 2000);
      }

      return response.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addUserMessage: (state, action: PayloadAction<string>) => {
      state.messages.push({
        id: Date.now().toString(),
        role: 'user',
        content: action.payload,
        timestamp: new Date().toISOString(),
      });
    },
    clearConfirmation: (state) => {
      state.autoFillConfirmation = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.isProcessing = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isProcessing = false;
        let content = action.payload.response_message;
        if (action.payload.confirmation_message && Object.keys(action.payload.form_updates || {}).length > 0) {
            content = action.payload.confirmation_message;
        }

        state.messages.push({
          id: Date.now().toString(),
          role: 'assistant',
          content: content,
          timestamp: new Date().toISOString(),
        });
      })
      .addCase(sendMessage.rejected, (state) => {
        state.isProcessing = false;
        state.messages.push({
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        });
      });
  },
});

export const { addUserMessage, clearConfirmation } = chatSlice.actions;
export default chatSlice.reducer;
