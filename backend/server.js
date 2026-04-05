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

const port = process.env.PORT || 5000;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'AIzaSyDtV0HkFF1ncfG1IloRg8KbhXSYwXAyIOA');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Load mock database
const mockDataPath = path.join(__dirname, 'data', 'ncert_mock.json');
let mockData = [];
if (fs.existsSync(mockDataPath)) {
    mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
}

app.post('/api/chat', async (req, res) => {
    const { query, grade, subject, history } = req.body;

    // Retrieve context from mock DB
    let contextChunks = mockData.filter(item => {
        const gradeMatch = grade === 'All' || item.grade === grade;
        const subjectMatch = subject === 'All' || item.subject.toLowerCase() === subject.toLowerCase();
        return gradeMatch && subjectMatch;
    });

    let contextText = contextChunks.map(c => `[Grade ${c.grade} ${c.subject} - ${c.chapter}]: ${c.text}`).join('\n\n');
    if (!contextText) {
        contextText = 'No specific mock data found. Use your general knowledge of the NCERT syllabus.';
    }

    const systemPrompt = `
You are an expert, multilingual NCERT Doubt-Solver for students in Grades 5-10.
You must answer questions strictly related to educational school subjects.

Context from NCERT text:
${contextText}

Guidelines:
1. Try to answer the student's doubt using the provided Context if possible.
2. If the context is insufficient, use your profound internal knowledge of the Indian NCERT curriculum (Grades 5-10) to answer.
3. Automatically detect the language of the student's question and respond in that same language. Supported languages include English, Hindi, Urdu, and other local Indian languages.
4. Always provide a citation at the end of your answer in this format: "Citation: [Class X Subject, Chapter/Topic]". If using provided context, use the context's chapter. Otherwise, generate an appropriate NCERT-aligned citation.
5. If the user's question is completely unrelated to school subjects or is out of scope for Grades 5-10, you MUST reply ONLY with: "I don't know."
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

app.post('/api/feedback', (req, res) => {
    const { query, response, grade, subject, score } = req.body;
    
    // score is 1 for positive (thumbs up), -1 for negative (thumbs down)
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

app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
