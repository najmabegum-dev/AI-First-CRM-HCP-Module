import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { sendMessage } from '../../store/slices/chatSlice';
import { CornerDownLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AIChatPanel() {
  const [input, setInput] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { messages, isProcessing } = useSelector((state: RootState) => state.chat);
  const { formData } = useSelector((state: RootState) => state.interaction);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;
    dispatch(sendMessage({ message: input, currentFormData: formData }));
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#F9FAFB',
        borderLeft: '1px solid #E5E7EB',
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '10px 16px 9px 16px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#F9FAFB',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            color: '#0066CC',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
          }}
        >
          🤖 AI Assistant
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#6B7280',
            fontWeight: 400,
            paddingLeft: '20px',
            fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
          }}
        >
          Log Interaction details here via chat
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 14px 6px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          backgroundColor: '#F9FAFB',
        }}
      >
        {messages.map((msg) => {
          const isSuccess = msg.content.includes('Interaction logged successfully');
          const displayContent = msg.content.replace(
            '**Interaction logged successfully!**',
            '✅ **Interaction logged successfully!**'
          );

          if (msg.role === 'user') {
            return (
              <div key={msg.id} style={{ width: '100%' }}>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#1F2937',
                    border: '1px solid #D1D5DB',
                    borderLeft: '4px solid #3B82F6',
                    borderRadius: '3px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    lineHeight: '1.55',
                    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} style={{ width: '100%' }}>
              <div
                style={{
                  backgroundColor: isSuccess ? '#F0FDF4' : '#F0FBFA',
                  color: isSuccess ? '#15803D' : '#1F2937',
                  border: `1px solid ${isSuccess ? '#BBF7D0' : '#CCF0EB'}`,
                  borderRadius: '3px',
                  padding: '9px 12px',
                  fontSize: '13px',
                  lineHeight: '1.55',
                  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
                }}
              >
                <ReactMarkdown>{displayContent}</ReactMarkdown>
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div>
            <div
              style={{
                backgroundColor: '#F0FAFA',
                border: '1px solid #CFFAFE',
                borderRadius: '3px',
                padding: '9px 12px',
                display: 'inline-flex',
                gap: '4px',
                alignItems: 'center',
              }}
            >
              {[0, 0.2, 0.4].map((delay, i) => (
                <span
                  key={i}
                  style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    backgroundColor: '#9CA3AF', display: 'inline-block',
                    animation: `bounce 1s infinite ${delay}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area — matches reference exactly ── */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid #E5E7EB',
          backgroundColor: '#ffffff',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          <textarea
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #1F2937',
              borderRadius: '24px',
              outline: 'none',
              fontSize: '13px',
              color: '#374151',
              fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
              fontWeight: 500,
              resize: 'none',
              padding: '10px 18px',
              lineHeight: '1.5',
              boxSizing: 'border-box',
              minHeight: '40px',
              maxHeight: '120px',
            }}
            rows={1}
            placeholder="Describe Interaction..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            title="Send (Enter)"
            style={{
              flexShrink: 0,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: !input.trim() || isProcessing ? '#E5E7EB' : '#0066CC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: !input.trim() || isProcessing ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={!input.trim() || isProcessing ? '#9CA3AF' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
