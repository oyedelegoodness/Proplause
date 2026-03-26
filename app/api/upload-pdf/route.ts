import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File | null;
    const numQuestions = parseInt(formData.get('numQuestions') as string) || 10; // default lowered

    if (!file) {
      return NextResponse.json({ error: "Please upload a PDF file" }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF too large. Please use a smaller file (max 15MB)." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // Most reliable model right now for many users (especially with permission issues)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `You are a strict OAU lecturer creating real CBT (OBJ) exam questions.

Generate exactly ${numQuestions} high-quality multiple choice questions from the lecture note.

Each question must:
- Have exactly 4 options (A, B, C, D)
- Have only one correct answer
- Include a short clear explanation

Format exactly like this (no extra words):

Question 1: Question text here?
A) Option A
B) Option B
C) Option C
D) Option D
Correct Answer: B
Explanation: Short reason why B is correct.

Continue until Question ${numQuestions}.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64,
          mimeType: "application/pdf"
        }
      }
    ]);

    const responseText = result.response.text();

    return NextResponse.json({
      success: true,
      questions: responseText
    });

  } catch (error: any) {
    console.error("Gemini Error:", error);

    let userMessage = "Failed to generate questions. ";

    if (error.message?.includes("403") || error.message?.includes("PERMISSION_DENIED")) {
      userMessage = "API permission issue with your Gemini key. Try these: 1) Use fewer questions (10). 2) Use a very small PDF (under 10 pages). 3) Check if billing is enabled on your Google AI Studio key.";
    } else if (error.message?.includes("quota") || error.message?.includes("429")) {
      userMessage = "Rate limit reached. Wait a minute and try again with fewer questions.";
    }

    return NextResponse.json({ 
      error: userMessage 
    }, { status: 500 });
  }
}
