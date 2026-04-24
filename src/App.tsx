import { useState, useRef, useEffect } from 'react';
import { Search, Menu, Send, Paperclip, Smile, MoreVertical, Phone, Video, ArrowLeft, Check, CheckCheck, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { databases, APPWRITE_CONFIG, client } from './lib/appwrite';
import { ID, Query } from 'appwrite';

type Message = {
  $id: string;
  text: string;
  timestamp: string;
  senderId: string;
  isRead: boolean;
};

type User = {
  $id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'last seen recently';
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
};

const CURRENT_USER_ID = 'me';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(!!import.meta.env.VITE_APPWRITE_PROJECT_ID);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    if (isConfigured) {
        fetchUsers();
        // Setup real-time listeners
        const unsubscribe = client.subscribe(
            [`databases.${APPWRITE_CONFIG.databaseId}.collections.${APPWRITE_CONFIG.collections.messages}.documents`],
            (response) => {
                const payload = response.payload as Message;
                // If the message is for the active chat, update messages state
                // This is a simplified check
                if (activeUserId && (payload.senderId === activeUserId || payload.senderId === CURRENT_USER_ID)) {
                    // Only fetch if it's relevant. Better to just fetch all messages for current chat again or append if it's new
                     fetchMessages(activeUserId);
                }
                fetchUsers(); // Refresh sidebar for all changes
            }
        );
        return () => unsubscribe();
    } else {
        setLoading(false);
    }
  }, [isConfigured, activeUserId]);

  useEffect(() => {
    if (activeUserId && isConfigured) {
      fetchMessages(activeUserId);
    }
  }, [activeUserId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchUsers = async () => {
    if (!APPWRITE_CONFIG.collections.users) return;
    try {
      const response = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId!,
          APPWRITE_CONFIG.collections.users!,
          [Query.limit(100)]
      );
      setUsers(response.documents as unknown as User[]);
    } catch (err) {
      console.error('Appwrite User Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    if (!APPWRITE_CONFIG.collections.messages) return;
    try {
      // In a real app, you'd filter by sender and recipient
      // Here we assume a simple test model where messages are just global for demo
      const response = await databases.listDocuments(
          APPWRITE_CONFIG.databaseId!,
          APPWRITE_CONFIG.collections.messages!,
          [
              Query.orderAsc('$createdAt'),
              Query.limit(100)
          ]
      );
      setMessages(response.documents as unknown as Message[]);
    } catch (err) {
      console.error('Appwrite Message Fetch Error:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeUserId || !isConfigured) return;

    const text = inputText.trim();
    setInputText('');

    try {
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId!,
        APPWRITE_CONFIG.collections.messages!,
        ID.unique(),
        {
          text,
          senderId: CURRENT_USER_ID,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: false,
          recipientId: activeUserId // Store who it's for
        }
      );
    } catch (err) {
      console.error('Appwrite Send Error:', err);
    }
  };

  const activeUser = users.find(u => u.$id === activeUserId);
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!isConfigured) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-[#020617] text-[#f1f5f9] p-8 text-center">
              <div className="w-16 h-16 bg-sky-500/10 rounded-2xl flex items-center justify-center mb-6 border border-sky-500/20">
                  <Settings className="text-sky-500 animate-spin-slow" size={32} />
              </div>
              <h1 className="text-xl font-bold tracking-tight mb-4 uppercase">Configuration Required</h1>
              <p className="text-sm text-[#94a3b8] max-w-md leading-relaxed mb-8">
                  Чтобы использовать <span className="text-sky-400">Appwrite</span>, настройте переменные окружения в панели <span className="text-white font-semibold">Secrets</span>.
              </p>
              <div className="grid grid-cols-1 gap-3 w-full max-w-sm text-left font-mono text-[10px] text-[#475569]">
                  <div className="p-3 bg-[#0f172a] border border-[#1e293b] rounded-lg">VITE_APPWRITE_PROJECT_ID</div>
                  <div className="p-3 bg-[#0f172a] border border-[#1e293b] rounded-lg">VITE_APPWRITE_DATABASE_ID</div>
                  <div className="p-3 bg-[#0f172a] border border-[#1e293b] rounded-lg">VITE_APPWRITE_COLLECTION_MESSAGES_ID</div>
              </div>
              <button 
                onClick={() => setIsConfigured(true)} // Manually try if they set it
                className="mt-8 px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all uppercase tracking-widest"
              >
                  Check Connection
              </button>
          </div>
      )
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#020617] text-sky-400">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-mono tracking-widest text-xs uppercase">ColdGram Linking...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-[#020617] text-[#f1f5f9] font-sans" style={{ height: '100dvh' }}>
      
      {/* Sidebar */}
      <div 
        className={`w-full md:w-80 lg:w-[320px] flex-shrink-0 flex flex-col border-r border-[#1e293b] bg-[#0f172a] transition-all duration-300
          ${!isMobileListVisible ? 'hidden md:flex' : 'flex'}`}
      >
        <div className="p-4 flex flex-col gap-4 border-b border-[#1e293b]">
          <div className="flex items-center justify-between">
            <button className="p-2 text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1e293b] rounded-lg transition-colors">
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-bold tracking-tight text-sky-500 italic">COLD_PROTOCOL</h1>
            <div className="w-8 h-8 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center text-[10px] font-bold text-sky-500">A</div>
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Filter channels..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#020617] text-[#f1f5f9] placeholder-[#475569] rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all border border-[#1e293b]"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredUsers.length > 0 ? filteredUsers.map(user => (
            <div 
              key={user.$id}
              onClick={() => {
                setActiveUserId(user.$id);
                setIsMobileListVisible(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b border-[#020617]/50
                ${activeUserId === user.$id ? 'bg-[#1e293b] border-l-2 border-l-sky-500' : 'hover:bg-[#1e293b]/50'}`}
            >
              <div className="relative flex-shrink-0">
                <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-xl object-cover border border-[#334155] grayscale transition-all duration-500" />
                {user.status === 'online' && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-sky-500 border-2 border-[#0f172a] rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="text-sm font-semibold truncate pr-2 tracking-wide uppercase">{user.name}</h3>
                  <span className={`text-[9px] font-mono flex-shrink-0 ${activeUserId === user.$id ? 'text-sky-400' : 'text-[#64748b]'}`}>
                    {user.lastMessageTime}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-[#94a3b8] truncate pr-2 italic opacity-60">
                    {user.lastMessage || 'Channel silent...'}
                  </p>
                  {user.unreadCount ? (
                    <span className="bg-sky-500 text-[#020617] text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[18px] text-center">
                      {user.unreadCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )) : (
              <div className="p-8 text-center text-[10px] text-[#475569] font-mono leading-loose">
                  ERROR: NO ACTIVE CHANNELS FOUND.<br/>
                  PLEASE SEED DATABASE.
              </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div 
        className={`flex-1 flex flex-col bg-[#020617] relative overflow-hidden
          ${isMobileListVisible ? 'hidden md:flex' : 'flex'}`}
      >
        {activeUser ? (
          <>
            <div className="h-16 flex items-center px-6 justify-between border-b border-[#1e293b] bg-[#0f172a]/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <button 
                  className="md:hidden p-2 -ml-2 text-[#94a3b8] hover:text-[#f1f5f9]"
                  onClick={() => setIsMobileListVisible(true)}
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-sm font-bold tracking-widest uppercase">{activeUser.name}</h2>
                  <p className={`text-[9px] font-mono ${activeUser.status === 'online' ? 'text-sky-400' : 'text-[#64748b]'}`}>
                    {activeUser.status === 'online' ? 'SECURE_UPLINK_ESTABLISHED' : 'CHANNEL_IDLE'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-5 text-[#64748b]">
                <MoreVertical size={18} className="cursor-pointer hover:text-[#f1f5f9]" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 z-10 flex flex-col gap-6 custom-scrollbar bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-95">
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isMe = msg.senderId === CURRENT_USER_ID;
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      key={msg.$id} 
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                        <div 
                          className={`relative px-4 py-3 border
                            ${isMe 
                              ? 'bg-[#1e293b] border-sky-500/20 text-[#f1f5f9] rounded-2xl rounded-tr-none' 
                              : 'bg-[#0f172a] border-[#334155] text-[#cbd5e1] rounded-2xl rounded-tl-none'
                            } shadow-2xl`}
                        >
                          <p className="text-sm leading-relaxed font-light tracking-wide">{msg.text}</p>
                          <div className={`mt-2 flex items-center justify-end gap-2 opacity-40 font-mono text-[9px]`}>
                            <span>{msg.timestamp}</span>
                            {isMe && (
                              <div className="flex -space-x-1">
                                <Check size={10} className={msg.isRead ? 'text-sky-400' : 'text-slate-500'} />
                                {msg.isRead && <Check size={10} className="text-sky-400" />}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 bg-[#020617]/80 backdrop-blur-sm border-t border-[#1e293b] z-10">
              <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-3 focus-within:border-sky-500/30 transition-all">
                  <button type="button" className="text-[#475569] hover:text-sky-400 transition-colors">
                    <Paperclip size={20} />
                  </button>
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Input data string..."
                    className="flex-1 bg-transparent text-sm text-[#f1f5f9] placeholder-[#475569] focus:outline-none font-mono"
                  />
                  <div className="flex items-center gap-4">
                    <button 
                      type="submit" 
                      disabled={!inputText.trim()}
                      className={`flex items-center justify-center transition-all ${inputText.trim() ? 'text-sky-400 hover:scale-110' : 'text-[#1e293b]'}`}
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </form>
                <div className="mt-4 flex justify-between items-center px-1">
                  <span className="text-[8px] text-[#334155] font-mono uppercase tracking-[0.3em]">System: Static-X Stable v4.1</span>
                  <div className="flex gap-2">
                    <div className="w-1 h-1 rounded-full bg-sky-500/40 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#020617] z-10 overflow-hidden">
             <div className="relative mb-8 opacity-20">
                <div className="absolute inset-0 bg-sky-500/20 blur-3xl rounded-full"></div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="w-32 h-32 text-sky-500 relative">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
             </div>
            <div className="bg-[#0f172a] border border-[#1e293b] px-8 py-3 rounded-md text-[10px] font-mono text-[#475569] tracking-[0.3em] uppercase">
              Standby for transmission...
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
        }
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
