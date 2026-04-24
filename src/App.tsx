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

const MOCK_USERS_LOCAL: User[] = [
  { $id: '1', name: 'ALEKSEY_SMIRNOV', avatar: 'https://i.pravatar.cc/150?u=a1', status: 'online', lastMessage: 'SYSTEM: UPLINK_SUCCESS', lastMessageTime: '10:30', nickname: 'asmir' } as any,
  { $id: '2', name: 'WORK_NODE_04', avatar: 'https://i.pravatar.cc/150?u=a2', status: 'offline', lastMessage: 'PENDING_REPORT_042', lastMessageTime: 'Вчера', nickname: 'node4' } as any,
  { $id: '6', name: 'ROOT_ADMIN', avatar: 'https://i.pravatar.cc/150?u=a6', status: 'online', lastMessage: 'THE_WALL_IS_GONE', lastMessageTime: '2007', unreadCount: 1, nickname: 'durov' } as any,
];

const MOCK_MESSAGES_LOCAL: Message[] = [
  { $id: 'm1', text: 'Terminal initialized. Initializing secure handshake...', timestamp: '10:25', senderId: '1', isRead: true },
  { $id: 'm2', text: 'Handshake accepted. Protocol X-01 active.', timestamp: '10:26', senderId: 'me', isRead: true },
  { $id: 'm3', text: 'This is the cold work environment you requested. No noise. Pure data.', timestamp: '10:27', senderId: '1', isRead: false },
];

export default function App() {
  const [user, setUser] = useState<{ name: string; avatar: string } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isAppwriteReady, setIsAppwriteReady] = useState(!!import.meta.env.VITE_APPWRITE_PROJECT_ID);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial load logic with fallback
  useEffect(() => {
    const initData = async () => {
      // Restore local session
      const saved = localStorage.getItem('coldgram_user');
      if (saved) setUser(JSON.parse(saved));

      if (isAppwriteReady) {
        try {
          await fetchUsersFromAppwrite();
        } catch (e) {
          console.warn("Appwrite failed, using local node.");
          setUsers(MOCK_USERS_LOCAL);
        }
      } else {
        // Just use mock data if no keys
        setUsers(MOCK_USERS_LOCAL);
      }
      setLoading(false);
    };
    initData();
  }, [isAppwriteReady]);

  // Handle message updates
  useEffect(() => {
    if (activeUserId) {
      if (isAppwriteReady) {
        fetchMessagesFromAppwrite(activeUserId);
      } else {
        setMessages(MOCK_MESSAGES_LOCAL);
      }
    }
  }, [activeUserId, isAppwriteReady]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchUsersFromAppwrite = async () => {
    const response = await databases.listDocuments(APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.collections.users!);
    setUsers(response.documents as unknown as User[]);
  };

  const fetchMessagesFromAppwrite = async (userId: string) => {
    const response = await databases.listDocuments(APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.collections.messages!, [Query.orderAsc('$createdAt')]);
    setMessages(response.documents as unknown as Message[]);
  };

  const handleLogin = () => {
      // Simulation of Google OAuth result
      const mockResult = { name: 'GUEST_' + Math.floor(Math.random() * 1000), avatar: 'https://i.pravatar.cc/150?u=me' };
      setUser(mockResult);
      localStorage.setItem('coldgram_user', JSON.stringify(mockResult));
  };

  const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('coldgram_user');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeUserId) return;

    const text = inputText.trim();
    const tempId = Date.now().toString();
    const newMsg: Message = {
      $id: tempId,
      text,
      senderId: CURRENT_USER_ID,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    if (isAppwriteReady) {
      try {
        await databases.createDocument(APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.collections.messages!, ID.unique(), {
          text, senderId: CURRENT_USER_ID, timestamp: newMsg.timestamp, isRead: false
        });
      } catch (err) {
        console.error("Transmission error:", err);
      }
    }
  };

  const activeUser = users.find(u => u.$id === activeUserId);
  
  // Search logic by name and nickname
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u as any).nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-[#020617] p-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm bg-[#0f172a] border border-[#1e293b] p-8 rounded-2xl shadow-3xl text-center"
              >
                  <div className="w-16 h-16 bg-sky-500/10 rounded-2xl flex items-center justify-center mb-8 mx-auto border border-sky-500/20">
                      <Send className="text-sky-500 rotate-12" size={32} />
                  </div>
                  <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter italic">COLD_GRAM</h1>
                  <p className="text-xs text-[#64748b] font-mono tracking-widest uppercase mb-10">Secure Data Interface v4.1</p>
                  
                  <button 
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 px-6 rounded-xl font-bold transition-all hover:bg-slate-100 active:scale-95 mb-4 shadow-xl shadow-white/5"
                  >
                      <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                      Sign with Google
                  </button>
                  <p className="text-[9px] text-[#334155] font-mono tracking-tighter uppercase italic">
                      SYSTEM_STATUS: STANDBY... AWAITING_AUTH
                  </p>
              </motion.div>
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
            <h1 className="text-sm font-bold tracking-tight text-sky-500 italic uppercase">Cold_Unit</h1>
            <div 
              onClick={handleLogout}
              className="w-10 h-10 rounded-xl bg-[#1e293b] border border-[#334155] flex items-center justify-center cursor-pointer hover:border-red-500/50 transition-all group overflow-hidden"
            >
              <img src={user.avatar} className="w-full h-full object-cover group-hover:opacity-20" alt="Me" />
              <div className="absolute opacity-0 group-hover:opacity-100 text-[10px] text-red-500 font-bold uppercase">OUT</div>
            </div>
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search by nickname..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#020617] text-[#f1f5f9] placeholder-[#475569] rounded-lg py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all border border-[#1e293b] font-mono"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
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
