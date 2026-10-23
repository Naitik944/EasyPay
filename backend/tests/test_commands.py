"""Command parsing and its /ask boundary; run with unittest discovery."""

import subprocess
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend import main


class CommandTests(unittest.TestCase):
    def test_payment_commands(self):
        cases = [
            ("pay 25 to xcx", 25, "xcx"),
            ("send 50 to john", 50, "john"),
            ("payment of 100 to amazon", 100, "amazon"),
            ("transfer 20 to sally", 20, "sally"),
            ("Please PAY ₹25.50 to Alice Smith!", 25.5, "Alice Smith"),
            ("pay 25 then send 50 to John", 25, "John"),
            ("pay 12.345 to John", 12, "John"),
            ("pay 0 to John", 0, "John"),
            ("pay\n50 to Wrong\nsend 20 to Right", 20, "Right"),
            ("pay 25 to\nAlice", 25, "Alice"),
            ("pay 25 to " + "A" * 100, 25, "A" * 80),
        ]
        for prompt, amount, vendor in cases:
            with self.subTest(prompt=prompt):
                self.assertEqual(main._command_from_text(prompt), {
                    "name": "vendor_payment", "amount": amount, "vendor": vendor,
                })

    def test_incomplete_or_non_payment_commands(self):
        for prompt in (
            "pay 25", "pay to John", "25 to John", "repay 25 to John",
            "pay abc25 to John", "pay 25 today John", "pay 25 toJohn",
            "pay 25 to", "pay 25 to !!!", "pay\n25 to John",
            "pay 25\nto John", "pay 25 to,to,to", "show my balance",
        ):
            with self.subTest(prompt=prompt):
                self.assertIsNone(main._command_from_text(prompt))

    def test_recharge_precedence_and_amounts(self):
        for prompt in (
            "recharge ₹50", "add money Rs. 50", "top up INR 50", "topup 50",
            "pay 50 to John and recharge 10",
        ):
            with self.subTest(prompt=prompt):
                self.assertEqual(main._command_from_text(prompt), {
                    "name": "recharge", "amount": 50,
                })

    def test_adversarial_inputs_finish_within_deadline(self):
        # Isolate a regressed parser so it cannot hang the test runner. Repetition
        # exposes the original cost even with the API's 800-character limit.
        script = """
from backend.main import _command_from_text
prompts = [
    ('pay 1 ' * 133) + 'xx',
    'pay ' * 200,
    'pay 1 ' + ('to,' * 264) + 'xx',
    'pay ' + ('9' * 790) + 'x to',
]
for prompt in prompts:
    assert len(prompt) <= 800
    for _ in range(200):
        assert _command_from_text(prompt) is None
assert _command_from_text('pay 1 ' * 10000) is None
"""
        subprocess.run([sys.executable, "-c", script], check=True, timeout=10)


class AskTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        self.headers = {"Authorization": "Bearer local-test-token"}
        auth = patch.object(main, "_fetch_auth_user", return_value={"id": "local-user"})
        auth.start()
        self.addCleanup(auth.stop)
        account = patch.object(main, "get_account", return_value={"transactions": []})
        self.account = account.start()
        self.addCleanup(account.stop)
        ai = patch.object(main, "ask_easypay_ai", return_value="Local test answer")
        self.ai = ai.start()
        self.addCleanup(ai.stop)

    def test_payment_only_prepares_action(self):
        response = self.client.post("/ask", headers=self.headers, json={
            "prompt": "pay ₹25 to Alice",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["action"], {
            "name": "vendor_payment", "amount": 25, "vendor": "Alice",
        })
        self.assertIn("confirm", response.json()["answer"])
        self.account.assert_not_called()
        self.ai.assert_not_called()

    def test_missing_recipient_uses_text_fallback(self):
        prompt = ("pay 1 " * 133) + "xx"
        response = self.client.post("/ask", headers=self.headers, json={"prompt": prompt})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["type"], "text")
        self.assertEqual(response.json()["answer"], "Local test answer")
        self.account.assert_called_once()
        self.ai.assert_called_once_with(
            f"Reply only in English. User request: {prompt}", [],
        )

    def test_prompt_length_limit(self):
        response = self.client.post("/ask", headers=self.headers, json={"prompt": "x" * 801})
        self.assertEqual(response.status_code, 422)
        self.account.assert_not_called()
        self.ai.assert_not_called()

    def test_authentication_required_before_parsing(self):
        with patch.object(main, "_command_from_text") as parser:
            response = self.client.post("/ask", json={"prompt": "pay 25 to Alice"})
        self.assertEqual(response.status_code, 401)
        parser.assert_not_called()


if __name__ == "__main__":
    unittest.main()
