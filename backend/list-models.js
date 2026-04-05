require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'AIzaSyDtV0HkFF1ncfG1IloRg8KbhXSYwXAyIOA');
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + (process.env.GOOGLE_API_KEY || 'AIzaSyDtV0HkFF1ncfG1IloRg8KbhXSYwXAyIOA'));
    const data = await response.json();
    console.log(data.models.map(m => m.name));
  } catch (e) {
    console.error(e);
  }
}
run();
