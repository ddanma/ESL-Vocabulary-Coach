import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search, BookOpen, Loader2, AlertCircle, Info } from 'lucide-react';
import { cn } from './lib/utils';

const SYSTEM_INSTRUCTION = `ROLE: You are a vocabulary coach for intermediate ESL learners.
You explain grammatical word forms accurately and simply.
You never invent word forms that do not exist in standard English.

CONTEXT: The user is an ESL student who wants to understand how
a single English word functions across different grammatical roles.

TASK:
When the user provides input, follow these steps in order:

Step 1: Validate input
Before classifying the input, reason through these checks in order:
  1. Is it a single token with no spaces?
  2. Is it recognizable as a standard English word?
  3. Could it be a proper noun, acronym, or non-word?
Only after completing these checks, respond accordingly.
  IF the input is not a single English word:
    respond with exactly: "Please enter a single English word."
    STOP.

Step 2: Decompose and identify word forms
BEFORE filling the table, first decompose the word:
  LIST all grammatical roles this word can play in standard English.
  Example: "light" → can function as noun (the light),
                      verb (to light a candle),
                      adjective (a light color)
  Only after completing this survey, fill the table.
  If the word has multiple possible forms for a single
  grammatical category, note the most common one in the
  table and acknowledge the others in the Word Family Note.

FOR each grammatical form (Noun, Verb, Adjective):
  IF a standard form exists:
    record the word and write one simple example sentence
  ELSE:
    write "N/A" and "No common [form] exists"

IF a word has multiple possible forms or the correct form is
debated or context-dependent, note this briefly in the
Word Family Note rather than selecting one interpretation
without acknowledgement.

Step 3: Self-check before outputting
Silently verify:
  - Did I invent any word form that is not standard English?
  - Did I mark something N/A that actually has a common form?
  - Did I default to a base form when the input was inflected?
  - Does my Word Family Note acknowledge ambiguity where it exists?
  - Does my Word Family Note stay within 2-3 sentences with no 
    writing tips, conjugation lists, or unrequested content?
If any check fails, revise before outputting.

Step 4: Generate output in this exact order:
  1. Markdown table: Form | Word | Example Sentence
  2. Word Family Note: 2-3 sentences only. Do not include a 
     writing tip, tip-style sentence, conjugation list, or any 
     content beyond explaining how the three forms relate to 
     each other.

FORMAT: Do not add anything beyond the table and Word Family Note.
CRITICAL: Do not use any asterisks (*), bolding, italics, or other markdown decorations within the table or note. Use plain text only for the content of the cells and the note. Keep the table structure using only pipes (|) and hyphens (-).`;

export default function App() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ table: string; note: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: trimmedInput,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      const text = response.text;
      if (text === "Please enter a single English word.") {
        setError(text);
      } else {
        // Split by "Word Family Note:" to separate table and note
        const parts = text.split(/Word Family Note:/i);
        if (parts.length >= 2) {
          setResult({
            table: parts[0].trim(),
            note: parts[1].trim()
          });
        } else {
          // Fallback if the header is missing but format is otherwise okay
          const doubleNewlineIndex = text.lastIndexOf('\n\n');
          if (doubleNewlineIndex !== -1) {
            setResult({
              table: text.substring(0, doubleNewlineIndex).trim(),
              note: text.substring(doubleNewlineIndex).trim()
            });
          } else {
            setResult({ table: text, note: '' });
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-blue-100">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-24">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm mb-6 border border-gray-100">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            Vocabulary Coach
          </h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Explore grammatical forms and word families for any English word.
          </p>
        </header>

          {/* Search Section */}
          <div className="max-w-xl mx-auto mb-12">
            <form onSubmit={handleSearch} className="relative group">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter a word (e.g., imagine)"
                className="w-full bg-white border border-gray-200 rounded-2xl px-6 py-4 pl-14 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                disabled={loading}
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Coach'}
              </button>
            </form>
            <div className="mt-4 flex gap-2 justify-center">
              {['imagine', 'success', 'light', 'math'].map((word) => (
                <button
                  key={word}
                  onClick={() => {
                    setInput(word);
                    handleSearch();
                  }}
                  disabled={loading}
                  className="text-xs font-medium text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-all border border-transparent hover:border-blue-100"
                >
                  {word}
                </button>
              ))}
            </div>
          </div>

        {/* Results Section */}
        <div className="max-w-2xl mx-auto space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Table Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-1 overflow-x-auto">
                  <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden">
                      <div className="prose prose-blue max-w-none p-6 prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-th:text-gray-400 prose-th:font-semibold prose-td:text-gray-600 prose-table:m-0 prose-table:border-collapse prose-th:border-b prose-th:border-gray-100 prose-td:border-b prose-td:border-gray-50 last:prose-td:border-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {result.table}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Note Card */}
              {result.note && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-8 flex items-start gap-5">
                  <div className="bg-blue-100 p-2 rounded-xl shrink-0">
                    <Info className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider mb-2">Word Family Note</h3>
                    <p className="text-blue-800 leading-relaxed text-lg">
                      {result.note}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!result && !loading && !error && (
            <div className="text-center py-12 opacity-40">
              <p className="text-sm font-medium uppercase tracking-widest">Ready to coach</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 text-center text-gray-400 text-xs pointer-events-none">
        <p>© 2026 ESL Vocabulary Coach • Powered by Gemini</p>
      </footer>
    </div>
  );
}
