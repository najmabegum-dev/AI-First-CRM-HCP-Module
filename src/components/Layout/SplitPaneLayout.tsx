import InteractionForm from '../Form/InteractionForm';
import AIChatPanel from '../Chat/AIChatPanel';

export default function SplitPaneLayout() {
  return (
    <div className="flex bg-[#F3F4F6] min-h-screen font-sans p-4 md:p-8 justify-center items-center text-gray-900">
      <div className="flex flex-col lg:flex-row w-full max-w-[1300px] h-[90vh] bg-[#F9FAFB] rounded-xl shadow-2xl overflow-hidden shadow-gray-400/50">
        {/* Left Panel: Structured Form (~60%) */}
        <div className="lg:w-[60%] bg-[#F9FAFB] border-r border-gray-200 overflow-y-auto scroll-smooth">
          <InteractionForm />
        </div>
        
        {/* Right Panel: Chat (~40%) */}
        <div className="lg:w-[40%] bg-[#F9FAFB] flex flex-col h-full">
          <AIChatPanel />
        </div>
      </div>
    </div>
  );
}
