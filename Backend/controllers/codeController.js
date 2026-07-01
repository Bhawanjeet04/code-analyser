// Backend/controllers/codeController.js
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai'; 
import dotenv from 'dotenv';
import { Code } from '../models/Code.js';

dotenv.config();

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const COMPILER_IDENTIFIER_MAP = {
  cpp: 'g++-15',
  python: 'python-3.14',
  javascript: 'typescript-deno', 
  java: 'openjdk-25'
};

export const executeCode = async (req, res) => {
  const { code, language, input } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code content cannot be empty.' });
  }

  const targetCompiler = COMPILER_IDENTIFIER_MAP[language];
  if (!targetCompiler) {
    return res.status(400).json({ error: `Language selector node '${language}' is unmapped.` });
  }

  try {
    const targetUrl = process.env.ONLINE_COMPILER_URL || 'https://api.onlinecompiler.io/api/run-code-sync/';
    const apiKey = process.env.ONLINE_COMPILER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Missing Online Compiler authorization key in server configuration.' });
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': apiKey, 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        compiler: targetCompiler, 
        code: code,               
        input: input || ""        
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'Compilation endpoint exception.' });
    }

    return res.status(200).json({
      stdout: data.output || "",
      stderr: data.error || "", 
      status: data.status,
      exitCode: data.exit_code
    });

  } catch (error) {
    console.error('Online-Compiler Integration Gateway Error:', error);
    return res.status(500).json({ error: 'Failed to establish connection link with serverless execution endpoint.' });
  }
};

export const analyzeCode = async (req, res) => {
  const { code, language } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code content is required for analysis.' });
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an elite software auditor and competitive programming expert. 
Analyze the following ${language} code snapshot meticulously. 

Provide your assessment strictly using clean, professional Markdown formatting with the following exact structural sections:
### 📝 Code Overview
(Briefly explain what this program accomplishes in plain English)

### 📊 Complexity Profiles
* **Time Complexity:** Explicit Big-O notation with short mathematical justification.
* **Space Complexity:** Explicit Big-O notation with short justification.

### 🔍 Edge Cases & Structural Vulnerabilities
(Highlight potential out-of-bounds metrics, infinite execution paths, null pointer allocations, or runtime errors)

### 💡 Suggested Optimizations
(Provide bullet-point suggestions followed by an optimized monospace code snippet block where applicable)

Here is the source code:
\`\`\`${language}
${code}
\`\`\``;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return res.status(200).json({ analysis: responseText });

  } catch (error) {
    console.error('Gemini Analysis Integration Error:', error);
    return res.status(500).json({ error: 'Failed to generate software audit analytics via Gemini.' });
  }
};

export const saveWorkspaceCode = async (req, res) => {
  const { userId, roomId, language, code, fileName } = req.body;

  if (!userId || !fileName) {
    return res.status(400).json({ error: 'User ID and File Name are mandatory parameters.' });
  }

  try {
    const queryTarget = {
      userId,
      roomId: roomId || null,
      fileName: fileName.trim()
    };

    const updatePayload = {
      language,
      codeContent: code || ""
    };

    const record = await Code.findOneAndUpdate(queryTarget, updatePayload, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    });

    return res.status(200).json({ status: 'success', record });
  } catch (error) {
    console.error('Database Save Error:', error);
    return res.status(500).json({ error: 'Failed to write file buffer node.' });
  }
};

/**
 * 🚀 FIXED: Added the missing loadWorkspaceCode function mapped by your router
 */
export const loadWorkspaceCode = async (req, res) => {
  const { userId, roomId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter.' });
  }
  try {
    const record = await Code.findOne({ userId, roomId: roomId || null }).sort({ updatedAt: -1 });
    return res.status(200).json({ record });
  } catch (error) {
    console.error('Database Load Single Error:', error);
    return res.status(500).json({ error: 'Failed to extract single document.' });
  }
};

export const loadAllFiles = async (req, res) => {
  const { userId, roomId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter.' });
  }

  try {
    const files = await Code.find({ userId, roomId: roomId || null }).sort({ createdAt: 1 });
    return res.status(200).json({ files });
  } catch (error) {
    console.error('Database Fetch Files Error:', error);
    return res.status(500).json({ error: 'Failed to extract directory tree.' });
  }
};


export const deleteFile = async (req, res) => {
  try {
    // Look in query parameters first, then fall back to body parameters
    const userId = req.query.userId || req.body.userId;
    const roomId = req.query.roomId || req.body.roomId;
    const fileName = req.query.fileName || req.body.fileName;

    if (!userId || !fileName) {
      return res.status(400).json({ error: 'userId and fileName are required for deletion.' });
    }

    const result = await Code.findOneAndDelete({
      userId: userId,
      roomId: roomId || null,
      fileName: fileName.trim()
    });

    if (!result) {
      return res.status(404).json({ error: 'File not found in database.' });
    }

    return res.status(200).json({ message: 'File deleted cleanly.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};