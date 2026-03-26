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

    if (file.size > 20 * 1024 * 1024) {  // Limit to 20MB for safety
      return NextResponse.json({ error: "PDF file is too large. Use a smaller file (max 20MB)." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // BEST MODEL RIGHT NOW for your case (more stable with many API keys)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite"
    });

    const prompt = `You are a strict and experienced OAU lecturer creating real university OBJ (Computer Based Test) questions.

Generate exactly ${numQuestions} high-quality, exam-standard multiple choice questions from the uploaded lecture note.

Requirements:
- Focus on key concepts, definitions, principles, applications, and important diagrams
- Make questions tricky but fair like real OAU exams
- Test proper understanding
- Exactly 4 options per question: A, B, C, D
- Only ONE correct answer
- Short and clear explanation for the correct answer

Output **exactly** in this format (nothing else):

Question 1: Question text here?
A) Option one
B) Option two
C) Option three
D) Option four
Correct Answer: B
Explanation: Brief explanation why this is correct.

Question 2: ...

Continue until you reach Question ${numQuestions}.`;

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
    const errorMsg = error.message || "Failed to generate questions.";

    return NextResponse.json({
      error: errorMsg.includes("403") 
        ? "API permission error. Try generating with fewer questions or a different PDF." 
        : errorMsg
    }, { status: 500 });
  }
}
