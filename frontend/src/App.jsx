import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './index.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'chat'
  const [messages, setMessages] = useState([{ role: 'bot', text: 'Hello! I am your NCERT Doubt Solver. Ask me anything from Grades 5-10!' }]);
  const [input, setInput] = useState('');
  const [grade, setGrade] = useState('All');
  const [subject, setSubject] = useState('All');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (currentPage === 'chat') {
      scrollToBottom();
    }
  }, [messages, currentPage]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', text: input };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/chat', {
        query: userMessage.text,
        grade,
        subject,
        history: messages.filter(m => m.role !== 'bot' || m.text !== 'Hello! I am your NCERT Doubt Solver. Ask me anything from Grades 5-10!')
      });

      const botMessage = { role: 'bot', text: response.data.response };
      setMessages([...currentMessages, botMessage]);
    } catch (error) {
      console.error(error);
      setMessages([...currentMessages, { role: 'bot', text: 'Sorry, I encountered an error. Please try again.' }]);
    }

    setLoading(false);
  };

  const handleFeedback = async (messageIndex, score) => {
    const message = messages[messageIndex];
    if (message.role !== 'bot') return;
    
    let query = '';
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        query = messages[i].text;
        break;
      }
    }

    try {
      await axios.post('http://localhost:5000/api/feedback', {
        query,
        response: message.text,
        grade,
        subject,
        score
      });
      alert(score > 0 ? 'Thanks for the positive feedback!' : 'Thanks for your feedback, we will improve.');
    } catch (error) {
      console.error("Feedback error", error);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1 onClick={() => setCurrentPage('home')}>
          🌟 NCERT Doubt Solver
        </h1>
        <div className="nav-links">
          {currentPage === 'chat' ? (
             <button onClick={() => setCurrentPage('home')}>Back to Home</button>
          ) : (
             <button onClick={() => setCurrentPage('chat')}>📝 Open Chat</button>
          )}
        </div>
      </div>

      {currentPage === 'home' && (
        <div className="home-page">
          <img src="/hero.png" alt="Student using AI" className="hero-image" />
          <h2>Your AI Study Companion</h2>
          <p>
            Master the NCERT curriculum with an intelligent tutor available 24/7. 
            Ask questions in multiple languages and get highly accurate, verified answers 
            tailored to your grade and subject.
          </p>
          
          <button className="start-btn" onClick={() => setCurrentPage('chat')}>
            Start Learning Now →
          </button>

          <div className="features">
            <div className="feature-card">
              <h3>🌍 Multilingual support</h3>
              <p>Ask in English, Hindi, Urdu & more.</p>
            </div>
            <div className="feature-card">
              <h3>📘 NCERT strict</h3>
              <p>Reliable answers based on the curriculum.</p>
            </div>
            <div className="feature-card">
              <h3>🎯 Grade specific</h3>
              <p>Context customized from Grades 5 to 10.</p>
            </div>
          </div>
        </div>
      )}

      {currentPage === 'chat' && (
        <div className="chat-page">
          <div className="filters">
            <select value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="All">All Grades</option>
              {[5, 6, 7, 8, 9, 10].map(g => <option key={g} value={g}>Class {g}</option>)}
            </select>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="All">All Subjects</option>
              <option value="math">Mathematics</option>
              <option value="science">Science</option>
              <option value="social science">Social Science</option>
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
            </select>
          </div>

          <div className="chat-container">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div>{msg.text}</div>
                {msg.role === 'bot' && index > 0 && (
                  <div className="feedback">
                    <button onClick={() => handleFeedback(index, 1)}>👍 Helpful</button>
                    <button onClick={() => handleFeedback(index, -1)}>👎 Not Helpful</button>
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="message bot">Thinking... 🧠</div>}
            <div ref={chatEndRef} />
          </div>

          <div className="input-area">
            <input 
              type="text" 
              placeholder="Ask your doubt here... (e.g. What is photosynthesis?)" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
