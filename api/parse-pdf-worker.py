"""
Vercel Python Serverless Function — 생기부 PDF 파싱 워커.
Node.js route에서 PDF 바이너리를 받아 파싱 결과 JSON을 반환합니다.
"""

import json
import sys
import os
import tempfile
from http.server import BaseHTTPRequestHandler

# scripts/ 디렉토리를 import path에 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))

from parse_pdf import parse_pdf  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self._send_json(400, {"error": "PDF 데이터가 필요합니다."})
                return

            pdf_bytes = self.rfile.read(content_length)

            # 임시 파일에 저장 후 파싱
            with tempfile.NamedTemporaryFile(
                suffix=".pdf", delete=False
            ) as tmp:
                tmp.write(pdf_bytes)
                tmp_path = tmp.name

            try:
                result = parse_pdf(tmp_path)
                self._send_json(200, result)
            finally:
                os.unlink(tmp_path)

        except ValueError as e:
            self._send_json(400, {"error": str(e)})
        except Exception as e:
            self._send_json(500, {"error": f"파싱 실패: {str(e)}"})

    def _send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
