import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface InteractionState {
  formData: {
    hcp_name: string;
    hcp_id: number | null;
    interaction_type: string;
    date: string;
    time: string;
    attendees: string;
    topics_discussed: string;
    materials_shared: string[];
    samples_distributed: string[];
    sentiment: string;
    outcomes: string;
    follow_up_actions: string[];
  };
  highlightFields: string[];
  isSubmitting: boolean;
  lastSaved: string | null;
  errors: Record<string, string>;
}

const now = new Date();
const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

const initialState: InteractionState = {
  formData: {
    hcp_name: '',
    hcp_id: null,
    interaction_type: 'Meeting',
    date: new Date().toISOString().split('T')[0],
    time: timeString,
    attendees: '',
    topics_discussed: '',
    materials_shared: [],
    samples_distributed: [],
    sentiment: '',
    outcomes: '',
    follow_up_actions: [],
  },
  highlightFields: [],
  isSubmitting: false,
  lastSaved: null,
  errors: {},
};

const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    updateField: (state, action: PayloadAction<{ field: string; value: any }>) => {
      (state.formData as any)[action.payload.field] = action.payload.value;
    },
    autoFillFields: (state, action: PayloadAction<Record<string, any>>) => {
      state.highlightFields = Object.keys(action.payload);
      state.formData = { ...state.formData, ...action.payload };
    },
    clearHighlights: (state) => {
      state.highlightFields = [];
    },
    resetForm: () => initialState,
  },
});

export const { updateField, autoFillFields, clearHighlights, resetForm } = interactionSlice.actions;
export default interactionSlice.reducer;
