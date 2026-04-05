require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const db = require('./db/database');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Use Render port
const port = process.env.PORT || 5000;

// ❌ REMOVE HARDCODED API KEY (security issue)
// ✅ Use only env variable
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ✅ ROOT ROUTE (fixes "Cannot GET /")
app.get('/', (req, res) => {
    res.json({ message: "NCERT RAG Backend is running 🚀" });
});

// Load mock database
const mockDataPath = path.join(__dirname, 'data', 'ncert_mock.json');
let mockData = [];

if (fs.existsSync(mockDataPath)) {
    mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
}

// 🔹 CHAT API
app.post('/api/chat', async (req, res) => {
    const { query, grade, subject, history } = req.body;

    let contextChunks = mockData.filter(item => {
        const gradeMatch = grade === 'All' || item.grade === grade;
        const subjectMatch = subject === 'All' || item.subject.toLowerCase() === subject.toLowerCase();
        return gradeMatch && subjectMatch;
    });

    let contextText = contextChunks
        .map(c => `[Grade ${c.grade} ${c.subject} - ${c.chapter}]: ${c.text}`)
        .join('\n\n');

    if (!contextText) {
        contextText = 'No specific mock data found. Use your general knowledge of the NCERT syllabus.';
    }

    const systemPrompt = `
You are an expert, multilingual NCERT Doubt-Solver for students in Grades 5-10.

Context:
${contextText}

Rules:
- Answer using context if possible
- Otherwise use NCERT knowledge
- Reply in same language as question
- Always give citation
- If unrelated → reply ONLY: "I don't know."
`;

    try {
        let conversation = [];

        if (history && history.length > 0) {
            conversation = history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));
        }

        const chat = model.startChat({
            history: conversation,
            systemInstruction: { parts: [{ text: systemPrompt }] }
        });

        const result = await chat.sendMessage(query);
        const responseText = result.response.text();

        res.json({ response: responseText });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: 'Failed to generate response.' });
    }
});

// 🔹 FEEDBACK API
app.post('/api/feedback', (req, res) => {
    const { query, response, grade, subject, score } = req.body;

    db.run(
        `INSERT INTO feedback (query, response, grade, subject, score) VALUES (?, ?, ?, ?, ?)`,
        [query, response, grade, subject, score],
        function(err) {
            if (err) {
                console.error("DB Insert Error", err);
                return res.status(500).json({ error: 'Failed to save feedback' });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// ✅ START SERVER
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});