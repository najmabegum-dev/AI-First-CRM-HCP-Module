import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { updateField } from '../../store/slices/interactionSlice';
import { Search, Mic, Plus, X } from 'lucide-react';
import axios from 'axios';

export default function InteractionForm() {
  const dispatch = useDispatch();
  const { formData, highlightFields } = useSelector((state: RootState) => state.interaction);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showMaterialInput, setShowMaterialInput] = useState(false);
  const [newMaterial, setNewMaterial] = useState('');

  const addMaterial = () => {
    if (newMaterial.trim()) {
      handleChange('materials_shared', [...formData.materials_shared, newMaterial.trim()]);
      setNewMaterial('');
      setShowMaterialInput(false);
    }
  };

  const handleSampleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newSamples = Array.from(e.target.files).map(file => file.name);
      handleChange('samples_distributed', [...formData.samples_distributed, ...newSamples]);
    }
    // clear input so same file can be selected again
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleChange = (field: string, value: any) => {
    dispatch(updateField({ field, value }));
  };

  const isHighlighted = (field: string) => highlightFields.includes(field);

  const startVoiceRecording = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Speech recognition not supported in this browser.");
        return;
    }
    
    setIsRecording(true);
    
    try {
        const response = await axios.post('/api/voice/summarize');
        let newTopics = formData.topics_discussed || '';
        if (newTopics) newTopics += '\n';
        handleChange('topics_discussed', newTopics + response.data.summary);
    } catch(e) {
        console.error(e);
    }
    setIsRecording(false);
  };

  const inputClass = (field: string) => 
    `w-full bg-[#EEEEEE] px-4 py-2.5 rounded-lg border focus:border-gray-400 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-all duration-300 ${
      isHighlighted(field) ? 'border-2 border-green-500 bg-green-50' : 'border-transparent'
    }`;

  return (
    <div className="p-8 space-y-7 bg-[#F9FAFB]">
      <h1 className="text-[28px] font-bold text-gray-800 mb-1">Log HCP Interaction</h1>
      
      <div className="space-y-6">
        <h2 className="text-[14px] font-bold text-gray-700 -mb-2">Interaction Details</h2>
        
        {/* HCP Name & Interaction Type Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-semibold text-gray-700">HCP Name</label>
            <input 
              type="text" 
              className={inputClass('hcp_name')}
              placeholder="Search or select HCP..."
              value={formData.hcp_name}
              onChange={(e) => handleChange('hcp_name', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-semibold text-gray-700">Interaction Type</label>
            <select 
              className={inputClass('interaction_type')}
              value={formData.interaction_type}
              onChange={(e) => handleChange('interaction_type', e.target.value)}
            >
              <option>Meeting</option>
              <option>Call</option>
              <option>Video Call</option>
              <option>Email</option>
            </select>
          </div>
        </div>

        {/* Date & Time Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-semibold text-gray-700">Date</label>
            <input 
              type="date" 
              className={inputClass('date')}
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-semibold text-gray-700">Time</label>
            <input 
              type="time" 
              className={inputClass('time')}
              value={formData.time}
              onChange={(e) => handleChange('time', e.target.value)}
            />
          </div>
        </div>

        {/* Attendees */}
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-semibold text-gray-700">Attendees</label>
          <input 
            type="text" 
            className={inputClass('attendees')}
            placeholder="Enter names or search..."
            value={formData.attendees}
            onChange={(e) => handleChange('attendees', e.target.value)}
          />
        </div>

        {/* Topics Discussed */}
        <div className="space-y-1.5">
          <label className="text-[12.5px] font-semibold text-gray-700">Topics Discussed</label>
          <textarea 
            rows={4}
            className={inputClass('topics_discussed') + ' font-mono text-[12px]'}
            placeholder="Enter key discussion points..."
            value={formData.topics_discussed}
            onChange={(e) => handleChange('topics_discussed', e.target.value)}
          ></textarea>
          
          <button 
              type="button" 
              onClick={startVoiceRecording}
              className="text-[#38BDF8] hover:text-blue-500 text-xs flex items-center gap-1.5 pt-1 font-medium"
          >
              <Mic className="h-[14px] w-[14px]" />
              {isRecording ? "Recording..." : "Summarize from Voice Note (Requires Consent)"}
          </button>
        </div>

        {/* Materials & Samples Row */}
        <div className="pt-2">
          <h2 className="text-[14px] font-bold text-gray-800 mb-5">Materials Shared / Samples Distributed</h2>
          
          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-gray-700">Materials Shared</label>
              <div className="flex justify-between items-center pb-6 border-b border-gray-200">
                 <div className="text-[13px] text-gray-500 font-medium flex-1">
                    {formData.materials_shared.length === 0 ? "Brochures." : formData.materials_shared.map((m: string) => m + ".").join(' ')}
                 </div>
                 {showMaterialInput ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={newMaterial}
                        onChange={(e) => setNewMaterial(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addMaterial()}
                        placeholder="Type and enter..."
                        className="border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-400"
                        autoFocus
                      />
                      <button onClick={addMaterial} className="text-blue-600 font-bold text-xs">Add</button>
                      <button onClick={() => setShowMaterialInput(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                    </div>
                 ) : (
                    <button onClick={() => setShowMaterialInput(true)} type="button" className="text-gray-500 border border-gray-300 rounded hover:bg-gray-50 px-3 py-1.5 text-[11px] flex items-center font-medium tracking-wide">
                      <Search className="h-3 w-3 mr-1.5 text-[#38BDF8]" strokeWidth={3} /> Search/Add
                    </button>
                 )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-gray-700">Samples Distributed</label>
              <div className="flex justify-between items-center pb-6 border-b border-gray-200">
                 <div className="text-[13px] text-gray-400 font-medium flex-1">
                    {formData.samples_distributed.length === 0 ? "No samples added." : formData.samples_distributed.map((s: string) => s + ".").join(' ')}
                 </div>
                 <input 
                   type="file"
                   multiple
                   ref={fileInputRef}
                   onChange={handleSampleUpload}
                   className="hidden"
                 />
                 <button onClick={() => fileInputRef.current?.click()} type="button" className="text-gray-500 border border-gray-300 rounded hover:bg-gray-50 px-3 py-1.5 text-[11px] flex items-center font-medium tracking-wide">
                   <Plus className="h-3 w-3 mr-1 text-[#8B5CF6]" strokeWidth={3} /> Add Sample
                 </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment */}
        <div className="space-y-4 pt-4">
          <label className="text-[13px] font-bold text-gray-800">Observed/Inferred HCP Sentiment</label>
          <div className={`flex gap-6 items-center ${isHighlighted('sentiment') ? 'bg-green-50 ring-2 ring-green-200 p-2 rounded-lg' : ''}`}>
             {['Positive', 'Neutral', 'Negative'].map(s => (
                 <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input 
                        type="radio" 
                        name="sentiment" 
                        value={s}
                        checked={formData.sentiment === s}
                        onChange={(e) => handleChange('sentiment', e.target.value)}
                        className="accent-purple-600 h-4 w-4"
                    />
                    <span className="text-[13px] text-gray-700 flex items-center gap-1.5 font-medium">
                        {s === 'Positive' ? '😃 ' : s === 'Neutral' ? '😐 ' : '😞 '} {s}
                    </span>
                 </label>
             ))}
          </div>
        </div>

        {/* Outcomes */}
        <div className="space-y-1.5 pt-4">
          <label className="text-[13px] font-bold text-gray-800">Outcomes</label>
          <textarea 
            rows={3}
            className={inputClass('outcomes') + ' font-mono text-[12px]'}
            placeholder="Key outcomes or agreements..."
            value={formData.outcomes}
            onChange={(e) => handleChange('outcomes', e.target.value)}
          ></textarea>
        </div>

        {/* Follow-up Actions */}
        <div className="space-y-1.5 pt-4">
          <label className="text-[13px] font-bold text-gray-800">Follow-up Actions</label>
          <textarea 
            rows={3}
            className={inputClass('follow_up_actions')}
            placeholder="Follow-up..."
            value={formData.follow_up_actions.length > 0 ? formData.follow_up_actions.join('\n') : ''}
            onChange={(e) => handleChange('follow_up_actions', e.target.value.split('\n'))}
          ></textarea>
        </div>

      </div>
    </div>
  );
}
