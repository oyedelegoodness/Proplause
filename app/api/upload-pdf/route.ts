import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File | null;
    const numQuestions = parseInt(formData.get('numQuestions') as string) || 10;

    if (!file) {
      return NextResponse.json({ error: "Please upload a PDF file" }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF is too large. Use smaller file (max 15MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // Most stable model right now
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `You are an OAU lecturer. Generate exactly ${numQuestions} good OBJ questions from the lecture note.

Each question must follow this exact format (nothing else):

Question 1: The question text here?
A) Option one
B) Option two
C) Option three
D) Option four
Correct Answer: B
Explanation: Short clear reason why this is correct.

Start directly with Question 1 and continue till Question ${numQuestions}.`;

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
    return NextResponse.json({
      error: "Failed to generate. Try 10 questions and a very small PDF (5-10 pages)."
    }, { status: 500 });
  }
}
