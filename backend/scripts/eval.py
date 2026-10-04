import json
from pathlib import Path
from dotenv import load_dotenv

from app import retrieval
from app.retrieval import TOP_K

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

QUESTIONS_PATH = Path(__file__).resolve().parents[2] / "eval" / "questions.json"

MAX_K = 10

KS = [1, 3, 5, 10]


def find_rank(question) -> int | None:
    """Rang des ersten Treffers auf der erwarteten Seite (1-basiert), None wenn nicht in den Top-MAX_K."""
    plain_question = question["question"]
    hits = retrieval.retrieve(plain_question, k=MAX_K)
    counter = 1

    for hit in hits:

        if hit["meta"]["doc_id"] == question["doc"] and hit["meta"]["page"] in question["pages"]:
            return counter

        counter += 1
    return None


def evaluate_questions():
    """Berechnet Rangverteilung, Hit@k und MRR über alle Testfragen."""
    questions = json.load(open(QUESTIONS_PATH))
    rank_dic = {}
    ranks = []
    hit_at_k ={}
    kehrwerte = 0

    for question in questions:
        rank = (find_rank(question))
        ranks.append(rank)

    for i in range(MAX_K):
        exactly_k = 0   # Rang genau k  -> Verteilung
        within_k = 0    # Rang <= k     -> Hit@k
        for r in ranks:
            if r is not None and r == (i+1):
                exactly_k += 1
            if r is not None and r <= (i+1):
                within_k += 1

        rank_dic[i+1] = exactly_k
        hit_at_k[i+1] = within_k/len(ranks)

    for r in ranks:
        if r is not None:
            kehrwerte += (1/r)


    print("Verteilung der Ränge:", rank_dic)
    print()
    for i in range(MAX_K):
        print(f"Hit@{i+1}: {hit_at_k[i+1]:.2f}")
    print(f"MRR:    {kehrwerte/len(ranks):.2f}")

evaluate_questions()
