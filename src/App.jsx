import { useState, useRef, useEffect } from 'react';

// A simple toast notification component
function Toast({ message, show }) {
  if (!show) return null;

  // Simple CSS animation for fade in and out
  const animationStyle = {
    animation: 'fadeInOut 3s ease-in-out',
  };

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

// Array of prompt templates for the buttons
const promptTemplates = [
  {
    title: 'Hero Section',
    prompt: 'A modern, professional hero section for a SaaS product named "InnovateAI". It should have a catchy title, a short descriptive paragraph, and two buttons: "Get Started for Free" and "View Pricing".',
  },
  {
    title: 'Login Form',
    prompt: 'A clean and simple login form with fields for "Email" and "Password", a "Remember me" checkbox, a "Sign In" button, and a "Forgot your password?" link.',
  },
  {
    title: 'Pricing Page',
    prompt: 'A pricing page with three tiers: "Basic", "Pro", and "Enterprise". Each tier should have a title, a price, a short list of key features, and a "Sign Up" button. The "Pro" tier should be highlighted as the most popular.',
  },
  {
    title: 'Contact Form',
    prompt: 'A contact form with fields for "Full Name", "Email Address", "Subject", and "Message". Include a "Send Message" submit button.',
  },
];

// Main App Component
function App() {
  // IMPORTANT: Paste your OpenRouter API Key here
  const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('// Your generated code will appear here...');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = generatedCode;
    }
  }, [generatedCode]);

  const handleGenerateClick = async () => {
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.includes("YOUR_OPENROUTER_API_KEY_HERE")) {
      setError("Please add your OpenRouter API Key to the code in src/App.jsx");
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

    const systemPrompt = `You are an expert frontend developer specializing in clean, modern web design. Your task is to generate or modify a single, self-contained HTML file based on the user's request.

Rules:
1.  **Single File:** All HTML, CSS, and JavaScript must be in one .html file.
2.  **Styling:** Use Tailwind CSS for all styling. You MUST include the Tailwind CDN script ('<script src="https://cdn.tailwindcss.com"></script>') in the <head>.
3.  **Conversational Edits:** If the user's prompt is a follow-up request to modify existing code, you MUST return the complete, modified HTML file. Do not only return the changed snippet.
4.  **Code Only:** Your response must ONLY contain the raw HTML code. Do not include any explanations, comments, or markdown ticks like \`\`\`html.`;

    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

    const newHistory = [...conversationHistory, { role: 'user', content: prompt }];
    
    const payload = {
        model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
        messages: [
            { role: "system", content: systemPrompt },
            ...newHistory
        ]
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'AI Frontend Generator'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed with status: ${response.status}. Body: ${errorBody}`);
      }

      const result = await response.json();
      const code = result.choices?.[0]?.message?.content;
      
      if (code) {
        setGeneratedCode(code.trim());
        setConversationHistory([...newHistory, { role: 'assistant', content: code.trim() }]);
        setPrompt(''); // Clear the prompt input after successful generation
      } else {
        throw new Error("Received an empty or invalid response from the API.");
      }

    } catch (err) {
      const errorMessage = `Failed to generate code. Error: ${err.message}`;
      setGeneratedCode(`// ${errorMessage}`);
      setError(errorMessage.split('Body:')[0]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNewChat = () => {
    setPrompt('');
    setGeneratedCode('// Your generated code will appear here...');
    setConversationHistory([]);
    setError(null);
  };

  const handleCopyClick = () => {
    if (!generatedCode || generatedCode.startsWith('//')) return;
    navigator.clipboard.writeText(generatedCode)
      .then(() => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      })
      .catch(err => console.error('Failed to copy code: ', err));
  };

  return (
    <div className="h-screen flex flex-col font-sans bg-gradient-to-br from-slate-900 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-slate-900/70 backdrop-blur-sm shadow-lg p-4 z-10 border-b border-slate-800">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-sky-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-3 -mt-1"><path d="m18 16 4-4-4-4"></path><path d="m6 8-4 4 4 4"></path><path d="m14.5 4-5 16"></path></svg>
            AI Frontend Generator
          </h1>
          <div>
            <span className="text-sm text-slate-400 mr-4">Powered by OpenRouter</span>
            <button onClick={handleNewChat} className="bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 text-sm font-medium py-1 px-3 rounded-full transition-colors">
              + New Chat
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
        
        {/* Left Side: Controls & Code */}
        <div className="flex flex-col h-full min-h-0">
          {/* Prompt Area */}
          <div className="flex-shrink-0">
            <label htmlFor="prompt-input" className="block text-sm font-medium text-slate-300 mb-2">Your Prompt</label>
            <textarea 
              id="prompt-input" 
              rows="4" 
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all duration-300 shadow-inner" 
              placeholder="e.g., A professional hero section... or 'make the title bigger'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
            />
            
            {/* New Prompt Templates Section */}
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-400 mb-2">Or start a new chat with an example:</label>
              <div className="flex flex-wrap gap-2">
                {promptTemplates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      handleNewChat();
                      setPrompt(template.prompt);
                    }}
                    disabled={isLoading}
                    className="bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm font-medium py-1 px-3 rounded-full transition-colors disabled:opacity-50"
                  >
                    {template.title}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <button 
              id="generate-btn" 
              className="mt-5 w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 shadow-lg shadow-sky-500/20 hover:shadow-xl hover:shadow-cyan-500/20"
              onClick={handleGenerateClick}
              disabled={isLoading}
            >
              {isLoading ? (
                <svg className="animate-spin mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
              )}
              <span>{isLoading ? 'Generating...' : 'Generate Code'}</span>
            </button>
          </div>
          
          {/* Code Output */}
          <div className="mt-4 flex-grow flex flex-col bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden min-h-0 shadow-inner">
            <div className="flex justify-between items-center p-3 border-b border-slate-700 flex-shrink-0 bg-slate-900/50">
              <h2 className="text-lg font-semibold">Generated Code</h2>
              <button onClick={handleCopyClick} className="bg-slate-700 hover:bg-slate-600 text-sm font-medium py-1 px-3 rounded-md transition-colors">Copy</button>
            </div>
            <div className="flex-grow h-0">
              <pre className="h-full w-full"><code id="code-output" className="h-full block overflow-auto p-4 text-sm bg-slate-900 text-slate-300 font-mono">{generatedCode}</code></pre>
            </div>
          </div>
        </div>

        {/* Right Side: Live Preview */}
        <div className="flex flex-col h-full min-h-0">
          <h2 className="text-lg font-semibold mb-2 text-slate-300">Live Preview</h2>
          <div className="flex-grow bg-white rounded-lg border border-slate-700 shadow-xl ring-1 ring-slate-800">
            <iframe ref={iframeRef} className="w-full h-full rounded-lg" title="Live Preview"></iframe>
          </div>
        </div>
      </main>
      <Toast message="Copied to clipboard!" show={showToast} />
    </div>
  );
}

export default App;

