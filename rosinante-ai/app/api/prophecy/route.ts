import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "Sen Antakya'nın eğlence mekanı Rosinante'nin bilge ve fırlama atısın. Don Kişot'un asil atısın ama yıllardır Antakya'da yaşadığın için yerel kültürü ve şiveyi iyi tanıyorsun. Kısa, vurucu, bazen şövalye bazen Antakyalı dost gibi cevap ver. Yel değirmeni, macera, asillik metaforları kullan. Max 3 cümle.";

type RequestBody = {
  name?: string;
  mood?: string;
  question?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const name = body.name?.trim();
    const mood = body.mood?.trim();
    const question = body.question?.trim() ?? null;

    if (!name || !mood) {
      return NextResponse.json(
        { error: "Isim ve mod zorunludur." },
        { status: 400 },
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY tanimli degil." },
        { status: 500 },
      );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          error:
            "Supabase environment degiskenleri eksik (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).",
        },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const prompt =
      `Kullanici adi: ${name}\n` +
      `Modu: ${mood}\n` +
      `Serbest soru: ${question ?? "Yok"}\n\n` +
      "Bu kisiye Rosinante uslubunda kisa bir kehanet ver.";

    const geminiResult = await model.generateContent(prompt);
    const prophecy = geminiResult.response.text().trim();

    if (!prophecy) {
      return NextResponse.json(
        { error: "Gemini bos cevap dondurdu." },
        { status: 502 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from("prophecies")
      .insert({
        name,
        mood,
        question,
        prophecy,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Supabase kayit hatasi: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ prophecy, row: data });
  } catch {
    return NextResponse.json(
      { error: "Istek islenirken beklenmeyen bir hata olustu." },
      { status: 500 },
    );
  }
}
