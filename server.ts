import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory "database"
  const messages: Record<string, any[]> = {
    '1': [
      { id: 'm1', text: 'Привет! Как продвигается проект?', timestamp: '10:30', senderId: '1', isRead: true },
      { id: 'm2', text: 'Всё отлично, делаю холодный аналог телеграмма, как ты и просил.', timestamp: '10:32', senderId: 'me', isRead: true },
      { id: 'm3', text: 'Ого, звучит круто! Покажешь?', timestamp: '10:33', senderId: '1', isRead: false },
      { id: 'm4', text: 'Жду скриншоты.', timestamp: '10:34', senderId: '1', isRead: false },
    ],
    '2': [
      { id: 'm5', text: 'Не забудь про отчет за месяц.', timestamp: 'Вчера', senderId: '2', isRead: true },
    ],
    '4': [
      { id: 'm6', text: 'Ребят, какой цвет лучше использовать для темной темы?', timestamp: '09:15', senderId: '4', isRead: false },
    ],
    '6': [
      { id: 'm7', text: 'Стена возвращена не будет.', timestamp: '2007', senderId: '6', isRead: false },
    ]
  };

  const users = [
    { id: '1', name: 'Алексей Смирнов', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d', status: 'online', unreadCount: 2 },
    { id: '2', name: 'Катя (Работа)', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', status: 'last seen recently' },
    { id: '3', name: 'Максим', avatar: 'https://i.pravatar.cc/150?u=a04258114e29026702d', status: 'offline' },
    { id: '4', name: 'Дизайн Чат', avatar: 'https://i.pravatar.cc/150?u=a048581f4e29026701d', status: 'online', unreadCount: 15 },
    { id: '5', name: 'Мама', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026703d', status: 'last seen recently' },
    { id: '6', name: 'Павел Дуров', avatar: 'https://i.pravatar.cc/150?u=a04258a2462d826712d', status: 'online', unreadCount: 1 },
  ];

  // API Routes
  app.get("/api/users", (req, res) => {
    // Inject last messages info
    const usersWithMeta = users.map(user => {
      const userMsgs = messages[user.id] || [];
      const lastMsg = userMsgs[userMsgs.length - 1];
      return {
        ...user,
        lastMessage: lastMsg?.text,
        lastMessageTime: lastMsg?.timestamp
      };
    });
    res.json(usersWithMeta);
  });

  app.get("/api/messages/:userId", (req, res) => {
    const { userId } = req.params;
    res.json(messages[userId] || []);
  });

  app.post("/api/messages/:userId", (req, res) => {
    const { userId } = req.params;
    const { text, senderId } = req.body;
    
    const newMessage = {
      id: Date.now().toString(),
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderId,
      isRead: false
    };

    if (!messages[userId]) {
      messages[userId] = [];
    }
    messages[userId].push(newMessage);
    res.json(newMessage);
  });

  app.post("/api/messages/:userId/read", (req, res) => {
    const { userId } = req.params;
    if (messages[userId]) {
      messages[userId] = messages[userId].map(m => ({ ...m, isRead: true }));
    }
    // and clear unread count for the user record (simplified)
    const user = users.find(u => u.id === userId);
    if (user) user.unreadCount = 0;
    
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
