import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File | null;
    const numQuestions = parseInt(formData.get('numQuestions') as string) || 15;

    if (!file) {
      return NextResponse.json({ error: "Please upload a PDF file" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash"   // ← Best one for your use case
    });

    const prompt = `You are a strict and experienced OAU lecturer setting real university exam questions.

Generate exactly ${numQuestions} high-quality, exam-standard Objective (MCQ) questions from the uploaded lecture note.

Focus on:
- Important concepts, definitions, principles, diagrams, and applications
- Make questions tricky but fair (real exam level)
- Test deep understanding

Each question must have:
- Exactly 4 options: A, B, C, D
- Only ONE correct answer
- A short, clear explanation

Format **exactly** like this (nothing else):

Question 1: What is the primary function of the Krebs cycle?
A) Glycolysis
B) ATP production through oxidation
C) Protein synthesis
D) DNA replication

Correct Answer: B
Explanation: The Krebs cycle (citric acid cycle) is central to cellular respiration for generating energy.

Question 2: ...
Continue until Question ${numQuestions}.

Now generate the questions based on the PDF:`;

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
      error: error.message || "Failed to generate questions. Try a smaller or clearer PDF." 
    }, { status: 500 });
  }
}