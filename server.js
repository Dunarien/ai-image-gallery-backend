require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const app = express();
const upload = multer();

const API_KEY = process.env.OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ error: 'No image file uploaded' });
  }

  const base64Image = req.file.buffer.toString('base64');
  const prompt = `Analyze this image and provide the following information:
  1. A descriptive title for the image
  2. A prompt that could have been used to generate this image (if applicable)
  3. 40 keywords that summarize the content of the image
  4. The format of the image

  Image: ${base64Image}`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    const lines = analysis.split('\n');
    const title = lines.find(line => line.startsWith('1.'))?.replace('1.', '').trim() || 'Untitled';
    const generationPrompt = lines.find(line => line.startsWith('2.'))?.replace('2.', '').trim() || 'Prompt not available';
    const keywords = lines.find(line => line.startsWith('3.'))?.replace('3.', '').trim().split(',').map(k => k.trim()) || [];
    const format = lines.find(line => line.startsWith('4.'))?.replace('4.', '').trim() || req.file.mimetype;

    res.send({ title, prompt: generationPrompt, keywords, format });
  } catch (error) {
    console.error('Error analyzing image:', error);
    res.status(500).send({ error: 'Failed to analyze image' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
