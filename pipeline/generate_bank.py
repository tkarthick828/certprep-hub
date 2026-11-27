import argparse
import json
import os
import random
import time
from difflib import SequenceMatcher
from pathlib import Path
from typing import Literal

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "public" / "data"
CATALOG_PATH = DATA_DIR / "catalog.json"

FALLBACK_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-4-hydrogen",
]


class RawOption(BaseModel):
    text: str = Field(description="Realistic technical option text without A/B/C/D prefix")
    is_correct: bool = Field(description="True for ONLY ONE option; the other three options MUST be false")
    rationale: str = Field(description="Concise technical reason why this option is correct or why it fails")


class RawQuestion(BaseModel):
    question: str = Field(description="Realistic production scenario exam question stem")
    options: list[RawOption] = Field(min_length=4, max_length=4)
    core_explanation: str = Field(description="Clear architectural/technical explanation of the correct solution")


class GeneratedBatch(BaseModel):
    questions: list[RawQuestion]


def is_duplicate(stem: str, existing_stems: list[str], threshold: float = 0.80) -> bool:
    norm = stem.strip().lower()
    for prev in existing_stems:
        if SequenceMatcher(None, norm, prev).ratio() >= threshold:
            return True
    return False


def format_question(raw_q: RawQuestion, q_id: str, domain_name: str) -> dict | None:
    if len(raw_q.options) != 4:
        return None
    if sum(1 for opt in raw_q.options if opt.is_correct) != 1:
        return None

    opts = list(raw_q.options)
    random.shuffle(opts)

    letters: list[Literal["A", "B", "C", "D"]] = ["A", "B", "C", "D"]
    formatted_options = []
    correct_answers = []
    wrong_notes = {}

    for letter, opt in zip(letters, opts):
        formatted_options.append({"id": letter, "text": opt.text.strip()})
        if opt.is_correct:
            correct_answers.append(letter)
        else:
            wrong_notes[letter] = opt.rationale.strip()

    return {
        "id": q_id,
        "domain": domain_name,
        "question": raw_q.question.strip(),
        "options": formatted_options,
        "correctAnswers": correct_answers,
        "explanation": raw_q.core_explanation.strip(),
        "wrongOptionNotes": wrong_notes,
    }


def generate_batch_with_fallback(client: genai.Client, primary_model: str, prompt: str) -> GeneratedBatch:
    model_chain = [primary_model] + [m for m in FALLBACK_MODELS if m != primary_model]

    for round_num in range(3):
        for active_model in model_chain:
            try:
                response = client.models.generate_content(
                    model=active_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction="Output strictly valid single-choice exam questions.",
                        response_mime_type="application/json",
                        response_schema=GeneratedBatch,
                        temperature=0.7,
                    ),
                )
                return GeneratedBatch.model_validate_json(response.text)
            except Exception as err:
                err_msg = str(err)
                is_transient = any(code in err_msg for code in ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "500"))
                if is_transient:
                    wait_sec = 4 + random.uniform(1, 3)
                    print(f"    [BUSY: {active_model}] Switching/retrying in {wait_sec:.1f}s...")
                    time.sleep(wait_sec)
                    continue
                raise

        backoff = 15 * (round_num + 1)
        print(f"    [ALL MODELS BUSY] Waiting {backoff}s before next round...")
        time.sleep(backoff)

    raise RuntimeError("All Gemini models remained temporarily unavailable after retries.")


def generate_for_exam(exam_id: str, total_target: int, model: str) -> None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set.")

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    exam = next((item for item in catalog if item["id"] == exam_id), None)
    if not exam:
        valid_ids = [c["id"] for c in catalog]
        raise ValueError(f"Unknown examId '{exam_id}'. Valid IDs: {valid_ids}")

    out_path = DATA_DIR / f"{exam_id}.json"
    if out_path.exists():
        existing_data = json.loads(out_path.read_text(encoding="utf-8"))
        questions = existing_data.get("questions", [])
    else:
        questions = []

    existing_stems = [q["question"].strip().lower() for q in questions]
    client = genai.Client(api_key=api_key)
    prefix = exam["code"].lower().replace(" ", "").replace("/", "-")

    print(f"\n=== Generating for {exam['title']} ({exam['code']}) ===")
    print(f"Existing questions: {len(questions)} | Target total: {total_target}")

    for dom in exam["domains"]:
        dom_name = dom["name"]
        dom_target = max(1, round((dom["weight"] / 100.0) * total_target))
        current_dom_qs = [q for q in questions if q["domain"] == dom_name]
        needed = dom_target - len(current_dom_qs)

        if needed <= 0:
            print(f"  [SKIP] {dom_name}: already has {len(current_dom_qs)}/{dom_target} Qs")
            continue

        print(f"  [WORK] {dom_name} ({dom['weight']}%): generating {needed} Qs...")

        while needed > 0:
            batch_size = min(15, needed)
            recent_topics = "\n".join(f"- {q['question'][:110]}..." for q in current_dom_qs[-15:])

            prompt = (
                f"You are a senior certification exam author creating original practice questions for "
                f"'{exam['title']}' ({exam['code']}) by {exam['provider']}.\n"
                f"Target Domain: '{dom_name}' (Weight: {dom['weight']}%).\n\n"
                f"Generate {batch_size} realistic, scenario-based single-choice questions.\n"
                f"Strict Rules:\n"
                f"1. Every question must test applied decision-making, architecture tradeoffs, or troubleshooting—never trivia.\n"
                f"2. Single-select ONLY: provide 4 plausible technical options with NO 'A.' or '1.' prefixes, and mark EXACTLY ONE option is_correct=true (never 0, never 2 or more).\n"
                f"3. Do NOT repeat or paraphrase any of these already-generated scenarios:\n{recent_topics or 'None yet'}\n"
            )

            parsed = generate_batch_with_fallback(client, model, prompt)
            added_in_batch = 0

            for raw_q in parsed.questions:
                if needed <= 0:
                    break
                if is_duplicate(raw_q.question, existing_stems):
                    continue

                next_num = len(questions) + 1
                q_id = f"{prefix}-{next_num:04d}"
                formatted = format_question(raw_q, q_id, dom_name)
                if not formatted:
                    continue

                questions.append(formatted)
                current_dom_qs.append(formatted)
                existing_stems.append(raw_q.question.strip().lower())
                needed -= 1
                added_in_batch += 1

            out_path.write_text(
                json.dumps({"examId": exam_id, "questions": questions}, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            print(f"    Saved +{added_in_batch} Qs (Domain progress: {len(current_dom_qs)}/{dom_target})")
            time.sleep(1.5)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate domain-weighted certification question banks.")
    parser.add_argument("--exam", required=True, help="Exam ID from catalog.json (or 'all')")
    parser.add_argument("--count", type=int, default=130, help="Target questions per exam (default: 130)")
    parser.add_argument("--model", default="gemini-3.5-flash-lite", help="Primary Gemini model (default: gemini-3.5-flash-lite)")
    args = parser.parse_args()

    catalog_items = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    targets = [c["id"] for c in catalog_items] if args.exam == "all" else [args.exam]

    for target_id in targets:
        generate_for_exam(target_id, args.count, args.model)