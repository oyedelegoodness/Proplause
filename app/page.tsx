'use client';

import { useState, useEffect } from 'react';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export default function ProplauseCBT() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showScore, setShowScore] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [numQuestions, setNumQuestions] = useState(15);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Timer
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          setShowScore(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, timerActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseQuestions = (rawText: string): Question[] => {
    const questionsList: Question[] = [];
    const blocks = rawText.split(/Question\s+\d+[:.]/i).filter(b => b.trim().length > 40);

    blocks.forEach((block) => {
      const lines = block.trim().split('\n');
      let questionText = '';
      const options: string[] = [];
      let correctAnswer = '';
      let explanation = '';

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!questionText && trimmed.length > 20 && !/^[A-D]\)/i.test(trimmed) && 
            !trimmed.toLowerCase().includes('correct') && !trimmed.toLowerCase().includes('explanation')) {
          questionText = trimmed.replace(/^\*\*|\*\*$/g, '').trim();
        }
        if (/^[A-D]\)\s*/i.test(trimmed)) options.push(trimmed);
        if (trimmed.toLowerCase().includes('correct answer')) {
          const match = trimmed.match(/[A-D]/i);
          if (match) correctAnswer = match[0].toUpperCase();
        }
        if (trimmed.toLowerCase().includes('explanation')) {
          explanation = trimmed.replace(/Explanation[:\s]*/i, '').trim();
        }
      });

      if (questionText && options.length >= 3) {
        questionsList.push({
          question: questionText,
          options: options.slice(0, 4),
          correctAnswer: correctAnswer || 'A',
          explanation: explanation || "Key concept from the notes."
        });
      }
    });

    return questionsList.length > 0 ? questionsList : [{
      question: "Failed to load questions. Please try again with a clearer PDF.",
      options: ["A) Try again", "B) Different PDF", "C) Fewer questions", "D) Contact support"],
      correctAnswer: "A",
      explanation: "Please try regenerating."
    }];
  };

  const handleUpload = async () => {
    if (!file) return alert("Select a PDF first!");

    setLoading(true);
    setQuestions([]);
    setSelectedAnswers({});
    setShowScore(false);
    setShowReview(false);
    setCurrentIndex(0);
    setTimerActive(false);

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('numQuestions', numQuestions.toString());

    try {
      const res = await fetch('/api/upload-pdf', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else if (data.questions) {
        const parsed = parseQuestions(data.questions);
        setQuestions(parsed);
        const totalTime = numQuestions * 60;
        setTimeLeft(totalTime);
        setTimerActive(true);
      }
    } catch (err) {
      alert("Network error. Check your internet connection.");
      console.error(err);
    }
    setLoading(false);
  };

  const selectAnswer = (answer: string) => {
    setSelectedAnswers(prev => ({ ...prev, [currentIndex]: answer }));
  };

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setTimerActive(false);
      setShowScore(true);
    }
  };

  const goToPrevious = () => currentIndex > 0 && setCurrentIndex(currentIndex - 1);

  const calculateScore = () => 
    questions.reduce((score, q, i) => score + (selectedAnswers[i] === q.correctAnswer ? 1 : 0), 0);

  const viewReview = () => {
    setShowScore(false);
    setShowReview(true);
  };

  const restartQuiz = () => {
    setQuestions([]);
    setSelectedAnswers({});
    setShowScore(false);
    setShowReview(false);
    setCurrentIndex(0);
    setTimerActive(false);
  };

  // Review Screen
  if (showReview) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-green-500 mb-8 text-center">Quiz Review</h1>
          <a href="https://x.com/Goodnessofoau" target="_blank" className="text-blue-400 hover:underline block text-center mb-8">
            Follow Developer Goodness @Goodnessofoau
          </a>
          {questions.map((q, i) => (
            <div key={i} className="bg-gray-900 rounded-2xl p-8 mb-8">
              <h3 className="text-xl mb-6">Q{i+1}: {q.question}</h3>
              <div className="space-y-3 mb-6">
                {q.options.map((opt, j) => {
                  const letter = String.fromCharCode(65 + j);
                  const userAns = selectedAnswers[i];
                  const isCorrect = q.correctAnswer === letter;
                  const isUser = userAns === letter;
                  return (
                    <div key={j} className={`p-5 rounded-xl border-2 ${isCorrect ? 'border-green-500 bg-green-900/30' : isUser ? 'border-red-500 bg-red-900/30' : 'border-gray-700'}`}>
                      {opt}
                      {isCorrect && <span className="ml-3 text-green-400">✓ Correct</span>}
                      {isUser && !isCorrect && <span className="ml-3 text-red-400">✗ Your answer</span>}
                    </div>
                  );
                })}
              </div>
              <div className="bg-gray-800 p-6 rounded-xl">
                <p className="text-green-400 font-semibold">Explanation:</p>
                <p>{q.explanation}</p>
              </div>
            </div>
          ))}
          <button onClick={restartQuiz} className="w-full bg-green-600 py-5 rounded-2xl font-bold text-xl">
            Generate New Questions
          </button>
        </div>
      </div>
    );
  }

  if (showScore) {
    const score = calculateScore();
    const percent = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-5xl font-bold text-green-500 mb-6">Quiz Completed!</h1>
          <div className="bg-gray-900 rounded-3xl p-12 mb-10">
            <p className="text-7xl font-bold text-green-400">{score}/{questions.length}</p>
            <p className="text-3xl text-gray-400 mt-2">{percent}%</p>
          </div>
          <div className="flex gap-4">
            <button onClick={viewReview} className="flex-1 bg-blue-600 py-5 rounded-2xl font-bold">Review + Explanations</button>
            <button onClick={restartQuiz} className="flex-1 bg-green-600 py-5 rounded-2xl font-bold">New Quiz</button>
          </div>
          <a href="https://x.com/Goodnessofoau" target="_blank" className="mt-8 block text-blue-400 hover:underline">
            Follow @Goodnessofoau on X
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-5xl font-bold text-green-500">Proplause CBT</h1>
          <div>
            <p>Developer Goodness</p>
            <a href="https://x.com/Goodnessofoau" target="_blank" className="text-blue-400 hover:underline">@Goodnessofoau</a>
          </div>
        </div>

        {timerActive && <p className="text-center text-2xl text-red-400 mb-6">Time Left: {formatTime(timeLeft)}</p>}

        {!questions.length ? (
          <div className="bg-gray-900 rounded-3xl p-10">
            <div className="mb-8">
              <label className="block text-sm mb-3">Number of Questions</label>
              <select value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className="bg-gray-800 border border-gray-700 rounded-2xl px-6 py-4 w-full text-lg">
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={20}>20 Questions</option>
                <option value={30}>30 Questions</option>
                <option value={50}>50 Questions</option>
              </select>
            </div>

            <div className="mb-10">
              <label className="block text-sm mb-3">Upload Lecture Note (PDF)</label>
              <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-400 file:mr-4 file:py-4 file:px-8 file:rounded-2xl file:border-0 file:bg-green-600 file:text-white" />
              {file && <p className="mt-4 text-green-400">✓ {file.name}</p>}
            </div>

            <button onClick={handleUpload} disabled={loading || !file} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 py-5 rounded-2xl font-bold text-xl">
              {loading ? "Generating..." : "Start CBT"}
            </button>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-3xl p-10">
            <div className="flex justify-between mb-8">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              {timerActive && <span className="text-red-400">⏱ {formatTime(timeLeft)}</span>}
            </div>

            <h2 className="text-2xl mb-10">{questions[currentIndex].question}</h2>

            <div className="space-y-4 mb-10">
              {questions[currentIndex].options.map((option, i) => {
                const letter = String.fromCharCode(65 + i);
                const isSelected = selectedAnswers[currentIndex] === letter;
                return (
                  <button key={i} onClick={() => selectAnswer(letter)} className={`w-full text-left p-6 rounded-2xl border-2 text-lg ${isSelected ? 'border-green-500 bg-green-900/30' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800'}`}>
                    {option}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4">
              <button onClick={goToPrevious} disabled={currentIndex === 0} className="flex-1 py-4 bg-gray-800 rounded-2xl font-semibold disabled:opacity-50">Previous</button>
              <button onClick={goToNext} className="flex-1 py-4 bg-green-600 rounded-2xl font-semibold">{currentIndex === questions.length - 1 ? "Finish Quiz" : "Next"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}