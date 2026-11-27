import json
from collections import Counter
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "public" / "data"
CATALOG_PATH = DATA_DIR / "catalog.json"


def audit_all() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    total_errors = 0

    for exam in catalog:
        exam_id = exam["id"]
        file_path = DATA_DIR / f"{exam_id}.json"
        if not file_path.exists():
            print(f"[MISSING] {exam_id}.json not generated yet.")
            continue

        data = json.loads(file_path.read_text(encoding="utf-8"))
        questions = data.get("questions", [])
        valid_domains = {d["name"]: d["weight"] for d in exam["domains"]}
        seen_ids = set()
        seen_stems = set()
        answer_dist = Counter()
        domain_counts = Counter()
        errors = []

        if data.get("examId") != exam_id:
            errors.append(f"examId mismatch: {data.get('examId')} != {exam_id}")

        for idx, q in enumerate(questions):
            qid = q.get("id", f"index-{idx}")
            if qid in seen_ids:
                errors.append(f"Duplicate ID: {qid}")
            seen_ids.add(qid)

            stem = q.get("question", "").strip().lower()
            if not stem or stem in seen_stems:
                errors.append(f"{qid}: Empty or exact duplicate question text")
            seen_stems.add(stem)

            dom = q.get("domain")
            if dom not in valid_domains:
                errors.append(f"{qid}: Invalid domain '{dom}'")
            else:
                domain_counts[dom] += 1

            opts = q.get("options", [])
            opt_ids = [o.get("id") for o in opts]
            if opt_ids != ["A", "B", "C", "D"]:
                errors.append(f"{qid}: Options must be A, B, C, D (got {opt_ids})")

            correct = q.get("correctAnswers", [])
            if len(correct) != 1 or correct[0] not in opt_ids:
                errors.append(f"{qid}: Invalid correctAnswers {correct}")
            else:
                answer_dist[correct[0]] += 1

            notes = q.get("wrongOptionNotes", {})
            expected_wrong = [oid for oid in opt_ids if oid not in correct]
            if sorted(notes.keys()) != sorted(expected_wrong):
                errors.append(f"{qid}: wrongOptionNotes keys {list(notes.keys())} != {expected_wrong}")

        print(f"\n=== AUDIT: {exam['title']} ({exam['code']}) — {len(questions)} Qs ===")
        print(f"Answer Distribution: {dict(sorted(answer_dist.items()))}")
        for d_name, target_w in valid_domains.items():
            actual_c = domain_counts[d_name]
            actual_pct = round((actual_c / len(questions)) * 100, 1) if questions else 0
            print(f"  - {d_name}: {actual_c} Qs ({actual_pct}% vs target {target_w}%)")

        if errors:
            total_errors += len(errors)
            print(f"  [FAIL] {len(errors)} error(s) found:")
            for err in errors[:10]:
                print(f"    * {err}")
        else:
            print("  [PASS] 0 schema or weightage errors.")

    print(f"\nAudit Complete. Total Errors Across All Banks: {total_errors}")


if __name__ == "__main__":
    audit_all()