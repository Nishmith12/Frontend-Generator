import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Editor from '@monaco-editor/react'; // Import the new code editor

// --- Helper Components ---

// A simple toast notification component
function Toast({ message, show }) {
  if (!show) return null;
  const animationStyle = { animation: 'fadeInOut 3s ease-in-out' };
  const keyframes = `
    @keyframes fadeInOut {
      0%, 100% { opacity: 0; transform: translateY(20px); }
      10%, 90% { opacity: 1; transform: translateY(0); }
    }
  `;
  return (
    <>
      <style>{keyframes}</style>
      <div style={animationStyle} className="fixed bottom-5 right-5 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 px-4 rounded-lg shadow-xl z-50">
        {message}
      </div>
    </>
  );
}

// Icon for the sidebar toggle
function MenuIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
    )
}

const promptTemplates = [
    { title: 'Hero Section', prompt: 'A modern, professional hero section for a SaaS product...' },
    { title: 'Login Form', prompt: 'A clean and simple login form...' },
    { title: 'Pricing Page', prompt: 'A pricing page with three tiers...' },
    { title: 'Contact Form', prompt: 'A contact form with fields for "Full Name", "Email"...' },
];

// --- Main App Component ---

function App() {
  const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

  // State Management
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('// Your generated code will appear here...');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showToast, setShowToast] = useState(false);

  // New State for History Feature
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  const iframeRef = useRef(null);
  
  // --- Effects for LocalStorage ---

  useEffect(() => {
    const savedChats = localStorage.getItem('ai-frontend-chats');
    if (savedChats) {
      setChats(JSON.parse(savedChats));
    }
  }, []);

  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('ai-frontend-chats', JSON.stringify(chats));
    }
  }, [chats]);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = generatedCode;
    }
  }, [generatedCode]);
  
  // --- Core Functions ---

  const handleGenerateClick = async () => {
    if (!OPENROUTER_API_KEY) {
      setError("API Key is not configured. The app must be deployed with an environment variable.");
      return;
    }
    if (!prompt) {
      setError("Please enter a prompt!");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsLoading(true);
    setGeneratedCode('// Generating code, please wait...');
    setError(null);

    let currentChatId = activeChatId;
    let historyForApi = [];

    if (!currentChatId) {
      const newChatId = uuidv4();
      currentChatId = newChatId;
      setActiveChatId(newChatId);
      const newChat = { 
        id: newChatId, 
        title: prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt,
        history: [] 
      };
      setChats(prevChats => [newChat, ...prevChats]);
    } else {
        const activeChat = chats.find(c => c.id === currentChatId);
        if(activeChat) historyForApi = activeChat.history;
    }
    
    const newUserMessage = { role: 'user', content: prompt };
    const updatedHistoryForApi = [...historyForApi, newUserMessage];

    const systemPrompt = `You are an expert frontend developer specializing in clean, modern web design. Your task is to generate or modify a single, self-contained HTML file based on the user's request.

Rules:
1.  **Single File:** All HTML, CSS, and JavaScript must be in one .html file.
2.  **Styling:** Use Tailwind CSS for all styling. You MUST include the Tailwind CDN script ('<script src="https://cdn.tailwindcss.com"></script>') in the <head>.
3.  **Conversational Edits:** If the user's prompt is a follow-up request to modify existing code, you MUST return the complete, modified HTML file. Do not only return the changed snippet.
4.  **Code Only:** Your response must ONLY contain the raw HTML code. Do not include any explanations, comments, or markdown ticks like \`\`\`html.`;

    const payload = {
        model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
        messages: [ { role: "system", content: systemPrompt }, ...updatedHistoryForApi ]
    };

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': window.location.href,
            'X-Title': 'AI Frontend Generator'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API request failed with status: ${response.status}. Body: ${errText}`);
      }
      
      const result = await response.json();
      const code = result.choices?.[0]?.message?.content;
      
      if (code) {
        setGeneratedCode(code.trim());
        const newAssistantMessage = { role: 'assistant', content: code.trim() };
        
        setChats(prevChats => prevChats.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, history: [...updatedHistoryForApi, newAssistantMessage] } 
            : chat
        ));
        
        setPrompt('');
      } else {
        throw new Error("Received an empty or invalid response from the API.");
      }
    } catch (err) {
      setError(err.message.split('Body:')[0]);
      setGeneratedCode(`// Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setPrompt('');
    setGeneratedCode('// Start a new chat by typing a prompt or choosing an example.');
  };
  
  const handleSelectChat = (chatId) => {
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
          setActiveChatId(chat.id);
          const lastAssistantMessage = [...chat.history].reverse().find(m => m.role === 'assistant');
          setGeneratedCode(lastAssistantMessage ? lastAssistantMessage.content : '// This chat is empty. Type a prompt to start.');
      }
  };
  
  const handleDeleteChat = (chatId) => {
      const updatedChats = chats.filter(c => c.id !== chatId);
      setChats(updatedChats);
      localStorage.setItem('ai-frontend-chats', JSON.stringify(updatedChats));
      if (activeChatId === chatId) {
          handleNewChat();
      }
  };

  const handleCopyClick = () => {
    if (!generatedCode || generatedCode.startsWith('//')) return;
    navigator.clipboard.writeText(generatedCode)
      .then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      })
  };

  return (
    <div className="h-screen flex font-sans bg-gradient-to-br from-slate-900 to-gray-900 text-white">
      {/* --- Sidebar for History --- */}
      <aside className={`bg-slate-900/70 backdrop-blur-sm border-r border-slate-800 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0'} overflow-hidden`}>
        <div className="flex justify-between items-center p-4 border-b border-slate-800 flex-shrink-0">
          <h2 className="text-lg font-bold">Chat History</h2>
          <button onClick={handleNewChat} className="bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 text-sm font-medium py-1 px-3 rounded-full transition-colors">
            + New
          </button>
        </div>
        <nav className="flex-grow overflow-y-auto p-2">
          <ul>
            {chats.map(chat => (
              <li key={chat.id} className={`group flex items-center justify-between rounded-md p-2 my-1 cursor-pointer ${activeChatId === chat.id ? 'bg-sky-500/20' : 'hover:bg-slate-800'}`} onClick={() => handleSelectChat(chat.id)}>
                <span className="truncate text-sm">{chat.title}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col h-screen">
        <header className="bg-slate-900/70 backdrop-blur-sm shadow-lg p-4 z-10 border-b border-slate-800 flex items-center">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-4 p-1 rounded-md hover:bg-slate-800">
                <MenuIcon />
            </button>
            <div className="flex justify-between items-center w-full">
                 <h1 className="text-2xl font-bold text-sky-500">AI Frontend Generator</h1>
                 <span className="text-sm text-slate-400">Powered by OpenRouter</span>
            </div>
        </header>

        <main className="flex-grow container mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
            <div className="flex flex-col h-full min-h-0">
              <div className="flex-shrink-0">
                <label htmlFor="prompt-input" className="block text-sm font-medium text-slate-300 mb-2">Your Prompt</label>
                <textarea 
                  id="prompt-input" 
                  rows="4" 
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500" 
                  placeholder="e.g., A professional hero section..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading}
                />
                <div className="mt-3">
                  <label className="block text-sm font-medium text-slate-400 mb-2">Or try an example:</label>
                  <div className="flex flex-wrap gap-2">
                    {promptTemplates.map((template) => (
                      <button
                        key={template.title}
                        onClick={() => { handleNewChat(); setPrompt(template.prompt); }}
                        className="bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm font-medium py-1 px-3 rounded-full"
                      >
                        {template.title}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                <button 
                  id="generate-btn" 
                  className="mt-5 w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center"
                  onClick={handleGenerateClick}
                  disabled={isLoading}
                >
                  {isLoading ? 'Generating...' : 'Generate Code'}
                </button>
              </div>
              <div className="mt-4 flex-grow flex flex-col bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden min-h-0">
                <div className="flex justify-between items-center p-3 border-b border-slate-700 flex-shrink-0 bg-slate-900/50">
                  <h2 className="text-lg font-semibold">Generated Code</h2>
                  <button onClick={handleCopyClick} className="bg-slate-700 hover:bg-slate-600 text-sm font-medium py-1 px-3 rounded-md">Copy</button>
                </div>
                {/* --- THIS IS THE UPGRADED PART --- */}
                <div className="flex-grow h-0 w-full">
                  <Editor
                    height="100%"
                    language="html"
                    theme="vs-dark"
                    value={generatedCode}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: 'on',
                      scrollBeyondLastLine: false,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col h-full min-h-0">
              <h2 className="text-lg font-semibold mb-2 text-slate-300">Live Preview</h2>
              <div className="flex-grow bg-white rounded-lg border border-slate-700 shadow-xl ring-1 ring-slate-800">
                <iframe ref={iframeRef} className="w-full h-full rounded-lg" title="Live Preview"></iframe>
              </div>
            </div>
        </main>
        <Toast message="Copied to clipboard!" show={showToast} />
      </div>
    </div>
  );
}

export default App;

