"""
Chatbot d'assistance TontineDigital.
Si OPENAI_API_KEY est défini, utilise OpenAI ; sinon, utilise un moteur
de règles basé sur des intents pour répondre aux questions courantes.
"""
from __future__ import annotations
from typing import Dict, Any, List
import os
import re

OPENAI_KEY = os.getenv("OPENAI_API_KEY", "").strip()

INTENTS = [
    {
        "patterns": [r"\b(score|fiabilité|trust)\b"],
        "answer_fn": lambda ctx: (
            f"Votre score de fiabilité est actuellement de {ctx.get('user', {}).get('score', 'N/A')}/100. "
            "Il est calculé sur la base de votre historique : ponctualité des cotisations, tontines complétées, "
            "et signalements éventuels. Vous pouvez consulter le détail dans votre tableau de bord."
        ),
    },
    {
        "patterns": [r"prochaine cotisation", r"\bdois\b.*payer", r"\bdue\b"],
        "answer_fn": lambda ctx: _format_upcoming(ctx),
    },
    {
        "patterns": [r"comment.*créer.*tontine", r"créer.*tontine", r"new.*tontine"],
        "answer_fn": lambda ctx: (
            "Pour créer une tontine, allez dans « Mes tontines » → « Créer une tontine ». "
            "Choisissez un nom, le montant de cotisation, la fréquence (hebdo ou mensuelle), "
            "le nombre de membres et l'ordre de passage. Vous pourrez ensuite inviter les membres "
            "par email. La tontine ne démarre que lorsque tous les invités ont accepté."
        ),
    },
    {
        "patterns": [r"comment.*fonctionne", r"qu['e]st.*ce.*tontine", r"what is"],
        "answer_fn": lambda ctx: (
            "Une tontine est un système d'épargne collective rotative. Plusieurs personnes cotisent "
            "régulièrement le même montant, et à chaque tour, un membre différent reçoit la totalité "
            "de la cagnotte. C'est un excellent outil d'épargne sans intérêts, basé sur la confiance "
            "communautaire. TontineDigital sécurise et automatise tout ce processus."
        ),
    },
    {
        "patterns": [r"sécurité|sécurisé|secure"],
        "answer_fn": lambda ctx: (
            "Vos données et paiements sont protégés par : chiffrement TLS, double authentification "
            "optionnelle, audit log immuable, intégration Stripe pour les paiements (PCI-DSS), "
            "et conformité RGPD. Aucune donnée bancaire n'est stockée en clair sur nos serveurs."
        ),
    },
    {
        "patterns": [r"\bpaiement.*échou|payment.*fail|prélèvement"],
        "answer_fn": lambda ctx: (
            "Si un paiement échoue, le système relance automatiquement deux fois sur 48h. "
            "Si le problème persiste, vérifiez votre moyen de paiement dans « Profil » → « Paiements ». "
            "En cas de difficulté, vous pouvez ouvrir un ticket de support."
        ),
    },
    {
        "patterns": [r"\blitige|dispute|problème.*membre"],
        "answer_fn": lambda ctx: (
            "Vous pouvez ouvrir un litige depuis la page d'une tontine, onglet « Litiges ». "
            "Décrivez le problème (paiement manquant, comportement abusif, etc.). Le créateur de "
            "la tontine sera notifié. Si le litige n'est pas résolu, il peut être escaladé à "
            "l'équipe TontineDigital."
        ),
    },
]


def _format_upcoming(ctx: Dict[str, Any]) -> str:
    upcoming = ctx.get("upcoming_contributions", [])
    if not upcoming:
        return "Vous n'avez aucune cotisation en attente. 🎉"
    lines = ["Voici vos prochaines cotisations :"]
    for u in upcoming[:5]:
        amt = u.get("amount", 0) / 100
        lines.append(
            f"• {u.get('tontine')} : {amt:.2f} {u.get('currency', 'EUR')} "
            f"due le {u.get('due_date')}"
        )
    return "\n".join(lines)


def _rule_based(question: str, context: Dict[str, Any]) -> Dict[str, Any]:
    q = question.lower()
    for intent in INTENTS:
        for pat in intent["patterns"]:
            if re.search(pat, q, re.IGNORECASE):
                return {"answer": intent["answer_fn"](context), "engine": "rule_based"}
    return {
        "answer": (
            "Je n'ai pas compris la question. Vous pouvez me demander : "
            "« quel est mon score ? », « ma prochaine cotisation », « comment créer une tontine », "
            "« comment ouvrir un litige », ou consulter la documentation."
        ),
        "engine": "rule_based",
    }


def answer(question: str, context: Dict[str, Any]) -> Dict[str, Any]:
    # En production : appeler OpenAI / Gemini avec un system prompt et le contexte.
    # En MVP local : moteur de règles couvrant les cas fréquents.
    if OPENAI_KEY and OPENAI_KEY != "dummy":
        try:
            import httpx
            sys_prompt = (
                "Tu es l'assistant officiel de TontineDigital, une plateforme d'épargne "
                "collective rotative. Tu es bref, clair, bienveillant. Tu réponds en "
                "français sauf si l'utilisateur écrit en anglais."
            )
            resp = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_KEY}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": sys_prompt},
                        {"role": "system", "content": f"Contexte utilisateur : {context}"},
                        {"role": "user", "content": question},
                    ],
                    "temperature": 0.3,
                },
                timeout=15,
            )
            data = resp.json()
            text = data["choices"][0]["message"]["content"]
            return {"answer": text, "engine": "openai"}
        except Exception as e:
            return {**_rule_based(question, context), "fallback": str(e)}
    return _rule_based(question, context)
